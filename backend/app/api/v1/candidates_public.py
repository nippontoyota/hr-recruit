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

from .candidates_core import *
from .candidates_core import (
    _save_resume_for_candidate
)

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
        "full_name": row.full_name,
        "is_awaiting_full_fill": row.current_stage == PipelineStage.CANDIDATE_FORM and row.pre_form_status in (FormStatus.SENT, FormStatus.VIEWED)
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
    if row.current_stage != PipelineStage.CANDIDATE_FORM:
        raise HTTPException(status_code=400, detail="Candidate is not in CANDIDATE_FORM stage.")
    profile = db.scalar(select(CandidateProfile).where(CandidateProfile.candidate_id == row.id))
    if not profile:
        profile = CandidateProfile(candidate_id=row.id)
        db.add(profile)
    
    # Update profile fields from application_data
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
    if row.current_stage != PipelineStage.SCREENING:
        raise HTTPException(status_code=400, detail="Resume upload is only allowed during screening.")
    return await _save_resume_for_candidate(db, row, file, uploaded_by_user_id=None)

@router.get("/public-post-form/{token}")
def public_get_post_form(token: str, db: Session = Depends(get_db)):
    from app.models.activity import ActivityLog
    from datetime import datetime, UTC
    row = db.scalar(select(Candidate).where(Candidate.post_form_token == token))
    if not row:
        raise HTTPException(status_code=404, detail="Invalid token.")
    
    if row.post_form_status == FormStatus.SENT:
        row.post_form_status = FormStatus.VIEWED
        db.add(ActivityLog(
            candidate_id=row.id,
            activity_type=ActivityType.FORM,
            title="Post Form Viewed",
            description="Candidate opened the post-interview form link.",
            created_by_user_id=None
        ))
        db.commit()
    
    profile = db.scalar(select(CandidateProfile).where(CandidateProfile.candidate_id == row.id))
    raw_data = profile.raw_data if profile and profile.raw_data else {}
    
    return {
        "candidate": {
            "full_name": row.full_name,
            "phone": row.phone,
            "email": row.email,
            "position_applied_for": row.position_applied_for
        },
        "raw_data": raw_data,
        "is_submitted": row.post_form_status == FormStatus.SUBMITTED
    }

@router.post("/public-post-form/{token}", response_model=CandidateOut)
def public_submit_post_form(
    token: str,
    body: dict,
    db: Session = Depends(get_db)
):
    from app.models.activity_log import ActivityLog
    from datetime import datetime, UTC
    
    row = db.scalar(select(Candidate).where(Candidate.post_form_token == token))
    if not row:
        raise HTTPException(status_code=404, detail="Invalid token.")
    
    profile = db.scalar(select(CandidateProfile).where(CandidateProfile.candidate_id == row.id))
    if not profile:
        profile = CandidateProfile(candidate_id=row.id)
        db.add(profile)
        
    # Merge incoming data into existing raw_data
    existing_raw = dict(profile.raw_data or {})
    profile.raw_data = {**existing_raw, **body}
    
    row.post_form_status = FormStatus.SUBMITTED
    row.post_form_submitted_at = datetime.now(UTC)
    
    db.add(ActivityLog(
        candidate_id=row.id,
        activity_type=ActivityType.FORM,
        title="Post Form Submitted",
        description="Candidate submitted the post-interview form.",
        created_by_user_id=None
    ))
    
    db.commit()
    db.refresh(row)
    return to_candidate_out(row, row.id in resume_candidate_ids(db, [row.id]))
