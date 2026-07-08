import math
from uuid import UUID

from fastapi import APIRouter, Query
from sqlalchemy import func, select

from app.core.deps import CurrentUser, DbSession
from app.models.candidate import Candidate
from app.models.enums import PipelineStage, SourceChannel
from app.models.remark import Remark
from app.models.stage_history import StageHistory
from app.schemas.candidate import (
    CandidateCreate,
    CandidateResponse,
    CandidateUpdate,
    StageChangeRequest,
)
from app.schemas.common import PaginatedResponse
from app.schemas.remark import RemarkCreate, RemarkResponse
from app.schemas.stage_history import StageHistoryResponse
from app.services import candidate_service
from app.utils.exceptions import AppError

router = APIRouter(prefix="/candidates", tags=["candidates"])


def _get_candidate_or_404(db: DbSession, candidate_id: UUID) -> Candidate:
    candidate = db.get(Candidate, candidate_id)
    if not candidate:
        raise AppError("Candidate not found.", 404)
    return candidate


@router.get("", response_model=PaginatedResponse[CandidateResponse])
def list_candidates(
    db: DbSession,
    _user: CurrentUser,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    stage: PipelineStage | None = None,
    source: SourceChannel | None = None,
) -> PaginatedResponse[CandidateResponse]:
    query = select(Candidate)
    count_query = select(func.count()).select_from(Candidate)

    if stage:
        query = query.where(Candidate.current_stage == stage)
        count_query = count_query.where(Candidate.current_stage == stage)
    if source:
        query = query.where(Candidate.source_channel == source)
        count_query = count_query.where(Candidate.source_channel == source)

    total = db.scalar(count_query) or 0
    candidates = db.scalars(
        query.order_by(Candidate.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()

    return PaginatedResponse(
        items=candidates,
        total=total,
        page=page,
        page_size=page_size,
        pages=max(1, math.ceil(total / page_size)) if total else 1,
    )


@router.post("", response_model=CandidateResponse, status_code=201)
def create_candidate(
    payload: CandidateCreate,
    db: DbSession,
    user: CurrentUser,
) -> Candidate:
    return candidate_service.create_candidate(
        db,
        full_name=payload.full_name,
        phone=payload.phone,
        email=payload.email,
        date_of_birth=payload.date_of_birth,
        source_channel=payload.source_channel,
        branch_location=payload.branch_location,
        is_rejoining=payload.is_rejoining,
        application_data=payload.application_data,
        assigned_hr_user_id=payload.assigned_hr_user_id,
        notes_summary=payload.notes_summary,
        profile_completeness_pct=payload.profile_completeness_pct,
        current_stage=payload.current_stage,
        changed_by_user_id=user.id,
    )


@router.get("/{candidate_id}", response_model=CandidateResponse)
def get_candidate(
    candidate_id: UUID,
    db: DbSession,
    _user: CurrentUser,
) -> Candidate:
    return _get_candidate_or_404(db, candidate_id)


@router.patch("/{candidate_id}", response_model=CandidateResponse)
def update_candidate(
    candidate_id: UUID,
    payload: CandidateUpdate,
    db: DbSession,
    _user: CurrentUser,
) -> Candidate:
    candidate = _get_candidate_or_404(db, candidate_id)
    update_data = payload.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(candidate, field, value)

    db.commit()
    db.refresh(candidate)
    return candidate


@router.post("/{candidate_id}/stage", response_model=CandidateResponse)
def change_candidate_stage(
    candidate_id: UUID,
    payload: StageChangeRequest,
    db: DbSession,
    user: CurrentUser,
) -> Candidate:
    candidate = _get_candidate_or_404(db, candidate_id)
    return candidate_service.change_stage(
        db,
        candidate,
        to_stage=payload.to_stage,
        changed_by_user_id=user.id,
        reason=payload.reason,
    )


@router.get("/{candidate_id}/stage-history", response_model=list[StageHistoryResponse])
def get_stage_history(
    candidate_id: UUID,
    db: DbSession,
    _user: CurrentUser,
) -> list[StageHistory]:
    _get_candidate_or_404(db, candidate_id)
    return db.scalars(
        select(StageHistory)
        .where(StageHistory.candidate_id == candidate_id)
        .order_by(StageHistory.created_at.asc())
    ).all()


@router.post("/{candidate_id}/remarks", response_model=RemarkResponse, status_code=201)
def create_remark(
    candidate_id: UUID,
    payload: RemarkCreate,
    db: DbSession,
    user: CurrentUser,
) -> Remark:
    candidate = _get_candidate_or_404(db, candidate_id)
    return candidate_service.add_remark(
        db,
        candidate,
        stage_context=payload.stage_context,
        author_user_id=user.id,
        content=payload.content,
        scores=payload.scores,
    )


@router.get("/{candidate_id}/remarks", response_model=list[RemarkResponse])
def list_remarks(
    candidate_id: UUID,
    db: DbSession,
    _user: CurrentUser,
) -> list[Remark]:
    _get_candidate_or_404(db, candidate_id)
    return db.scalars(
        select(Remark)
        .where(Remark.candidate_id == candidate_id)
        .order_by(Remark.created_at.asc())
    ).all()
