from uuid import UUID

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import select

from app.core.deps import DbSession
from app.models.candidate import Candidate
from app.models.enums import PipelineStage
from app.models.stage_history import StageHistory
from app.schemas.candidate import (
    CandidateCreate,
    CandidateResponse,
    StageChangeRequest,
    StageHistoryResponse,
)
from app.services import candidate_service

router = APIRouter(prefix="/candidates", tags=["candidates"])


@router.get("", response_model=list[CandidateResponse])
def list_candidates(
    db: DbSession,
    stage: PipelineStage | None = None,
    limit: int = Query(50, ge=1, le=100),
) -> list[Candidate]:
    query = select(Candidate).order_by(Candidate.created_at.desc()).limit(limit)
    if stage:
        query = query.where(Candidate.current_stage == stage)
    return list(db.scalars(query).all())


@router.post("", response_model=CandidateResponse, status_code=201)
def create_candidate(payload: CandidateCreate, db: DbSession) -> Candidate:
    if not payload.assigned_hr_user_id:
        raise HTTPException(status_code=400, detail="assigned_hr_user_id is required for now.")

    return candidate_service.create_candidate(
        db,
        full_name=payload.full_name,
        phone=payload.phone,
        email=payload.email,
        source_channel=payload.source_channel,
        branch_location=payload.branch_location,
        application_data=payload.application_data,
        assigned_hr_user_id=payload.assigned_hr_user_id,
        changed_by_user_id=payload.assigned_hr_user_id,
    )


@router.get("/{candidate_id}", response_model=CandidateResponse)
def get_candidate(candidate_id: UUID, db: DbSession) -> Candidate:
    candidate = db.get(Candidate, candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found.")
    return candidate


@router.post("/{candidate_id}/stage", response_model=CandidateResponse)
def change_candidate_stage(
    candidate_id: UUID,
    payload: StageChangeRequest,
    db: DbSession,
) -> Candidate:
    candidate = db.get(Candidate, candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found.")

    return candidate_service.change_stage(
        db,
        candidate,
        to_stage=payload.to_stage,
        changed_by_user_id=payload.changed_by_user_id,
        reason=payload.reason,
    )


@router.get("/{candidate_id}/stage-history", response_model=list[StageHistoryResponse])
def get_stage_history(candidate_id: UUID, db: DbSession) -> list[StageHistory]:
    candidate = db.get(Candidate, candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found.")

    return list(
        db.scalars(
            select(StageHistory)
            .where(StageHistory.candidate_id == candidate_id)
            .order_by(StageHistory.created_at.asc())
        ).all()
    )
