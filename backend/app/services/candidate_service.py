import uuid

from fastapi import HTTPException
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models.candidate import Candidate
from app.models.enums import PipelineStage, SourceChannel
from app.models.stage_history import StageHistory
from app.services.candidate_id import generate_candidate_id


def find_duplicate(db: Session, phone: str, email: str | None) -> Candidate | None:
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
    application_data: dict | None = None,
    assigned_hr_user_id: uuid.UUID | None = None,
    changed_by_user_id: uuid.UUID,
) -> Candidate:
    duplicate_match = find_duplicate(db, phone, email)

    candidate = Candidate(
        candidate_id=generate_candidate_id(db),
        full_name=full_name,
        phone=phone,
        email=email,
        source_channel=source_channel,
        branch_location=branch_location,
        application_data=application_data or {},
        assigned_hr_user_id=assigned_hr_user_id,
        is_duplicate_flagged=duplicate_match is not None,
        duplicate_of_candidate_id=duplicate_match.id if duplicate_match else None,
        current_stage=PipelineStage.NEW_APPLICATION,
    )
    db.add(candidate)
    db.flush()

    db.add(
        StageHistory(
            candidate_id=candidate.id,
            from_stage=None,
            to_stage=PipelineStage.NEW_APPLICATION,
            changed_by_user_id=changed_by_user_id,
            reason="Application created",
        )
    )
    db.commit()
    db.refresh(candidate)
    return candidate


def change_stage(
    db: Session,
    candidate: Candidate,
    to_stage: PipelineStage,
    changed_by_user_id: uuid.UUID,
    reason: str | None = None,
) -> Candidate:
    if candidate.current_stage == to_stage:
        raise HTTPException(status_code=400, detail=f"Candidate is already at stage {to_stage.value}.")

    db.add(
        StageHistory(
            candidate_id=candidate.id,
            from_stage=candidate.current_stage,
            to_stage=to_stage,
            changed_by_user_id=changed_by_user_id,
            reason=reason,
        )
    )
    candidate.current_stage = to_stage
    db.commit()
    db.refresh(candidate)
    return candidate
