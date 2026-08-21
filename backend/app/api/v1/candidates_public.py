import json
from datetime import UTC, datetime
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, Request
from starlette.datastructures import UploadFile as StarletteUploadFile
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.public_token import (
    PURPOSE_APPLY,
    PURPOSE_PRE_FORM,
    candidate_by_public_token,
    log_public_change,
    pre_form_accepts_uploads,
    pre_form_fillable,
)
from app.models.candidate import Candidate
from app.models.candidate_profile import CandidateProfile
from app.models.enums import PipelineStage, UserRole, FormStatus
from app.models.user import User
from app.schemas.candidate import (
    CandidateCreate,
    PreFormApplicationData,
    PublicCandidateOut,
    PublicFullStatusOut,
    PublicUploadOut,
)

router = APIRouter(prefix="/candidates", tags=["candidates"])

from app.services.candidate_service import create_candidate
from app.services.document_service import save_resume_for_candidate, save_photo_for_candidate, resume_candidate_ids
from uuid import UUID
from sqlalchemy import select


def _public_out(row: Candidate, db: Session, *, token: str | None = None) -> PublicCandidateOut:
    return PublicCandidateOut(
        full_name=row.full_name,
        phone=row.phone,
        email=row.email,
        source=row.source,
        position_applied_for=row.position_applied_for,
        experience=row.experience,
        has_resume=row.id in resume_candidate_ids(db, [row.id]),
        token=token,
    )


@router.post("/public-apply", response_model=PublicCandidateOut, status_code=201)
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
    return _public_out(row, db, token=row.pre_form_token)


@router.get("/public-basic/{token}", response_model=PublicCandidateOut)
def public_basic(
    token: str,
    db: Session = Depends(get_db),
):
    row = candidate_by_public_token(db, token, PURPOSE_APPLY)
    if row.current_stage != PipelineStage.SCREENING:
        raise HTTPException(status_code=400, detail="Candidate is not in basic phase.")
    return _public_out(row, db)


@router.post("/public-update-basic/{token}", response_model=PublicCandidateOut)
def public_update_basic(
    token: str,
    body: CandidateCreate,
    db: Session = Depends(get_db),
):
    row = candidate_by_public_token(db, token, PURPOSE_APPLY)
    if row.current_stage != PipelineStage.SCREENING:
        raise HTTPException(status_code=400, detail="Candidate basic details can only be updated in SCREENING stage.")
    
    row.full_name = body.full_name
    row.phone = body.phone
    row.email = body.email
    row.source = body.source
    row.experience = body.experience
    if body.position_applied_for:
        row.position_applied_for = body.position_applied_for
    if body.branch_location:
        row.branch_location = body.branch_location
    log_public_change(db, row, "Public basic details updated", "Candidate updated registration details via public form.")
    db.commit()
    db.refresh(row)
    return _public_out(row, db)


_UNSET_WHATSAPP_POSITIONS = {"", "unknown", "unknown position", "the applied"}


@router.get("/public-full-status/{token}", response_model=PublicFullStatusOut)
def public_full_status(
    token: str,
    db: Session = Depends(get_db),
):
    row = candidate_by_public_token(db, token, PURPOSE_PRE_FORM)
    if row.pre_form_status in (FormStatus.SENT, FormStatus.NOT_SENT):
        row.pre_form_status = FormStatus.VIEWED
        db.commit()
        db.refresh(row)
    pos = (
        row.position_applied_for
        if row.position_applied_for and row.position_applied_for.lower() not in _UNSET_WHATSAPP_POSITIONS
        else None
    )
    return PublicFullStatusOut(
        full_name=row.full_name,
        is_awaiting_full_fill=pre_form_fillable(row),
        pre_form_status=row.pre_form_status,
        pre_form_expires_at=row.pre_form_expires_at,
        position_applied_for=pos,
        branch_location=row.branch_location,
    )

@router.post("/public-apply-full/{token}", response_model=PublicCandidateOut)
async def public_apply_full(
    token: str,
    request: Request,
    db: Session = Depends(get_db),
):
    content_type = request.headers.get("content-type", "")
    resume_file: UploadFile | None = None
    photo_file: UploadFile | None = None
    
    if content_type.startswith("multipart/form-data"):
        form = await request.form()
        data_val = form.get("data")
        if not data_val or not isinstance(data_val, str):
            raise HTTPException(status_code=422, detail="Missing application data payload.")
        try:
            raw_payload = json.loads(data_val)
        except Exception:
            raise HTTPException(status_code=422, detail="Invalid JSON in application data.")
        body = PreFormApplicationData.model_validate(raw_payload)
        
        resume_val = form.get("resume")
        if isinstance(resume_val, StarletteUploadFile) and resume_val.filename:
            resume_file = resume_val

        photo_val = form.get("photo")
        if isinstance(photo_val, StarletteUploadFile) and photo_val.filename:
            photo_file = photo_val
    else:
        raw_payload = await request.json()
        body = PreFormApplicationData.model_validate(raw_payload)

    application_data = body.model_dump()
    row = candidate_by_public_token(db, token, PURPOSE_PRE_FORM)
    if not pre_form_fillable(row):
        raise HTTPException(status_code=400, detail="This form is not open for submission.")
    
    if resume_file:
        await save_resume_for_candidate(db, row, resume_file, uploaded_by_user_id=None)
    if photo_file:
        await save_photo_for_candidate(db, row, photo_file)
        
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

    name_val = str(application_data.get("nameAadhaar") or "").strip()
    if name_val:
        row.full_name = name_val

    if application_data.get("positionAppliedFor") and str(application_data["positionAppliedFor"]).lower() not in _UNSET_WHATSAPP_POSITIONS:
        row.position_applied_for = str(application_data["positionAppliedFor"]).strip()
    elif row.position_applied_for and row.position_applied_for.lower() not in _UNSET_WHATSAPP_POSITIONS:
        application_data["positionAppliedFor"] = row.position_applied_for

    email_val = (
        str(application_data.get("emailId") or application_data.get("email") or "").strip()
        or None
    )
    if email_val:
        row.email = email_val
        profile.email = email_val

    existing_raw = dict(profile.raw_data or {})
    whatsapp_invite = existing_raw.get("whatsapp_invite")
    profile.raw_data = {**existing_raw, **application_data}
    if whatsapp_invite:
        profile.raw_data["whatsapp_invite"] = whatsapp_invite
    
    row.pre_form_status = FormStatus.SUBMITTED
    row.pre_form_submitted_at = datetime.now(UTC)
    log_public_change(db, row, "Pre Form Submitted", "Candidate submitted the pre-interview form.")
    db.commit()
    db.refresh(row)
    return _public_out(row, db)


@router.post("/public-resume/{token}", response_model=PublicUploadOut, status_code=201)
async def public_upload_resume(
    token: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    row = candidate_by_public_token(db, token, PURPOSE_APPLY, PURPOSE_PRE_FORM)
    purpose = row.pre_form_token_purpose or PURPOSE_PRE_FORM
    if purpose == PURPOSE_APPLY:
        if row.current_stage not in (PipelineStage.SCREENING, PipelineStage.CALL_LETTER):
            raise HTTPException(status_code=400, detail="Resume upload is only allowed during screening.")
    elif not pre_form_accepts_uploads(row):
        raise HTTPException(status_code=400, detail="Resume upload is not available for this form link.")
    saved = await save_resume_for_candidate(db, row, file, uploaded_by_user_id=None)
    log_public_change(db, row, "Public resume uploaded", "Candidate uploaded a resume via public form.")
    db.commit()
    return PublicUploadOut(file_name=saved.file_name)

@router.post("/public-photo/{token}", response_model=PublicUploadOut, status_code=201)
async def public_upload_photo(
    token: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    row = candidate_by_public_token(db, token, PURPOSE_PRE_FORM)
    if not pre_form_accepts_uploads(row):
        raise HTTPException(status_code=400, detail="Photo upload is not available for this form link.")
    saved = await save_photo_for_candidate(db, row, file)
    log_public_change(db, row, "Public photo uploaded", "Candidate uploaded a photo via public form.")
    db.commit()
    return PublicUploadOut(photo_url=saved.get("photo_url") or "")
