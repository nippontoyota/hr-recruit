from datetime import UTC, datetime
from uuid import UUID
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.candidate import Candidate
from app.models.candidate_profile import CandidateProfile
from app.models.activity_log import ActivityLog
from app.models.enums import PipelineStage, UserRole, ActivityType, FormStatus
from app.models.user import User
from app.schemas.candidate import CandidateCreate, CandidateOut, DocumentOut, PreFormApplicationData

router = APIRouter(prefix="/candidates", tags=["candidates"])

from app.services.candidate_service import create_candidate, to_candidate_out
from app.services.document_service import save_resume_for_candidate, save_photo_for_candidate, resume_candidate_ids

@router.post("/public-apply", response_model=CandidateOut, status_code=201)
def public_apply(
    body: CandidateCreate,
    hr_id: UUID,
    db: Session = Depends(get_db),
):
    hr_user = db.get(User, hr_id)
    if not hr_user or hr_user.role != UserRole.LOCAL_HR:
        raise HTTPException(status_code=400, detail="Invalid HR recruiter ID.")
    
    body = body.model_copy(update={"assigned_hr_user_id": hr_id})
    row = create_candidate(db, body, hr_id)
    return to_candidate_out(row, False)


@router.get("/public-basic/{candidate_id}", response_model=CandidateOut)
def public_basic(
    candidate_id: UUID,
    db: Session = Depends(get_db),
):
    row = db.get(Candidate, candidate_id)
    if not row:
        raise HTTPException(status_code=404, detail="Candidate not found.")
    if row.current_stage != PipelineStage.SCREENING:
        raise HTTPException(status_code=400, detail="Candidate is not in basic phase.")
    return to_candidate_out(row, candidate_id in resume_candidate_ids(db, [candidate_id]))


@router.post("/public-update-basic/{candidate_id}", response_model=CandidateOut)
def public_update_basic(
    candidate_id: UUID,
    body: CandidateCreate,
    db: Session = Depends(get_db),
):
    row = db.get(Candidate, candidate_id)
    if not row:
        raise HTTPException(status_code=404, detail="Candidate not found.")
    if row.current_stage != PipelineStage.SCREENING:
        raise HTTPException(status_code=400, detail="Candidate basic details can only be updated in SCREENING stage.")
    
    row.full_name = body.full_name
    row.phone = body.phone
    row.email = body.email
    row.source = body.source
    if body.branch_location:
        row.branch_location = body.branch_location
    
    db.commit()
    db.refresh(row)
    return to_candidate_out(row, candidate_id in resume_candidate_ids(db, [candidate_id]))


@router.get("/public-full-status/{token}", response_model=dict)
def public_full_status(
    token: str,
    db: Session = Depends(get_db),
):
    row = db.scalar(select(Candidate).where(Candidate.pre_form_token == token))
    if not row:
        raise HTTPException(status_code=404, detail="Invalid token or candidate not found.")
    return {
        "candidate_id": row.id,
        "full_name": row.full_name,
        "is_awaiting_full_fill": row.current_stage == PipelineStage.CALL_LETTER and row.pre_form_status in (FormStatus.SENT, FormStatus.VIEWED)
    }

@router.post("/public-apply-full/{token}", response_model=CandidateOut)
def public_apply_full(
    token: str,
    body: PreFormApplicationData,
    db: Session = Depends(get_db),
):
    application_data = body.model_dump()
    row = db.scalar(select(Candidate).where(Candidate.pre_form_token == token))
    if not row:
        raise HTTPException(status_code=404, detail="Invalid token or candidate not found.")
    if row.current_stage != PipelineStage.CALL_LETTER:
        raise HTTPException(status_code=400, detail="Candidate is not in CALL_LETTER stage.")
    profile = db.scalar(select(CandidateProfile).where(CandidateProfile.candidate_id == row.id))
    if not profile:
        profile = CandidateProfile(candidate_id=row.id)
        db.add(profile)
    
    if application_data.get("permDistrict"):
        profile.current_location = application_data["permDistrict"]
    
    profile.experience_level = "Experienced" if application_data.get("previousExperience") else "Fresher"
    
    if application_data.get("totalExperience"):
        profile.total_experience = application_data["totalExperience"]
    if application_data.get("prevCompanyName"):
        profile.current_company = application_data["prevCompanyName"]
    if application_data.get("expectedSalary"):
        profile.expected_salary = application_data["expectedSalary"]
    if application_data.get("expectedJoiningDate"):
        profile.joining_date = application_data["expectedJoiningDate"]

    existing_raw = dict(profile.raw_data or {})
    whatsapp_invite = existing_raw.get("whatsapp_invite")
    profile.raw_data = {**existing_raw, **application_data}
    if whatsapp_invite:
        profile.raw_data["whatsapp_invite"] = whatsapp_invite
    
    row.pre_form_status = FormStatus.SUBMITTED
    row.pre_form_submitted_at = datetime.now(UTC)
    
    db.add(ActivityLog(
        candidate_id=row.id,
        activity_type=ActivityType.FORM,
        title="Pre Form Submitted",
        description="Candidate submitted the pre-interview form.",
        created_by_user_id=None
    ))
    
    db.commit()
    db.refresh(row)
    return to_candidate_out(row, row.id in resume_candidate_ids(db, [row.id]))



@router.post("/public-resume/{candidate_id}", response_model=DocumentOut, status_code=201)
async def public_upload_resume(
    candidate_id: UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    row = db.get(Candidate, candidate_id)
    if not row:
        raise HTTPException(status_code=404, detail="Not found.")
    if row.current_stage not in (PipelineStage.SCREENING, PipelineStage.CALL_LETTER):
        raise HTTPException(status_code=400, detail="Resume upload is only allowed during screening or call letter stages.")
    return await save_resume_for_candidate(db, row, file, uploaded_by_user_id=None)

@router.post("/public-photo/{candidate_id}", response_model=dict, status_code=201)
async def public_upload_photo(
    candidate_id: UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    row = db.get(Candidate, candidate_id)
    if not row:
        raise HTTPException(status_code=404, detail="Not found.")
    if row.current_stage != PipelineStage.CALL_LETTER:
        raise HTTPException(status_code=400, detail="Photo upload is only allowed during the call letter stage.")
    return await save_photo_for_candidate(db, row, file)
