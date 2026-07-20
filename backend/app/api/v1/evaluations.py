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
    EvaluationCreate,
)
from app.services.workflow import transition
from app.services import storage
from app.services.doubletick import send_template


router = APIRouter(prefix="/evaluations", tags=["Evaluations"])




def _get_candidate_department(position: str | None) -> str:
    if not position:
        return "SALES"
    pos = position.upper()
    if any(k in pos for k in ["SALES", "MARKETING", "ADVISOR", "CONSULTANT"]):
        return "SALES"
    if any(k in pos for k in ["SERVICE", "MECHANIC", "DIAGNOSTIC", "WORKSHOP", "TECHNICIAN"]):
        return "SERVICE"
    if any(k in pos for k in ["INSURANCE", "POLICY", "CLAIMS", "UNDERWRITER"]):
        return "INSURANCE"
    if any(k in pos for k in ["FINANCE", "ACCOUNT", "BILLING", "CASHIER"]):
        return "FINANCE"
    return "SALES"  # default


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
        PipelineStage.BRANCH_INTERVIEW: [EvaluationType.BRANCH_HR, EvaluationType.DEPT_HEAD],
        PipelineStage.TEST: [EvaluationType.TECHNICAL_TEST],
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
        .order_by(Evaluation.created_at.asc(), Evaluation.type.asc())
    ).all()
    return evals

@router.post("/candidate/{candidate_id}", response_model=EvaluationOut)
def create_evaluation(
    candidate_id: UUID,
    body: EvaluationCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_HR_HEAD, UserRole.BRANCH_HR, UserRole.HQ_HR, UserRole.LOCAL_HR, UserRole.ADMIN)),
):
    candidate = db.get(Candidate, candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    # Prevent duplicate TECHNICAL_TEST evaluations per candidate
    if body.type == EvaluationType.TECHNICAL_TEST:
        existing = db.scalar(
            select(Evaluation).where(
                Evaluation.candidate_id == candidate_id,
                Evaluation.type == EvaluationType.TECHNICAL_TEST,
            )
        )
        if existing:
            return existing
        
    scores = {}
    if body.interviewer_name:
        scores["interviewer_name"] = body.interviewer_name
    if body.interviewer_designation:
        scores["interviewer_designation"] = body.interviewer_designation
        
    evaluation = Evaluation(
        candidate_id=candidate_id,
        type=body.type,
        status=InterviewStatus.PENDING_SCHEDULE,
        scores=scores if scores else None
    )
    db.add(evaluation)
    db.commit()
    db.refresh(evaluation)
    return evaluation


@router.delete("/{eval_id}")
def delete_evaluation(
    eval_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_HR_HEAD, UserRole.BRANCH_HR, UserRole.HQ_HR, UserRole.LOCAL_HR, UserRole.ADMIN)),
):
    evaluation = db.get(Evaluation, eval_id)
    if not evaluation:
        raise HTTPException(status_code=404, detail="Evaluation not found")
        
    if evaluation.type == EvaluationType.BRANCH_HR:
        raise HTTPException(status_code=400, detail="Cannot delete HR interview")
        
    if evaluation.type == EvaluationType.DEPT_HEAD:
        count = db.query(Evaluation).filter(
            Evaluation.candidate_id == evaluation.candidate_id, 
            Evaluation.type == EvaluationType.DEPT_HEAD
        ).count()
        if count <= 1:
            raise HTTPException(status_code=400, detail="Cannot delete the mandatory department interview")
        
    db.delete(evaluation)
    db.commit()
    return {"status": "success"}


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
        
    # Reuse existing active token if present
    existing_token = db.scalar(
        select(EvaluationToken).where(
            EvaluationToken.evaluation_id == eval_id,
            EvaluationToken.is_used.is_(False),
            EvaluationToken.expires_at > datetime.now(UTC)
        )
    )
    if existing_token:
        return existing_token

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
                select(TechnicalQuestion).where(TechnicalQuestion.department == "SALES")
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
        expires_at=datetime.now(UTC) + timedelta(minutes=10),
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
    
    # Auto transition workflow on Reject or On Hold
    if body.verdict == EvaluationVerdict.REJECTED:
        transition(
            db=db,
            candidate=candidate,
            target_stage=PipelineStage.REJECTED,
            user=current_user,
            remarks=f"Rejected during {evaluation.type.value.replace('_', ' ').title()} evaluation."
        )
    elif body.verdict == EvaluationVerdict.ON_HOLD:
        transition(
            db=db,
            candidate=candidate,
            target_stage=PipelineStage.ON_HOLD,
            user=current_user,
            remarks=f"Placed on hold during {evaluation.type.value.replace('_', ' ').title()} evaluation."
        )
    elif body.verdict == EvaluationVerdict.SELECTED and candidate.current_stage == PipelineStage.BRANCH_INTERVIEW:
        # Check if both HR and Dept are evaluated
        evals = db.scalars(
            select(Evaluation).where(
                Evaluation.candidate_id == candidate.id,
                Evaluation.type.in_([EvaluationType.BRANCH_HR, EvaluationType.DEPT_HEAD])
            )
        ).all()
        # If we have both and both are evaluated/selected
        hr_eval = next((e for e in evals if e.type == EvaluationType.BRANCH_HR), None)
        dept_eval = next((e for e in evals if e.type == EvaluationType.DEPT_HEAD), None)
        
        if hr_eval and dept_eval:
            if hr_eval.status == InterviewStatus.EVALUATED and dept_eval.status == InterviewStatus.EVALUATED:
                if hr_eval.verdict == EvaluationVerdict.SELECTED and dept_eval.verdict == EvaluationVerdict.SELECTED:
                    transition(
                        db=db,
                        candidate=candidate,
                        target_stage=PipelineStage.TEST,
                        user=current_user,
                        remarks="Branch Interview completed by both HR and Department."
                    )
        
        
    # Auto transition to Hired for HQ Interview
    if evaluation.type == EvaluationType.HQ_INTERVIEW and body.verdict == EvaluationVerdict.SELECTED:
        transition(
            db=db,
            candidate=candidate,
            target_stage=PipelineStage.HIRED,
            user=current_user,
            remarks="HQ interview approved. Candidate hired."
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
    
    # 1. Fetch HR screening remarks (Chronologically first)
    from app.models.candidate_screening import CandidateScreening
    screening = db.scalar(
        select(CandidateScreening).where(CandidateScreening.candidate_id == candidate.id)
    )
    if screening and screening.remarks:
        previous_remarks.append({
            "type": "HR_SCREENING",
            "verdict": screening.status.value if hasattr(screening.status, 'value') else screening.status,
            "remarks": screening.remarks
        })

    # 2. Append prior evaluation stage remarks
    for pe in prior_evals:
        previous_remarks.append({
            "type": pe.type.value if hasattr(pe.type, 'value') else (pe.type or "EVALUATION"),
            "verdict": pe.verdict.value if hasattr(pe.verdict, 'value') else pe.verdict,
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
        candidate_raw_data=candidate.profile.raw_data if candidate.profile else None,
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
    
    # Auto transition to Reject or On Hold if appropriate
    if body.verdict in (EvaluationVerdict.REJECTED, EvaluationVerdict.ON_HOLD):
        # Since this is a public unauthenticated route, actor is system or candidate's assigned HR
        system_user = db.get(User, candidate.assigned_hr_user_id) if candidate.assigned_hr_user_id else None
        if system_user:
            if body.verdict == EvaluationVerdict.REJECTED:
                remarks = f"Rejected during public {evaluation.type.value.replace('_', ' ').title()} evaluation."
                target = PipelineStage.REJECTED
            else:
                remarks = f"Placed on hold during public {evaluation.type.value.replace('_', ' ').title()} evaluation."
                target = PipelineStage.ON_HOLD
                
            transition(
                db=db,
                candidate=candidate,
                target_stage=target,
                user=system_user,
                remarks=remarks
            )
    elif body.verdict == EvaluationVerdict.SELECTED and candidate.stage == PipelineStage.BRANCH_INTERVIEW:
        evals = db.scalars(
            select(Evaluation).where(
                Evaluation.candidate_id == candidate.id,
                Evaluation.type.in_([EvaluationType.BRANCH_HR, EvaluationType.DEPT_HEAD])
            )
        ).all()
        hr_eval = next((e for e in evals if e.type == EvaluationType.BRANCH_HR), None)
        dept_eval = next((e for e in evals if e.type == EvaluationType.DEPT_HEAD), None)
        
        if hr_eval and dept_eval:
            if hr_eval.status == InterviewStatus.EVALUATED and dept_eval.status == InterviewStatus.EVALUATED:
                if hr_eval.verdict == EvaluationVerdict.SELECTED and dept_eval.verdict == EvaluationVerdict.SELECTED:
                    system_user = db.get(User, candidate.assigned_hr_user_id) if candidate.assigned_hr_user_id else None
                    if system_user:
                        transition(
                            db=db,
                            candidate=candidate,
                            target_stage=PipelineStage.TEST,
                            user=system_user,
                            remarks="Branch Interview completed by both HR and Department via public link."
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
                select(TechnicalQuestion).where(TechnicalQuestion.department == "SALES")
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
        )
    )
    if not token_row:
        raise HTTPException(status_code=404, detail="Token not found, expired, or already used")
        
    evaluation = db.get(Evaluation, token_row.evaluation_id)
    if evaluation.type != EvaluationType.TECHNICAL_TEST:
         raise HTTPException(status_code=400, detail="This evaluation is not a technical test")
         
    candidate = db.get(Candidate, evaluation.candidate_id)
    dept = _get_candidate_department(candidate.position_applied_for)
    
    answers_map = token_row.test_data.get("answers", {})
    correct_count = 0
    total_count = len(answers_map) if answers_map else 0
    question_scores = {}
    
    for q_id, correct_ans in answers_map.items():
        cand_ans = body.answers.get(q_id)
        if cand_ans and cand_ans == correct_ans:
            correct_count += 1
            question_scores[q_id] = 1
        else:
            question_scores[q_id] = 0
            
    percentage = int((correct_count / total_count) * 100) if total_count > 0 else 0
    
    evaluation.scores = {
        "candidate_answers": body.answers,
        "question_scores": question_scores,
        "correct_answers": correct_count,
        "total_questions": total_count,
        "percentage": percentage
    }
    
    evaluation.status = InterviewStatus.EVALUATED
    evaluation.verdict = EvaluationVerdict.PASS if percentage >= 50 else EvaluationVerdict.FAIL
    
    token_row.is_used = True
    
    db.add(ActivityLog(
        candidate_id=candidate.id,
        activity_type=ActivityType.FORM,
        title="Technical Test Auto-Evaluated",
        description=f"Candidate scored {percentage}% ({correct_count}/{total_count}). System auto-assigned {evaluation.verdict.value} verdict.",
        created_by_user_id=None
    ))
    
    db.commit()
    return {"status": "success", "message": "Test submitted for manual evaluation."}


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
        val = body.variables.get(key, "") if body.variables else ""
        placeholders.append(val)
        
    

    if body.recipient_type == "INTERVIEWER":
        template_name = "nippon_interviewer_invite"
    else:
        if evaluation.type == EvaluationType.TECHNICAL_TEST:
            template_name = "nippon_technical_test_invite"
        else:
            template_name = "nippon_hr_interview_invite"
    
    external_message_id = None
    try:
        res = send_template(
            to_phone=body.to_phone,
            template_name=template_name,
            placeholders=placeholders,
        )
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


@router.get("/questions")
def get_department_questions(
    department: str,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.HR))
):
    q_rows = db.scalars(
        select(TechnicalQuestion).where(TechnicalQuestion.department == department)
    ).all()
    if not q_rows:
        q_rows = db.scalars(
            select(TechnicalQuestion).where(TechnicalQuestion.department == "SALES")
        ).all()
        
    return [
        {
            "id": str(q.id),
            "text": q.text,
            "options": q.options,
            "department": q.department
        } for q in q_rows
    ]
    if not q_rows:
        q_rows = db.scalars(
            select(TechnicalQuestion).where(TechnicalQuestion.department == "SALES")
        ).all()
        
    return [
        {
            "id": str(q.id),
            "text": q.text,
            "options": q.options,
            "department": q.department
        } for q in q_rows
    ]
