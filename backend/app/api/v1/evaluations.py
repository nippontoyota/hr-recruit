from datetime import UTC, datetime, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from app.core.access import get_candidate_for_user
from app.core.ho_pipeline import handed_over_to_ho
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
    PreviousInterviewOut,
    CandidateTestSubmit,
    EvaluationTokenOut,
    EvaluationWhatsAppInvite,
    TechnicalQuestionOut,
    EvaluationCreate,
    EvaluationTitleUpdate,
    EvaluationInterviewerUpdate,
)
from app.core.config import settings
from app.core.interviewer_packet import filter_interviewer_packet
from app.core.positions import paper_key, validate_assignment
from app.core.test_paper import assemble_for_candidate, assemble_test_questions, to_test_data
from app.services.workflow import transition
from app.services import storage
from app.services.document_service import process_photo_url
from app.services.doubletick import (
    send_template,
    DoubleTickError,
    friendly_doubletick_error,
    hr_interview_placeholders,
    interviewer_placeholders,
    technical_test_placeholders,
)


router = APIRouter(prefix="/evaluations", tags=["Evaluations"])

INTERVIEW_LINK_TYPES = frozenset(
    {
        EvaluationType.BRANCH_HR,
        EvaluationType.DEPT_HEAD,
        EvaluationType.GM_LEVEL,
        EvaluationType.HQ_INTERVIEW,
        EvaluationType.HQ_INTERVIEW_1,
        EvaluationType.HQ_INTERVIEW_2,
    }
)
INTERVIEW_TOKEN_TTL = timedelta(days=3650)

PUBLIC_SCORE_KEYS = (
    "attitude",
    "communication",
    "knowledge",
    "total_score",
    "interviewer_name",
    "percentage",
    "correct_answers",
    "total_questions",
    "custom_title",
)


def _public_scores(scores: dict | None) -> dict | None:
    if not scores:
        return None
    out = {key: scores[key] for key in PUBLIC_SCORE_KEYS if key in scores and scores[key] is not None}
    return out or None


def _eval_for_write(db: Session, eval_id: UUID, user: User) -> tuple[Evaluation, Candidate]:
    evaluation = db.get(Evaluation, eval_id)
    if not evaluation:
        raise HTTPException(status_code=404, detail="Evaluation not found")
    candidate = get_candidate_for_user(db, evaluation.candidate_id, user, write=True)
    return evaluation, candidate


def _mark_eval_tokens_used(db: Session, eval_id: UUID) -> None:
    rows = db.scalars(
        select(EvaluationToken).where(
            EvaluationToken.evaluation_id == eval_id,
            EvaluationToken.is_used.is_(False),
        )
    ).all()
    for row in rows:
        row.is_used = True


def _set_score_value(evaluation: Evaluation, key: str, value: str) -> None:
    scores = dict(evaluation.scores or {})
    if value:
        scores[key] = value
    else:
        scores.pop(key, None)
    evaluation.scores = scores
    flag_modified(evaluation, "scores")


def _apply_evaluation_outcome(
    db: Session,
    evaluation: Evaluation,
    candidate: Candidate,
    verdict: EvaluationVerdict | None,
    user: User | None,
) -> None:
    if not verdict or not user:
        return

    if verdict == EvaluationVerdict.REJECTED:
        transition(
            db=db,
            candidate=candidate,
            target_stage=PipelineStage.REJECTED,
            user=user,
            remarks=f"Rejected during {evaluation.type.value.replace('_', ' ').title()} evaluation.",
            skip_handover_lock=True,
        )
        return
    if verdict == EvaluationVerdict.ON_HOLD:
        transition(
            db=db,
            candidate=candidate,
            target_stage=PipelineStage.ON_HOLD,
            user=user,
            remarks=f"Placed on hold during {evaluation.type.value.replace('_', ' ').title()} evaluation.",
            skip_handover_lock=True,
        )
        return
    if verdict != EvaluationVerdict.SELECTED:
        return

    if candidate.current_stage == PipelineStage.BRANCH_INTERVIEW:
        evals = db.scalars(
            select(Evaluation).where(
                Evaluation.candidate_id == candidate.id,
                Evaluation.type.in_([EvaluationType.BRANCH_HR, EvaluationType.DEPT_HEAD]),
            )
        ).all()
        hr_eval = next((e for e in evals if e.type == EvaluationType.BRANCH_HR), None)
        dept_eval = next((e for e in evals if e.type == EvaluationType.DEPT_HEAD), None)
        if (
            hr_eval
            and dept_eval
            and hr_eval.status == InterviewStatus.EVALUATED
            and dept_eval.status == InterviewStatus.EVALUATED
            and hr_eval.verdict == EvaluationVerdict.SELECTED
            and dept_eval.verdict == EvaluationVerdict.SELECTED
        ):
            transition(
                db=db,
                candidate=candidate,
                target_stage=PipelineStage.TEST,
                user=user,
                remarks="Branch Interview completed by both HR and Department.",
                skip_handover_lock=True,
            )

    ho_interview_stages = (
        PipelineStage.SENT_TO_HO,
        PipelineStage.HO_INTERVIEWS,
        PipelineStage.HO_HR_INTERVIEW,
        PipelineStage.HO_DEPT_INTERVIEW,
    )
    if evaluation.type == EvaluationType.HQ_INTERVIEW_1 and candidate.current_stage in ho_interview_stages:
        if candidate.current_stage != PipelineStage.HO_INTERVIEWS:
            transition(
                db=db,
                candidate=candidate,
                target_stage=PipelineStage.HO_INTERVIEWS,
                user=user,
                remarks="HO interviews in progress.",
                skip_handover_lock=True,
            )
    elif evaluation.type == EvaluationType.HQ_INTERVIEW_2:
        ho_evals = db.scalars(
            select(Evaluation).where(
                Evaluation.candidate_id == candidate.id,
                Evaluation.type.in_([EvaluationType.HQ_INTERVIEW_1, EvaluationType.HQ_INTERVIEW_2]),
            )
        ).all()
        hr_eval = next((e for e in ho_evals if e.type == EvaluationType.HQ_INTERVIEW_1), None)
        dept_eval = next((e for e in ho_evals if e.type == EvaluationType.HQ_INTERVIEW_2), None)
        if (
            hr_eval
            and dept_eval
            and hr_eval.status == InterviewStatus.EVALUATED
            and dept_eval.status == InterviewStatus.EVALUATED
            and hr_eval.verdict == EvaluationVerdict.SELECTED
            and dept_eval.verdict == EvaluationVerdict.SELECTED
            and candidate.current_stage in (*ho_interview_stages, PipelineStage.HO_DEPT_INTERVIEW)
        ):
            transition(
                db=db,
                candidate=candidate,
                target_stage=PipelineStage.CSS,
                user=user,
                remarks="HO HR and department interviews completed. CSS ready.",
                skip_handover_lock=True,
            )




def _candidate_dept_key(candidate: Candidate) -> str:
    return candidate.department or candidate.position_applied_for or ""


def _frozen_test_questions(db: Session, candidate_id: UUID) -> list[dict] | None:
    evaluation = db.scalar(
        select(Evaluation)
        .where(
            Evaluation.candidate_id == candidate_id,
            Evaluation.type == EvaluationType.TECHNICAL_TEST,
        )
        .order_by(Evaluation.created_at.desc())
    )
    if not evaluation:
        return None

    scores = evaluation.scores or {}
    snapshot = scores.get("questions") or []
    answers_key = scores.get("answer_key") or {}
    token_row = db.scalar(
        select(EvaluationToken)
        .where(EvaluationToken.evaluation_id == evaluation.id)
        .order_by(EvaluationToken.created_at.desc())
    )
    if not snapshot and token_row and token_row.test_data:
        snapshot = token_row.test_data.get("questions") or []
        answers_key = token_row.test_data.get("answers") or {}
    if not snapshot:
        return None

    candidate = db.get(Candidate, candidate_id)
    dept = _candidate_dept_key(candidate) if candidate else ""
    return [
        {
            "id": q["id"],
            "department": dept or "",
            "text": q["text"],
            "options": q.get("options") or {},
            "answer": answers_key.get(q["id"], answers_key.get(str(q["id"]), "")),
        }
        for q in snapshot
    ]


def _parse_utc_datetime(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def _ensure_test_deadline(token_row: EvaluationToken, db: Session) -> datetime:
    """Start the 8-minute test window on first open; return the submission deadline."""
    now = datetime.now(UTC)
    test_data = dict(token_row.test_data or {})
    deadline_str = test_data.get("deadline_at")
    if deadline_str:
        deadline = _parse_utc_datetime(deadline_str)
        if deadline <= now:
            raise HTTPException(status_code=400, detail="Test time has expired")
        return deadline

    started_at = now
    deadline = started_at + timedelta(minutes=settings.technical_test_duration_minutes)
    test_data["started_at"] = started_at.isoformat()
    test_data["deadline_at"] = deadline.isoformat()
    token_row.test_data = test_data
    db.add(token_row)
    db.commit()
    db.refresh(token_row)
    return deadline


def _assert_test_not_expired(token_row: EvaluationToken) -> None:
    test_data = token_row.test_data or {}
    deadline_str = test_data.get("deadline_at")
    if not deadline_str:
        return
    if _parse_utc_datetime(deadline_str) <= datetime.now(UTC):
        raise HTTPException(status_code=400, detail="Test time has expired")


@router.get("/questions", response_model=list[TechnicalQuestionOut])
def get_department_questions(
    department: str | None = None,
    position: str | None = None,
    experience: str | None = None,
    candidate_id: UUID | None = None,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(UserRole.ADMIN, UserRole.HO_HR, UserRole.LOCAL_HR)),
):
    if candidate_id:
        frozen = _frozen_test_questions(db, candidate_id)
        if frozen:
            return frozen
        candidate = db.get(Candidate, candidate_id)
        if not candidate:
            raise HTTPException(status_code=404, detail="Candidate not found")
        department = department or candidate.department
        position = position or candidate.position_applied_for
        if experience is None:
            experience = candidate.experience
    if not department or not position:
        raise HTTPException(
            status_code=400,
            detail="Provide candidate_id, or department and position.",
        )
    if not paper_key(department, position, experience):
        return []
    return assemble_test_questions(db, department, position, experience)




@router.get("/candidate/{candidate_id}", response_model=list[EvaluationOut])
def get_candidate_evaluations(
    candidate_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(UserRole.ADMIN, UserRole.HO_HR, UserRole.LOCAL_HR)),
):
    candidate = get_candidate_for_user(db, candidate_id, current_user)

    # Auto-initialize evaluations based on current stage for backward compatibility
    stage_to_types = {
        PipelineStage.BRANCH_INTERVIEW: [EvaluationType.BRANCH_HR, EvaluationType.DEPT_HEAD],
        PipelineStage.TEST: [EvaluationType.TECHNICAL_TEST],
    }
    
    req_types = stage_to_types.get(candidate.current_stage, [])
    skip_auto = current_user.role == UserRole.LOCAL_HR and handed_over_to_ho(candidate, db)
    if req_types and not skip_auto:
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
    current_user=Depends(require_roles(UserRole.ADMIN, UserRole.HO_HR, UserRole.LOCAL_HR)),
):
    candidate = get_candidate_for_user(db, candidate_id, current_user, write=True)

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


@router.patch("/{eval_id}/title", response_model=EvaluationOut)
def update_evaluation_title(
    eval_id: UUID,
    body: EvaluationTitleUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(UserRole.ADMIN, UserRole.HO_HR, UserRole.LOCAL_HR)),
):
    evaluation, _candidate = _eval_for_write(db, eval_id, current_user)
    if evaluation.type not in (EvaluationType.DEPT_HEAD, EvaluationType.HQ_INTERVIEW_2):
        raise HTTPException(status_code=400, detail="Only department interviews can be renamed.")

    title = (body.title or "").strip()
    if len(title) > 80:
        raise HTTPException(status_code=400, detail="Title must be 80 characters or fewer.")

    scores = dict(evaluation.scores or {})
    if title:
        scores["custom_title"] = title
    else:
        scores.pop("custom_title", None)
    evaluation.scores = scores
    flag_modified(evaluation, "scores")
    db.commit()
    db.refresh(evaluation)
    return evaluation


@router.patch("/{eval_id}/interviewer", response_model=EvaluationOut)
def update_evaluation_interviewer(
    eval_id: UUID,
    body: EvaluationInterviewerUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(UserRole.ADMIN, UserRole.HO_HR, UserRole.LOCAL_HR)),
):
    evaluation, _candidate = _eval_for_write(db, eval_id, current_user)
    name = (body.interviewer_name or "").strip()
    _set_score_value(evaluation, "interviewer_name", name)
    db.commit()
    db.refresh(evaluation)
    return evaluation


@router.delete("/{eval_id}")
def delete_evaluation(
    eval_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(UserRole.ADMIN, UserRole.HO_HR, UserRole.LOCAL_HR)),
):
    evaluation, _candidate = _eval_for_write(db, eval_id, current_user)
        
    if evaluation.type in (EvaluationType.BRANCH_HR, EvaluationType.HQ_INTERVIEW_1):
        raise HTTPException(status_code=400, detail="Cannot delete HR interview")

    if evaluation.type in (EvaluationType.DEPT_HEAD, EvaluationType.HQ_INTERVIEW_2):
        count = db.query(Evaluation).filter(
            Evaluation.candidate_id == evaluation.candidate_id,
            Evaluation.type == evaluation.type,
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
    current_user=Depends(require_roles(UserRole.ADMIN, UserRole.HO_HR, UserRole.LOCAL_HR)),
):
    evaluation, _candidate = _eval_for_write(db, eval_id, current_user)
        
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


def _assign_test_position(candidate: Candidate, position: str | None) -> None:
    if position:
        if not candidate.department:
            raise HTTPException(status_code=400, detail="Set a department on the candidate first.")
        try:
            validate_assignment(candidate.department, position, candidate.experience)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        candidate.position_applied_for = position
    if not paper_key(candidate.department, candidate.position_applied_for, candidate.experience):
        raise HTTPException(
            status_code=400,
            detail="Select a designation before generating the technical test.",
        )


@router.post("/{eval_id}/token", response_model=EvaluationTokenOut)
def generate_evaluation_token(
    eval_id: UUID,
    position: str | None = None,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(UserRole.ADMIN, UserRole.HO_HR, UserRole.LOCAL_HR)),
):
    evaluation = db.get(Evaluation, eval_id)
    if not evaluation:
        raise HTTPException(status_code=404, detail="Evaluation not found")

    candidate = None
    if evaluation.type == EvaluationType.TECHNICAL_TEST:
        candidate = db.get(Candidate, evaluation.candidate_id)
        if not candidate:
            raise HTTPException(status_code=404, detail="Candidate not found")
        _assign_test_position(candidate, position)

    unused = select(EvaluationToken).where(
        EvaluationToken.evaluation_id == eval_id,
        EvaluationToken.is_used.is_(False),
    )
    if evaluation.type == EvaluationType.TECHNICAL_TEST:
        unused = unused.where(EvaluationToken.expires_at > datetime.now(UTC))
    existing_token = db.scalar(unused)
    if existing_token:
        if evaluation.type in INTERVIEW_LINK_TYPES:
            existing_token.expires_at = datetime.now(UTC) + INTERVIEW_TOKEN_TTL
        elif evaluation.type == EvaluationType.TECHNICAL_TEST and candidate:
            test_data = dict(existing_token.test_data or {})
            if not test_data.get("deadline_at"):
                fresh = to_test_data(assemble_for_candidate(db, candidate))
                test_data["questions"] = fresh["questions"]
                test_data["answers"] = fresh["answers"]
                existing_token.test_data = test_data
                flag_modified(existing_token, "test_data")
        db.commit()
        db.refresh(existing_token)
        return existing_token

    token_str = generate_secure_token()
    
    test_data = None
    if evaluation.type == EvaluationType.TECHNICAL_TEST:
        test_data = to_test_data(assemble_for_candidate(db, candidate))

    new_token = EvaluationToken(
        evaluation_id=eval_id,
        token=token_str,
        is_used=False,
        expires_at=(
            datetime.now(UTC) + timedelta(days=settings.technical_test_link_expire_days)
            if evaluation.type == EvaluationType.TECHNICAL_TEST
            else datetime.now(UTC) + INTERVIEW_TOKEN_TTL
        ),
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
    current_user=Depends(require_roles(UserRole.ADMIN, UserRole.HO_HR, UserRole.LOCAL_HR)),
):
    evaluation, _candidate = _eval_for_write(db, eval_id, current_user)
        
    if body.verdict:
        evaluation.verdict = body.verdict
    if body.remarks:
        evaluation.remarks = body.remarks
    if body.scores:
        if evaluation.type in (
            EvaluationType.BRANCH_HR,
            EvaluationType.DEPT_HEAD,
            EvaluationType.HQ_INTERVIEW,
            EvaluationType.HQ_INTERVIEW_1,
            EvaluationType.HQ_INTERVIEW_2,
        ):
            name = str(body.scores.get("interviewer_name") or "").strip()
            if not name:
                raise HTTPException(
                    status_code=400,
                    detail="Interviewer name is required for this interview.",
                )
        evaluation.scores = body.scores
        
    evaluation.status = InterviewStatus.EVALUATED
    _mark_eval_tokens_used(db, evaluation.id)

    candidate = db.get(Candidate, evaluation.candidate_id)

    db.add(ActivityLog(
        candidate_id=candidate.id,
        activity_type=ActivityType.CALL,
        title=f"{evaluation.type.value.replace('_', ' ').title()} Scorecard Submitted",
        description=f"Verdict: {body.verdict.value if body.verdict else 'None'}. Remarks: {body.remarks or 'None'}",
        created_by_user_id=current_user.id
    ))
    _apply_evaluation_outcome(db, evaluation, candidate, body.verdict, current_user)
    db.commit()
    db.refresh(evaluation)
    return evaluation


@router.get("/public/{token}", response_model=EvaluationPublicOut)
def get_public_evaluation_details(
    token: str,
    db: Session = Depends(get_db),
):
    token_row = db.scalar(select(EvaluationToken).where(EvaluationToken.token == token))
    if not token_row:
        raise HTTPException(status_code=404, detail="Token not found, expired, or already used")

    evaluation = db.get(Evaluation, token_row.evaluation_id)
    if not evaluation:
        raise HTTPException(status_code=404, detail="Evaluation scorecard not found")

    if evaluation.type == EvaluationType.TECHNICAL_TEST:
        expires = token_row.expires_at
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=UTC)
        if expires <= datetime.now(UTC) and not token_row.is_used:
            raise HTTPException(status_code=404, detail="Token not found, expired, or already used")

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
        select(Evaluation)
        .where(
            Evaluation.candidate_id == candidate.id,
            Evaluation.status == InterviewStatus.EVALUATED,
            Evaluation.id != evaluation.id,
        )
        .order_by(Evaluation.created_at.asc())
    ).all()

    previous_remarks: list[PreviousInterviewOut] = []

    from app.models.candidate_screening import CandidateScreening
    screening = db.scalar(
        select(CandidateScreening).where(CandidateScreening.candidate_id == candidate.id)
    )
    if screening and screening.remarks:
        previous_remarks.append(
            PreviousInterviewOut(
                type="HR_SCREENING",
                verdict=screening.status.value if hasattr(screening.status, "value") else screening.status,
                remarks=screening.remarks,
            )
        )

    for pe in prior_evals:
        scores = _public_scores(pe.scores)
        previous_remarks.append(
            PreviousInterviewOut(
                type=pe.type.value if hasattr(pe.type, "value") else (pe.type or "EVALUATION"),
                verdict=pe.verdict.value if hasattr(pe.verdict, "value") else pe.verdict,
                remarks=pe.remarks or "",
                interviewer_name=str((scores or {}).get("interviewer_name") or "").strip() or None,
                scores=scores,
            )
        )
        
    is_already_submitted = token_row.is_used or evaluation.status == InterviewStatus.EVALUATED
    raw = candidate.profile.raw_data if candidate.profile else None
    photo_url = None
    if candidate.profile and candidate.profile.photo_url:
        try:
            photo_url = process_photo_url(candidate.profile.photo_url)
        except Exception:
            photo_url = None

    return EvaluationPublicOut(
        id=evaluation.id,
        type=evaluation.type,
        candidate_name=candidate.full_name,
        candidate_position=candidate.position_applied_for or candidate.department or "Unknown",
        candidate_resume_url=resume_url,
        candidate_photo_url=photo_url,
        candidate_experience=candidate.profile.total_experience if candidate.profile else None,
        candidate_education=(raw or {}).get("highestQual", "") if raw else "",
        candidate_location=candidate.branch_location,
        candidate_skills=(raw or {}).get("skills", "") if raw else "",
        candidate_current_salary=(raw or {}).get("currentSalary", "") if raw else "",
        candidate_expected_salary=(raw or {}).get("expectedSalary", "") if raw else "",
        candidate_notice_period=(raw or {}).get("noticePeriod", "") if raw else "",
        interviewer_name=str((evaluation.scores or {}).get("interviewer_name") or "").strip() or None,
        candidate_raw_data=filter_interviewer_packet(raw),
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
        ).with_for_update()
    )
    if not token_row:
        raise HTTPException(status_code=404, detail="Token not found, expired, or already used")

    evaluation = db.get(Evaluation, token_row.evaluation_id)
    if not evaluation:
        raise HTTPException(status_code=404, detail="Evaluation scorecard not found")
    if evaluation.status == InterviewStatus.EVALUATED:
        raise HTTPException(status_code=404, detail="Token not found, expired, or already used")

    if evaluation.type == EvaluationType.TECHNICAL_TEST:
        expires = token_row.expires_at
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=UTC)
        if expires <= datetime.now(UTC):
            raise HTTPException(status_code=404, detail="Token not found, expired, or already used")

    candidate = db.get(Candidate, evaluation.candidate_id)

    evaluation.verdict = body.verdict
    evaluation.remarks = body.remarks
    scores = dict(evaluation.scores or {})
    if body.scores:
        scores.update(body.scores)
    evaluation.scores = scores
    flag_modified(evaluation, "scores")
    evaluation.status = InterviewStatus.EVALUATED
    token_row.is_used = True
    _mark_eval_tokens_used(db, evaluation.id)

    db.add(ActivityLog(
        candidate_id=candidate.id,
        activity_type=ActivityType.CALL,
        title=f"{evaluation.type.value.replace('_', ' ').title()} Scorecard Submitted (via Link)",
        description=f"Verdict: {body.verdict.value}. Remarks: {body.remarks or 'None'}",
        created_by_user_id=None
    ))
    actor = db.get(User, candidate.assigned_hr_user_id) if candidate.assigned_hr_user_id else None
    _apply_evaluation_outcome(db, evaluation, candidate, body.verdict, actor)
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
    dept = _candidate_dept_key(candidate)

    deadline = _ensure_test_deadline(token_row, db)
    
    if token_row.test_data and "questions" in token_row.test_data:
        public_questions = token_row.test_data["questions"]
    else:
        q_rows = assemble_for_candidate(db, candidate)
        public_questions = [
            {"id": q.id, "text": q.text, "options": q.options}
            for q in q_rows
        ]
        
    return {
        "department": dept,
        "questions": public_questions,
        "expires_at": deadline.isoformat(),
        "duration_seconds": settings.technical_test_duration_minutes * 60,
    }


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

    _assert_test_not_expired(token_row)
        
    evaluation = db.get(Evaluation, token_row.evaluation_id)
    if evaluation.type != EvaluationType.TECHNICAL_TEST:
         raise HTTPException(status_code=400, detail="This evaluation is not a technical test")
         
    candidate = db.get(Candidate, evaluation.candidate_id)
    dept = _candidate_dept_key(candidate)
    
    answers_map = token_row.test_data.get("answers", {})
    correct_count = 0
    total_count = len(answers_map) if answers_map else 0
    question_scores = {}
    
    for q_id, correct_ans in answers_map.items():
        cand_ans = body.answers.get(q_id)
        if cand_ans is None:
            cand_ans = body.answers.get(str(q_id))
        if cand_ans and str(cand_ans).strip().upper() == str(correct_ans).strip().upper():
            correct_count += 1
            question_scores[str(q_id)] = 1
        else:
            question_scores[str(q_id)] = 0
            
    percentage = int((correct_count / total_count) * 100) if total_count > 0 else 0
    
    evaluation.scores = {
        "candidate_answers": body.answers,
        "question_scores": question_scores,
        "correct_answers": correct_count,
        "total_questions": total_count,
        "percentage": percentage,
        "questions": (token_row.test_data or {}).get("questions") or [],
        "answer_key": answers_map,
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
    current_user=Depends(require_roles(UserRole.ADMIN, UserRole.HO_HR, UserRole.LOCAL_HR)),
):
    evaluation = db.get(Evaluation, eval_id)
    if not evaluation:
        raise HTTPException(status_code=404, detail="Evaluation not found")
        
    candidate = db.get(Candidate, evaluation.candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
        
    vars_map = body.variables or {}
    if body.recipient_type == "INTERVIEWER":
        template_name = settings.whatsapp_interviewer_template_name
        placeholders = interviewer_placeholders(vars_map)
    elif evaluation.type == EvaluationType.TECHNICAL_TEST:
        template_name = settings.whatsapp_technical_test_template_name
        placeholders = technical_test_placeholders(vars_map)
    else:
        template_name = settings.whatsapp_hr_interview_template_name
        placeholders = hr_interview_placeholders(vars_map)

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
    except DoubleTickError as e:
        status_comm = CommunicationStatus.FAILED
        err_msg = e.user_message
    except Exception as e:
        status_comm = CommunicationStatus.FAILED
        err_msg = friendly_doubletick_error(str(e))

    content_lines = [
        f"Template: {template_name}",
        f"To: {body.to_phone}",
    ]
    for key, val in vars_map.items():
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



