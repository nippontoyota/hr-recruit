import random
from datetime import UTC, datetime, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_roles
from app.core.security import generate_secure_token
from app.models.activity_log import ActivityLog
from app.models.candidate import Candidate
from app.models.document import Document
from app.models.enums import (
    ActivityType,
    DocumentType,
    EvaluationType,
    EvaluationVerdict,
    InterviewStatus,
    PipelineStage,
    UserRole,
)
from app.models.evaluation import Evaluation
from app.models.evaluation_token import EvaluationToken
from app.models.technical_question import TechnicalQuestion
from app.models.user import User
from app.models.communication import Communication
from app.models.enums import (
    CommunicationStatus,
    CommunicationType,
    CommunicationDirection,
)
from app.schemas.evaluation import (
    EvaluationOut,
    EvaluationSchedule,
    EvaluationSubmitScorecard,
    EvaluationPublicOut,
    EvaluationPublicSubmit,
    CandidateTestSubmit,
    EvaluationTokenOut,
    EvaluationWhatsAppInvite,
    TechnicalQuestionOut,
)
from app.services.workflow import WorkflowService
from app.services import storage
from app.services.doubletick import DoubleTickClient


router = APIRouter(prefix="/evaluations", tags=["Evaluations"])




def _get_candidate_department(position: str | None) -> str:
    if not position:
        return "IT"
    pos = position.upper()
    if any(k in pos for k in ["DEVELOPER", "TECH", "SOFTWARE", "IT", "SYSTEM"]):
        return "IT"
    if any(k in pos for k in ["SALES", "MARKETING", "ADVISOR", "CONSULTANT"]):
        return "SALES"
    if any(k in pos for k in ["SERVICE", "MECHANIC", "DIAGNOSTIC", "WORKSHOP", "TECHNICIAN"]):
        return "SERVICE"
    if any(k in pos for k in ["FINANCE", "ACCOUNT", "BILLING", "CASHIER"]):
        return "FINANCE"
    return "IT"  # default


@router.get("/questions", response_model=list[TechnicalQuestionOut])
def get_department_questions(
    department: str,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(
        UserRole.SUPER_ADMIN, UserRole.COMPANY_HR_HEAD, UserRole.BRANCH_HR,
        UserRole.HQ_HR, UserRole.LOCAL_HR, UserRole.ADMIN, UserRole.DEPT_HEAD
    )),
):
    norm_dept = _get_candidate_department(department)
    questions = db.scalars(select(TechnicalQuestion).where(TechnicalQuestion.department == norm_dept)).all()
    return questions


@router.get("/candidate/{candidate_id}", response_model=list[EvaluationOut])
def get_candidate_evaluations(
    candidate_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_HR_HEAD, UserRole.BRANCH_HR, UserRole.HQ_HR, UserRole.LOCAL_HR, UserRole.ADMIN)),
):
    candidate = db.get(Candidate, candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
        
    # Auto-initialize evaluations based on current stage for backward compatibility
    stage_to_types = {
        PipelineStage.HR_INTERVIEW: [EvaluationType.BRANCH_HR],
        PipelineStage.DEPARTMENT_INTERVIEW: [EvaluationType.DEPT_HEAD],
        PipelineStage.BRANCH_EVALUATION: [EvaluationType.GM_LEVEL, EvaluationType.TECHNICAL_TEST],
        PipelineStage.FINAL_APPROVAL: [EvaluationType.HQ_INTERVIEW],
    }
    
    req_types = stage_to_types.get(candidate.current_stage, [])
    if req_types:
        existing_types = {e.type for e in db.scalars(
            select(Evaluation).where(Evaluation.candidate_id == candidate_id)
        ).all()}
        for t in req_types:
            if t not in existing_types:
                db.add(Evaluation(
                    candidate_id=candidate_id,
                    type=t,
                    status=InterviewStatus.PENDING_SCHEDULE
                ))
        db.commit()

    evals = db.scalars(
        select(Evaluation)
        .where(Evaluation.candidate_id == candidate_id)
        .order_by(Evaluation.created_at.asc())
    ).all()
    return evals



@router.post("/{eval_id}/schedule", response_model=EvaluationOut)
def schedule_evaluation(
    eval_id: UUID,
    body: EvaluationSchedule,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_HR_HEAD, UserRole.BRANCH_HR, UserRole.HQ_HR, UserRole.LOCAL_HR, UserRole.ADMIN)),
):
    evaluation = db.get(Evaluation, eval_id)
    if not evaluation:
        raise HTTPException(status_code=404, detail="Evaluation not found")
        
    evaluation.interview_mode = body.interview_mode
    evaluation.scheduled_time = body.scheduled_time
    evaluation.location_or_link = body.location_or_link
    
    if body.interviewer_id:
        from sqlalchemy.orm.attributes import flag_modified
        candidate = db.get(Candidate, evaluation.candidate_id)
        if not candidate:
            raise HTTPException(status_code=404, detail="Candidate not found")
        assignments = candidate.interviewer_assignments or {}
        assignments[evaluation.type.value] = str(body.interviewer_id)
        candidate.interviewer_assignments = assignments
        flag_modified(candidate, "interviewer_assignments")
    
    if body.interview_mode or body.scheduled_time or body.location_or_link:
        evaluation.status = InterviewStatus.SCHEDULED
    elif evaluation.status == InterviewStatus.SCHEDULED:
        evaluation.status = InterviewStatus.PENDING_SCHEDULE
        
    db.commit()
    db.refresh(evaluation)
    return evaluation


@router.post("/{eval_id}/token", response_model=EvaluationTokenOut)
def generate_evaluation_token(
    eval_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_HR_HEAD, UserRole.BRANCH_HR, UserRole.HQ_HR, UserRole.LOCAL_HR, UserRole.ADMIN)),
):
    evaluation = db.get(Evaluation, eval_id)
    if not evaluation:
        raise HTTPException(status_code=404, detail="Evaluation not found")
        
    # Mark old tokens for this evaluation as used/expired
    old_tokens = db.scalars(
        select(EvaluationToken).where(EvaluationToken.evaluation_id == eval_id)
    ).all()
    for t in old_tokens:
        t.is_used = True

    token_str = generate_secure_token()
    
    test_data = None
    if evaluation.type == EvaluationType.TECHNICAL_TEST:
        candidate = db.get(Candidate, evaluation.candidate_id)
        dept = _get_candidate_department(candidate.position_applied_for)
        q_rows = db.scalars(
            select(TechnicalQuestion).where(TechnicalQuestion.department == dept)
        ).all()
        if not q_rows:
            q_rows = db.scalars(
                select(TechnicalQuestion).where(TechnicalQuestion.department == "IT")
            ).all()
        q_list = list(q_rows)
        random.shuffle(q_list)
        test_data = {
            "questions": [
                {"id": q.id, "text": q.text, "options": q.options}
                for q in q_list
            ],
            "answers": {
                q.id: q.answer
                for q in q_list
            }
        }

    new_token = EvaluationToken(
        evaluation_id=eval_id,
        token=token_str,
        is_used=False,
        expires_at=datetime.now(UTC) + timedelta(days=7),
        test_data=test_data
    )
    db.add(new_token)
    db.commit()
    db.refresh(new_token)
    return new_token


@router.post("/{eval_id}/submit-scorecard", response_model=EvaluationOut)
def submit_scorecard(
    eval_id: UUID,
    body: EvaluationSubmitScorecard,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_HR_HEAD, UserRole.BRANCH_HR, UserRole.HQ_HR, UserRole.LOCAL_HR, UserRole.ADMIN)),
):
    evaluation = db.get(Evaluation, eval_id)
    if not evaluation:
        raise HTTPException(status_code=404, detail="Evaluation not found")
        
    if body.verdict:
        evaluation.verdict = body.verdict
    if body.remarks:
        evaluation.remarks = body.remarks
    if body.scores:
        evaluation.scores = body.scores
        
    evaluation.status = InterviewStatus.EVALUATED
    
    candidate = db.get(Candidate, evaluation.candidate_id)
    
    # Write Activity Log
    log = ActivityLog(
        candidate_id=candidate.id,
        activity_type=ActivityType.CALL,
        title=f"{evaluation.type.value.replace('_', ' ').title()} Scorecard Submitted",
        description=f"Verdict: {body.verdict.value if body.verdict else 'None'}. Remarks: {body.remarks or 'None'}",
        created_by_user_id=current_user.id
    )
    db.add(log)
    
    # Auto transition workflow on Reject
    if body.verdict == EvaluationVerdict.REJECTED:
        WorkflowService.transition(
            db=db,
            candidate=candidate,
            target_stage=PipelineStage.REJECTED,
            user=current_user,
            remarks=f"Rejected during {evaluation.type.value.replace('_', ' ').title()} evaluation."
        )
        
    # Auto transition to Hired/Rejected/On-Hold for HQ Interview
    if evaluation.type == EvaluationType.HQ_INTERVIEW and body.verdict:
        if body.verdict == EvaluationVerdict.SELECTED:
            WorkflowService.transition(
                db=db,
                candidate=candidate,
                target_stage=PipelineStage.HIRED,
                user=current_user,
                remarks="HQ interview approved. Candidate hired."
            )
        elif body.verdict == EvaluationVerdict.ON_HOLD:
            WorkflowService.transition(
                db=db,
                candidate=candidate,
                target_stage=PipelineStage.ON_HOLD,
                user=current_user,
                remarks="Placed on hold after HQ interview."
            )
            
    db.commit()
    db.refresh(evaluation)
    return evaluation


@router.get("/public/{token}", response_model=EvaluationPublicOut)
def get_public_evaluation_details(
    token: str,
    db: Session = Depends(get_db),
):
    token_row = db.scalar(
        select(EvaluationToken).where(
            EvaluationToken.token == token,
            EvaluationToken.expires_at > datetime.now(UTC)
        )
    )
    if not token_row:
        raise HTTPException(status_code=404, detail="Token not found, expired, or already used")
        
    evaluation = db.get(Evaluation, token_row.evaluation_id)
    if not evaluation:
        raise HTTPException(status_code=404, detail="Evaluation scorecard not found")
        
    candidate = db.get(Candidate, evaluation.candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    # Get resume signed URL safely
    resume_url = None
    try:
        resume_doc = db.scalar(
            select(Document).where(
                Document.candidate_id == candidate.id,
                Document.doc_type == DocumentType.RESUME
            )
        )
        if resume_doc:
            resume_url = storage.create_signed_url(resume_doc.storage_path)
    except Exception:
        pass
    
    # Retrieve previous remarks safely
    prior_evals = db.scalars(
        select(Evaluation).where(
            Evaluation.candidate_id == candidate.id,
            Evaluation.status == InterviewStatus.EVALUATED,
            Evaluation.id != evaluation.id
        )
    ).all()
    
    previous_remarks = []
    for pe in prior_evals:
        previous_remarks.append({
            "type": pe.type.value if pe.type else "EVALUATION",
            "verdict": pe.verdict.value if pe.verdict else None,
            "remarks": pe.remarks or ""
        })
        
    is_already_submitted = token_row.is_used or evaluation.status == InterviewStatus.EVALUATED
        
    return EvaluationPublicOut(
        id=evaluation.id,
        type=evaluation.type,
        candidate_name=candidate.full_name,
        candidate_position=candidate.position_applied_for or "Unknown",
        candidate_resume_url=resume_url,
        candidate_experience=candidate.profile.total_experience if candidate.profile else None,
        candidate_education=candidate.profile.raw_data.get("highestQual", "") if candidate.profile and candidate.profile.raw_data else "",
        candidate_email=candidate.email,
        candidate_phone=candidate.phone,
        candidate_location=candidate.branch_location,
        candidate_source=candidate.source if candidate.source else None,
        candidate_skills=candidate.profile.raw_data.get("skills", "") if candidate.profile and candidate.profile.raw_data else "",
        candidate_current_salary=candidate.profile.raw_data.get("currentSalary", "") if candidate.profile and candidate.profile.raw_data else "",
        candidate_expected_salary=candidate.profile.raw_data.get("expectedSalary", "") if candidate.profile and candidate.profile.raw_data else "",
        candidate_notice_period=candidate.profile.raw_data.get("noticePeriod", "") if candidate.profile and candidate.profile.raw_data else "",
        previous_remarks=previous_remarks,
        is_already_submitted=is_already_submitted
    )


@router.post("/public/{token}/submit")
def submit_public_evaluation(
    token: str,
    body: EvaluationPublicSubmit,
    db: Session = Depends(get_db),
):
    token_row = db.scalar(
        select(EvaluationToken).where(
            EvaluationToken.token == token,
            EvaluationToken.is_used.is_(False),
            EvaluationToken.expires_at > datetime.now(UTC)
        ).with_for_update()
    )
    if not token_row:
        raise HTTPException(status_code=404, detail="Token not found, expired, or already used")
        
    evaluation = db.get(Evaluation, token_row.evaluation_id)
    candidate = db.get(Candidate, evaluation.candidate_id)
    
    evaluation.verdict = body.verdict
    evaluation.remarks = body.remarks
    if body.scores:
        evaluation.scores = body.scores
        
    evaluation.status = InterviewStatus.EVALUATED
    token_row.is_used = True
    
    # Write Activity Log
    log = ActivityLog(
        candidate_id=candidate.id,
        activity_type=ActivityType.CALL,
        title=f"{evaluation.type.value.replace('_', ' ').title()} Scorecard Submitted (via Link)",
        description=f"Verdict: {body.verdict.value}. Remarks: {body.remarks or 'None'}",
        created_by_user_id=None
    )
    db.add(log)
    
    # Auto transition to Reject if appropriate
    if body.verdict == EvaluationVerdict.REJECTED:
        # Since this is a public unauthenticated route, actor is system or candidate's assigned HR
        system_user = db.get(User, candidate.assigned_hr_user_id) if candidate.assigned_hr_user_id else None
        if system_user:
            WorkflowService.transition(
                db=db,
                candidate=candidate,
                target_stage=PipelineStage.REJECTED,
                user=system_user,
                remarks=f"Rejected during public {evaluation.type.value.replace('_', ' ').title()} evaluation."
            )
            
    db.commit()
    return {"status": "success", "message": "Evaluation scorecard submitted"}


@router.get("/public/{token}/test-questions")
def get_public_test_questions(
    token: str,
    db: Session = Depends(get_db),
):
    token_row = db.scalar(
        select(EvaluationToken).where(
            EvaluationToken.token == token,
            EvaluationToken.is_used.is_(False),
            EvaluationToken.expires_at > datetime.now(UTC)
        )
    )
    if not token_row:
        raise HTTPException(status_code=404, detail="Token not found, expired, or already used")
        
    evaluation = db.get(Evaluation, token_row.evaluation_id)
    if evaluation.type != EvaluationType.TECHNICAL_TEST:
         raise HTTPException(status_code=400, detail="This evaluation is not a technical test")
         
    candidate = db.get(Candidate, evaluation.candidate_id)
    dept = _get_candidate_department(candidate.position_applied_for)
    
    if token_row.test_data and "questions" in token_row.test_data:
        public_questions = token_row.test_data["questions"]
    else:
        q_rows = db.scalars(
            select(TechnicalQuestion).where(TechnicalQuestion.department == dept)
        ).all()
        if not q_rows:
            q_rows = db.scalars(
                select(TechnicalQuestion).where(TechnicalQuestion.department == "IT")
            ).all()
        public_questions = [
            {"id": q.id, "text": q.text, "options": q.options}
            for q in q_rows
        ]
        
    return {"department": dept, "questions": public_questions}


@router.post("/public/{token}/submit-test")
def submit_public_test(
    token: str,
    body: CandidateTestSubmit,
    db: Session = Depends(get_db),
):
    token_row = db.scalar(
        select(EvaluationToken).where(
            EvaluationToken.token == token,
            EvaluationToken.is_used.is_(False),
            EvaluationToken.expires_at > datetime.now(UTC)
        ).with_for_update()
    )
    if not token_row:
        raise HTTPException(status_code=404, detail="Token not found, expired, or already used")
        
    evaluation = db.get(Evaluation, token_row.evaluation_id)
    if evaluation.type != EvaluationType.TECHNICAL_TEST:
         raise HTTPException(status_code=400, detail="This evaluation is not a technical test")
         
    candidate = db.get(Candidate, evaluation.candidate_id)
    dept = _get_candidate_department(candidate.position_applied_for)
    
    if token_row.test_data and "answers" in token_row.test_data:
        answers_map = token_row.test_data["answers"]
    else:
        q_rows = db.scalars(
            select(TechnicalQuestion).where(TechnicalQuestion.department == dept)
        ).all()
        if not q_rows:
            q_rows = db.scalars(
                select(TechnicalQuestion).where(TechnicalQuestion.department == "IT")
            ).all()
        answers_map = {q.id: q.answer for q in q_rows}
        
    correct_count = 0
    total_count = len(answers_map)
    for qid, correct_ans in answers_map.items():
        candidate_ans = body.answers.get(qid)
        if candidate_ans == correct_ans:
            correct_count += 1
            
    percentage = (correct_count / total_count) * 100 if total_count > 0 else 0
    verdict = EvaluationVerdict.PASS if percentage >= 60.0 else EvaluationVerdict.FAIL
    
    evaluation.verdict = verdict
    evaluation.status = InterviewStatus.EVALUATED
    evaluation.remarks = f"Score: {correct_count}/{total_count} ({percentage:.1f}%) via online portal test."
    evaluation.scores = {
        "correct_answers": correct_count,
        "total_questions": total_count,
        "percentage": percentage
    }
    
    token_row.is_used = True
    
    db.add(ActivityLog(
        candidate_id=candidate.id,
        activity_type=ActivityType.FORM,
        title="Technical Test Completed",
        description=f"Online technical test completed. Score: {correct_count}/{total_count} ({percentage:.1f}%) - {verdict.value}.",
        created_by_user_id=None
    ))
    
    db.commit()
    return {"status": "success", "verdict": verdict.value, "score": f"{correct_count}/{total_count}"}


@router.post("/{eval_id}/send-whatsapp-invite")
def send_evaluation_whatsapp_invite(
    eval_id: UUID,
    body: EvaluationWhatsAppInvite,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_HR_HEAD, UserRole.BRANCH_HR, UserRole.HQ_HR, UserRole.LOCAL_HR, UserRole.ADMIN)),
):
    evaluation = db.get(Evaluation, eval_id)
    if not evaluation:
        raise HTTPException(status_code=404, detail="Evaluation not found")
        
    candidate = db.get(Candidate, evaluation.candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
        
    DOUBLETICK_VARIABLE_KEYS = [
        "candidateName",
        "position",
        "date",
        "time",
        "mode",
        "locationOrLink",
        "recruiterName",
    ]
    
    placeholders = []
    for key in DOUBLETICK_VARIABLE_KEYS:
        val = body.variables.get(key, "")
        placeholders.append(val)
        
    client = DoubleTickClient()
    
    template_name = "nippon_interviewer_invite" if body.recipient_type == "INTERVIEWER" else "nippon_hr_interview_invite"
    
    try:
        res = client.send_template(
            to_phone=body.to_phone,
            template_name=template_name,
            placeholders=placeholders,
        )
        external_message_id = None
        messages = res.get("messages", [])
        if messages:
            external_message_id = messages[0].get("id")
            
        status_comm = CommunicationStatus.SENT
        err_msg = None
    except Exception as e:
        status_comm = CommunicationStatus.FAILED
        err_msg = str(e)
        
    # Construct content preview
    content_lines = [
        f"Template: {template_name}",
        f"To: {body.to_phone}",
    ]
    for key in DOUBLETICK_VARIABLE_KEYS:
        val = body.variables.get(key, "")
        content_lines.append(f"{key}: {val}")
        
    # Write to communications table
    comm = Communication(
        candidate_id=candidate.id,
        type=CommunicationType.WHATSAPP,
        direction=CommunicationDirection.OUTGOING,
        status=status_comm,
        subject="Interview WhatsApp Invitation",
        content_preview="\n".join(content_lines),
        external_message_id=external_message_id,
        created_by=current_user.id
    )
    db.add(comm)
    
    # Write Activity Log
    act = ActivityLog(
        candidate_id=candidate.id,
        activity_type=ActivityType.WHATSAPP,
        title="Interview Invite Sent (WhatsApp)",
        description=f"Invite sent to {body.to_phone}. Status: {status_comm.value}" + (f" Error: {err_msg}" if err_msg else ""),
        created_by_user_id=current_user.id
    )
    db.add(act)
    db.commit()
    
    if status_comm == CommunicationStatus.FAILED:
        raise HTTPException(status_code=500, detail=f"Failed to send invite: {err_msg}")
        
    return {"status": "success", "message_id": external_message_id}

