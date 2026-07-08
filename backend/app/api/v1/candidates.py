from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.candidate import Candidate
from app.models.enums import PipelineStage, SourceChannel
from app.models.stage_history import StageHistory
from app.schemas.candidate import (
    CandidateCreate,
    CandidateResponse,
    StageChangeRequest,
    StageHistoryResponse,
)

router = APIRouter(prefix="/candidates", tags=["candidates"])


def next_candidate_id(db: Session) -> str:
    year = datetime.now(UTC).year
    prefix = f"NT-{year}-"
    last_id = db.scalar(
        select(func.max(Candidate.candidate_id)).where(Candidate.candidate_id.like(f"{prefix}%"))
    )
    seq = int(last_id.split("-")[-1]) + 1 if last_id else 1
    return f"{prefix}{seq:05d}"


def create_candidate(db: Session, payload: CandidateCreate, changed_by_user_id: UUID) -> Candidate:
    filters = [Candidate.phone == payload.phone]
    if payload.email:
        filters.append(Candidate.email == payload.email)
    duplicate = db.scalar(select(Candidate).where(or_(*filters)).limit(1))

    candidate = Candidate(
        candidate_id=next_candidate_id(db),
        full_name=payload.full_name,
        phone=payload.phone,
        email=payload.email,
        source_channel=payload.source_channel,
        branch_location=payload.branch_location,
        application_data=payload.application_data or {},
        assigned_hr_user_id=payload.assigned_hr_user_id,
        is_duplicate_flagged=duplicate is not None,
        duplicate_of_candidate_id=duplicate.id if duplicate else None,
    )
    db.add(candidate)
    db.flush()
    db.add(
        StageHistory(
            candidate_id=candidate.id,
            from_stage=None,
            to_stage=PipelineStage.NEW_APPLICATION,
            changed_by_user_id=changed_by_user_id,
        )
    )
    db.commit()
    db.refresh(candidate)
    return candidate


def change_stage(
    db: Session,
    candidate: Candidate,
    to_stage: PipelineStage,
    changed_by_user_id: UUID,
    reason: str | None = None,
) -> Candidate:
    if candidate.current_stage == to_stage:
        raise HTTPException(status_code=400, detail="Already at that stage.")

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


@router.get("", response_model=list[CandidateResponse])
def list_candidates(
    db: Session = Depends(get_db),
    stage: PipelineStage | None = None,
    limit: int = Query(50, ge=1, le=100),
):
    q = select(Candidate).order_by(Candidate.created_at.desc()).limit(limit)
    if stage:
        q = q.where(Candidate.current_stage == stage)
    return list(db.scalars(q).all())


@router.post("", response_model=CandidateResponse, status_code=201)
def post_candidate(payload: CandidateCreate, db: Session = Depends(get_db)):
    if not payload.assigned_hr_user_id:
        raise HTTPException(status_code=400, detail="assigned_hr_user_id required.")
    return create_candidate(db, payload, payload.assigned_hr_user_id)


@router.get("/{candidate_id}", response_model=CandidateResponse)
def get_candidate(candidate_id: UUID, db: Session = Depends(get_db)):
    candidate = db.get(Candidate, candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Not found.")
    return candidate


@router.post("/{candidate_id}/stage", response_model=CandidateResponse)
def post_stage(candidate_id: UUID, payload: StageChangeRequest, db: Session = Depends(get_db)):
    candidate = db.get(Candidate, candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Not found.")
    return change_stage(db, candidate, payload.to_stage, payload.changed_by_user_id, payload.reason)


@router.get("/{candidate_id}/stage-history", response_model=list[StageHistoryResponse])
def get_stage_history(candidate_id: UUID, db: Session = Depends(get_db)):
    if not db.get(Candidate, candidate_id):
        raise HTTPException(status_code=404, detail="Not found.")
    return list(
        db.scalars(
            select(StageHistory)
            .where(StageHistory.candidate_id == candidate_id)
            .order_by(StageHistory.created_at)
        ).all()
    )
