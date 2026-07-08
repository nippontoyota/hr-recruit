from fastapi import APIRouter

from app.core.deps import DbSession
from app.models.candidate import Candidate
from app.schemas.candidate import CandidateCreate, CandidateResponse
from app.services import candidate_service

router = APIRouter(prefix="/applications", tags=["applications"])


@router.post("", response_model=CandidateResponse, status_code=201)
def submit_application(payload: CandidateCreate, db: DbSession) -> Candidate:
    """
    Intake endpoint for the Nippon Toyota recruitment application form.
    Called when a candidate submits the portal form — no HR login required.
    """
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
        changed_by_user_id=None,
    )
