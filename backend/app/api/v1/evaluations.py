import secrets
from datetime import datetime, timedelta, UTC
from uuid import UUID
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_active_user, require_roles
from app.models.enums import UserRole, PipelineStage, InterviewStatus, EvaluationType, EvaluationVerdict, ActivityType
from app.models.candidate import Candidate
from app.models.evaluation import Evaluation
from app.models.evaluation_token import EvaluationToken
from app.models.document import Document
from app.models.enums import DocumentType
from app.models.activity_log import ActivityLog
from app.schemas.evaluation import (
    EvaluationOut,
    EvaluationSchedule,
    EvaluationSubmitScorecard,
    EvaluationPublicOut,
    EvaluationPublicSubmit,
    CandidateTestSubmit,
    EvaluationTokenOut,
)
from app.services.workflow import WorkflowService
from app.services import storage

router = APIRouter(prefix="/evaluations", tags=["Evaluations"])

# Static test questions per department
TEST_QUESTIONS = {
    "IT": [
        {"id": "q1", "text": "What is the output of typeof null in JavaScript?", "options": {"a": "null", "b": "object", "c": "undefined", "d": "number"}, "answer": "b"},
        {"id": "q2", "text": "Which HTTP status code represents 'Unauthorized'?", "options": {"a": "400", "b": "401", "c": "403", "d": "404"}, "answer": "b"},
        {"id": "q3", "text": "What does SQL stand for?", "options": {"a": "Structured Query Language", "b": "Simple Query Language", "c": "Standard Query Language", "d": "System Query Language"}, "answer": "a"},
        {"id": "q4", "text": "Which database type uses tables and keys?", "options": {"a": "NoSQL", "b": "Relational", "c": "Graph", "d": "Key-value"}, "answer": "b"},
        {"id": "q5", "text": "Which git command downloads commits and merges them?", "options": {"a": "git fetch", "b": "git push", "c": "git pull", "d": "git checkout"}, "answer": "c"}
    ],
    "SALES": [
        {"id": "q1", "text": "What is the first step in the traditional sales process?", "options": {"a": "Closing", "b": "Handling objections", "c": "Prospecting", "d": "Presentation"}, "answer": "c"},
        {"id": "q2", "text": "What does CRM stand for in sales operations?", "options": {"a": "Customer Relationship Management", "b": "Client Relations Manager", "c": "Company Revenue Management", "d": "Customer Retention Model"}, "answer": "a"},
        {"id": "q3", "text": "How should you handle a customer's pricing objection?", "options": {"a": "Offer discount immediately", "b": "Focus on value and benefits first", "c": "Tell them they are wrong", "d": "Ignore the objection"}, "answer": "b"},
        {"id": "q4", "text": "What is the conversion rate?", "options": {"a": "Leads converted divided by total leads", "b": "Sales revenue divided by customer count", "c": "Clicks divided by impressions", "d": "Deals lost divided by deals won"}, "answer": "a"},
        {"id": "q5", "text": "Which term describes selling an additional, more premium product?", "options": {"a": "Cross-selling", "b": "Down-selling", "c": "Up-selling", "d": "Cold calling"}, "answer": "c"}
    ],
    "SERVICE": [
        {"id": "q1", "text": "What is the primary function of engine oil?", "options": {"a": "Cooling only", "b": "Lubrication and friction reduction", "c": "Fuel combustion", "d": "Exhaust filtration"}, "answer": "b"},
        {"id": "q2", "text": "What tool is used to read vehicle diagnostic trouble codes (DTCs)?", "options": {"a": "Multimeter", "b": "OBD-II Scanner", "c": "Pressure gauge", "d": "Hydrometer"}, "answer": "b"},
        {"id": "q3", "text": "If a brake pedal feels spongy, what is the most likely cause?", "options": {"a": "Worn brake pads", "b": "Air in the brake lines", "c": "Worn rotors", "d": "Stuck caliper"}, "answer": "b"},
        {"id": "q4", "text": "What does PSI measure in vehicle servicing?", "options": {"a": "Engine torque", "b": "Tire pressure", "c": "Battery voltage", "d": "Coolant temperature"}, "answer": "b"},
        {"id": "q5", "text": "Which component is responsible for recharging the vehicle battery while driving?", "options": {"a": "Starter motor", "b": "Alternator", "c": "Radiator", "d": "Distributor"}, "answer": "b"}
    ],
    "FINANCE": [
        {"id": "q1", "text": "Which financial statement shows assets, liabilities, and equity at a specific point in time?", "options": {"a": "Income Statement", "b": "Balance Sheet", "c": "Cash Flow Statement", "d": "Retained Earnings statement"}, "answer": "b"},
        {"id": "q2", "text": "What is the formula for calculating Net Income?", "options": {"a": "Assets - Liabilities", "b": "Revenue - Expenses", "c": "Cash Inflow - Cash Outflow", "d": "Gross Profit - Cost of Goods Sold"}, "answer": "b"},
        {"id": "q3", "text": "Which account increases with a debit entry?", "options": {"a": "Accounts Payable", "b": "Revenue", "c": "Cash (Asset)", "d": "Retained Earnings"}, "answer": "c"},
        {"id": "q4", "text": "What does ROI stand for?", "options": {"a": "Return on Investment", "b": "Rate of Inflation", "c": "Revenue on Invoices", "d": "Return on Interest"}, "answer": "a"},
        {"id": "q5", "text": "What is depreciation?", "options": {"a": "Increase in asset value over time", "b": "Allocation of the cost of an asset over its useful life", "c": "Cash payments to investors", "d": "Inventory losses due to theft"}, "answer": "b"}
    ]
}


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


@router.get("/candidate/{candidate_id}", response_model=list[EvaluationOut])
def get_candidate_evaluations(
    candidate_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(UserRole.ADMIN, UserRole.LOCAL_HR, UserRole.HQ_HR)),
):
    candidate = db.get(Candidate, candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
        
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
    current_user=Depends(require_roles(UserRole.ADMIN, UserRole.LOCAL_HR, UserRole.HQ_HR)),
):
    evaluation = db.get(Evaluation, eval_id)
    if not evaluation:
        raise HTTPException(status_code=404, detail="Evaluation not found")
        
    evaluation.interview_mode = body.interview_mode
    evaluation.scheduled_time = body.scheduled_time
    evaluation.location_or_link = body.location_or_link
    
    if body.interview_mode or body.scheduled_time or body.location_or_link:
        evaluation.status = InterviewStatus.SCHEDULED
        
    db.commit()
    db.refresh(evaluation)
    return evaluation


@router.post("/{eval_id}/token", response_model=EvaluationTokenOut)
def generate_evaluation_token(
    eval_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(UserRole.ADMIN, UserRole.LOCAL_HR, UserRole.HQ_HR)),
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
        
    from app.core.security import generate_secure_token
    token_str = generate_secure_token()
    new_token = EvaluationToken(
        evaluation_id=eval_id,
        token=token_str,
        is_used=False,
        expires_at=datetime.now(UTC) + timedelta(days=7)
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
    current_user=Depends(require_roles(UserRole.ADMIN, UserRole.LOCAL_HR, UserRole.HQ_HR)),
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
            EvaluationToken.is_used == False,
            EvaluationToken.expires_at > datetime.now(UTC)
        )
    )
    if not token_row:
        raise HTTPException(status_code=404, detail="Token not found, expired, or already used")
        
    evaluation = db.get(Evaluation, token_row.evaluation_id)
    candidate = db.get(Candidate, evaluation.candidate_id)
    
    # Get resume signed URL
    resume_doc = db.scalar(
        select(Document).where(
            Document.candidate_id == candidate.id,
            Document.doc_type == DocumentType.RESUME
        )
    )
    resume_url = storage.create_signed_url(resume_doc.storage_path) if resume_doc else None
    
    # Retrieve previous remarks
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
            "type": pe.type.value,
            "verdict": pe.verdict.value if pe.verdict else None,
            "remarks": pe.remarks or ""
        })
        
    return EvaluationPublicOut(
        id=evaluation.id,
        type=evaluation.type,
        candidate_name=candidate.full_name,
        candidate_position=candidate.position_applied_for or "Unknown",
        candidate_resume_url=resume_url,
        candidate_experience=candidate.profile.total_experience if candidate.profile else None,
        candidate_education=candidate.profile.raw_data.get("highestQual", "") if candidate.profile and candidate.profile.raw_data else "",
        previous_remarks=previous_remarks
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
            EvaluationToken.is_used == False,
            EvaluationToken.expires_at > datetime.now(UTC)
        )
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
            EvaluationToken.is_used == False,
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
    questions = TEST_QUESTIONS.get(dept, TEST_QUESTIONS["IT"])
    
    # Return questions without correct answers for security
    public_questions = []
    for q in questions:
        public_questions.append({
            "id": q["id"],
            "text": q["text"],
            "options": q["options"]
        })
        
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
            EvaluationToken.is_used == False,
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
    questions = TEST_QUESTIONS.get(dept, TEST_QUESTIONS["IT"])
    
    # Calculate score
    correct_count = 0
    total_count = len(questions)
    for q in questions:
        qid = q["id"]
        candidate_ans = body.answers.get(qid)
        if candidate_ans == q["answer"]:
            correct_count += 1
            
    percentage = (correct_count / total_count) * 100 if total_count > 0 else 0
    verdict = EvaluationVerdict.PASS if percentage >= 60.0 else EvaluationVerdict.FAIL
    
    evaluation.verdict = verdict
    evaluation.status = InterviewStatus.EVALUATED
    evaluation.remarks = f"Score: {correct_count}/{total_count} ({percentage:.1f}%) via online portal test."
    evaluation.scores = {
        "correct_answers": correct_count,
        "total_questions": total_count,
        "percentage": percentage,
        "responses": body.answers
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
