import uuid

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models.candidate import Candidate
from app.models.enums import PipelineStage, SourceChannel, UserRole
from app.models.remark import Remark
from app.models.stage_history import StageHistory
from app.models.user import User
from app.services.candidate_id import generate_candidate_id
from app.utils.exceptions import AppError


def find_duplicate(db: Session, phone: str, email: str | None) -> Candidate | None:
    """
    Check if phone or email already exists.
    We flag the new record but never auto-merge — HR decides what to do.
    """
    conditions = [Candidate.phone == phone]
    if email:
        conditions.append(Candidate.email == email)

    return db.scalar(select(Candidate).where(or_(*conditions)).limit(1))


def create_candidate(
    db: Session,
    *,
    full_name: str,
    phone: str,
    email: str | None,
    source_channel: SourceChannel,
    branch_location: str | None = None,
    date_of_birth=None,
    is_rejoining: bool = False,
    application_data: dict | None = None,
    assigned_hr_user_id: uuid.UUID | None = None,
    notes_summary: str | None = None,
    profile_completeness_pct: int | None = None,
    current_stage: PipelineStage = PipelineStage.NEW_APPLICATION,
    changed_by_user_id: uuid.UUID | None = None,
) -> Candidate:
    duplicate_match = find_duplicate(db, phone, email)

    candidate = Candidate(
        candidate_id=generate_candidate_id(db),
        full_name=full_name,
        phone=phone,
        email=email,
        date_of_birth=date_of_birth,
        source_channel=source_channel,
        is_rejoining=is_rejoining,
        is_duplicate_flagged=duplicate_match is not None,
        duplicate_of_candidate_id=duplicate_match.id if duplicate_match else None,
        current_stage=current_stage,
        branch_location=branch_location,
        application_data=application_data or {},
        assigned_hr_user_id=assigned_hr_user_id,
        notes_summary=notes_summary,
        profile_completeness_pct=profile_completeness_pct,
    )
    db.add(candidate)
    db.flush()

    history = StageHistory(
        candidate_id=candidate.id,
        from_stage=None,
        to_stage=current_stage,
        changed_by_user_id=changed_by_user_id or _fallback_system_user_id(db),
        reason="Application created",
    )
    db.add(history)
    db.commit()
    db.refresh(candidate)
    return candidate


def _fallback_system_user_id(db: Session) -> uuid.UUID:
    """Used when no authenticated user is available (e.g. seed data)."""
    admin = db.scalar(select(User).where(User.role == UserRole.ADMIN).limit(1))
    if not admin:
        raise AppError("No admin user found to attribute stage changes.", 500)
    return admin.id


def change_stage(
    db: Session,
    candidate: Candidate,
    to_stage: PipelineStage,
    changed_by_user_id: uuid.UUID,
    reason: str | None = None,
) -> Candidate:
    if candidate.current_stage == to_stage:
        raise AppError(f"Candidate is already at stage {to_stage.value}.")

    history = StageHistory(
        candidate_id=candidate.id,
        from_stage=candidate.current_stage,
        to_stage=to_stage,
        changed_by_user_id=changed_by_user_id,
        reason=reason,
    )
    candidate.current_stage = to_stage
    db.add(history)
    db.commit()
    db.refresh(candidate)
    return candidate


def add_remark(
    db: Session,
    candidate: Candidate,
    *,
    stage_context,
    author_user_id: uuid.UUID,
    content: str,
    scores: dict | None = None,
) -> Remark:
    remark = Remark(
        candidate_id=candidate.id,
        stage_context=stage_context,
        author_user_id=author_user_id,
        content=content,
        scores=scores,
    )
    db.add(remark)
    db.commit()
    db.refresh(remark)
    return remark
