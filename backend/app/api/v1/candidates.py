from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_active_user, require_roles
from app.models.candidate import Candidate
from app.models.enums import PipelineStage, UserRole
from app.models.stage_history import StageHistory
from app.models.user import User
from app.schemas.candidate import CandidateCreate, CandidateOut, StageChange, StageHistoryOut

router = APIRouter(prefix="/candidates", tags=["candidates"])


def next_candidate_id(db: Session) -> str:
    year = datetime.now(UTC).year
    prefix = f"NT-{year}-"
    last = db.scalar(select(func.max(Candidate.candidate_id)).where(Candidate.candidate_id.like(f"{prefix}%")))
    n = int(last.split("-")[-1]) + 1 if last else 1
    return f"{prefix}{n:05d}"


def create_candidate(db: Session, body: CandidateCreate, user_id: UUID) -> Candidate:
    match = [Candidate.phone == body.phone]
    if body.email:
        match.append(Candidate.email == body.email)
    dup = db.scalar(select(Candidate).where(or_(*match)).limit(1))

    row = Candidate(
        candidate_id=next_candidate_id(db),
        full_name=body.full_name,
        phone=body.phone,
        email=body.email,
        source_channel=body.source_channel,
        branch_location=body.branch_location,
        application_data=body.application_data or {},
        assigned_hr_user_id=body.assigned_hr_user_id,
        is_duplicate_flagged=dup is not None,
        duplicate_of_candidate_id=dup.id if dup else None,
    )
    db.add(row)
    db.flush()
    db.add(StageHistory(candidate_id=row.id, to_stage=PipelineStage.NEW_APPLICATION, changed_by_user_id=user_id))
    db.commit()
    db.refresh(row)
    return row


def change_stage(db: Session, row: Candidate, body: StageChange) -> Candidate:
    if row.current_stage == body.to_stage:
        raise HTTPException(status_code=400, detail="Already at that stage.")
    db.add(
        StageHistory(
            candidate_id=row.id,
            from_stage=row.current_stage,
            to_stage=body.to_stage,
            changed_by_user_id=body.changed_by_user_id,
            reason=body.reason,
        )
    )
    row.current_stage = body.to_stage
    db.commit()
    db.refresh(row)
    return row


@router.get("", response_model=list[CandidateOut])
def list_candidates(
    stage: PipelineStage | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.HEAD_OFFICE_HR, UserRole.ADMIN, UserRole.LOCAL_HR)),
):
    q = select(Candidate).order_by(Candidate.created_at.desc())
    if stage:
        q = q.where(Candidate.current_stage == stage)
    return list(db.scalars(q).all())


@router.post("", response_model=CandidateOut, status_code=201)
def create(
    body: CandidateCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_active_user),
):
    if body.assigned_hr_user_id is None:
        body = body.model_copy(update={"assigned_hr_user_id": user.id})
    return create_candidate(db, body, user.id)


@router.get("/{id}", response_model=CandidateOut)
def get_one(
    id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    row = db.get(Candidate, id)
    if not row:
        raise HTTPException(status_code=404, detail="Not found.")
    return row


@router.post("/{id}/stage", response_model=CandidateOut)
def move_stage(
    id: UUID,
    body: StageChange,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_active_user),
):
    row = db.get(Candidate, id)
    if not row:
        raise HTTPException(status_code=404, detail="Not found.")
    payload = body.model_copy(update={"changed_by_user_id": user.id})
    return change_stage(db, row, payload)


@router.get("/{id}/stage-history", response_model=list[StageHistoryOut])
def history(
    id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    if not db.get(Candidate, id):
        raise HTTPException(status_code=404, detail="Not found.")
    return list(db.scalars(select(StageHistory).where(StageHistory.candidate_id == id).order_by(StageHistory.created_at)))
