from datetime import UTC, datetime
from pathlib import PurePosixPath
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload
import os

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_active_user, require_roles
from app.core.access import assert_candidate_access, get_candidate_for_user
from app.models.candidate import Candidate
from app.models.candidate_profile import CandidateProfile
from app.models.candidate_screening import CandidateScreening
from app.models.activity_log import ActivityLog
from app.models.document import Document
from app.models.enums import DocumentType, PipelineStage, UserRole, ActivityType, ScreeningStatus, FormStatus
from app.models.stage_history import StageHistory
from app.models.user import User
from app.models.communication import Communication
from app.models.enums import CommunicationType, CommunicationDirection, CommunicationStatus
from app.schemas.candidate import CandidateCreate, CandidateOut, DocumentOut, StageChange, StageHistoryOut, ActivityLogOut, CandidateScreeningOut, CandidateScreeningCreate, PreFormApplicationData, ScreeningSubmitResponse, CandidateProfileRawDataUpdate, WhatsAppInviteCreate
from app.services import storage
from app.services.workflow import WorkflowService
from app.services.doubletick import DoubleTickClient

router = APIRouter(prefix="/candidates", tags=["candidates"])

ALLOWED_RESUME_EXTENSIONS = {".pdf", ".doc", ".docx"}
ALLOWED_RESUME_CONTENT_TYPES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/octet-stream",
}
EXT_CONTENT_TYPES = {
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}


def next_candidate_id(db: Session) -> str:
    year = datetime.now(UTC).year
    prefix = f"NT-{year}-"
    last = db.scalar(select(func.max(Candidate.candidate_id)).where(Candidate.candidate_id.like(f"{prefix}%")))
    n = int(last.split("-")[-1]) + 1 if last else 1
    return f"{prefix}{n:05d}"


def resume_candidate_ids(db: Session, candidate_ids: list[UUID]) -> set[UUID]:
    if not candidate_ids:
        return set()
    rows = db.scalars(
        select(Document.candidate_id).where(
            Document.candidate_id.in_(candidate_ids),
            Document.doc_type == DocumentType.RESUME,
        )
    ).all()
    return set(rows)


def share_url_for_token(token: str | None) -> str | None:
    if not token:
        return None
    
    if os.environ.get("VERCEL"):
        base = "https://hr-recruit-demo.vercel.app"
    else:
        base = settings.public_app_url.rstrip("/")
        
    return f"{base}/#/pre-form/{token}"


def to_candidate_out(row: Candidate, has_resume: bool) -> CandidateOut:
    share_url = share_url_for_token(row.pre_form_token)
    return CandidateOut.model_validate(row).model_copy(
        update={"has_resume": has_resume, "is_rejoining": False, "share_url": share_url}
    )


def _issue_pre_form(db: Session, candidate: Candidate, user: User) -> None:
    import secrets

    if not candidate.pre_form_token:
        candidate.pre_form_token = secrets.token_urlsafe(32)
    candidate.pre_form_status = FormStatus.SENT
    candidate.pre_form_sent_at = datetime.now(UTC)

    if candidate.current_stage != PipelineStage.CANDIDATE_FORM:
        WorkflowService.transition(
            db=db,
            candidate=candidate,
            target_stage=PipelineStage.CANDIDATE_FORM,
            user=user,
            remarks="Screening accepted — pre-interview form issued",
        )
    else:
        db.add(
            ActivityLog(
                candidate_id=candidate.id,
                activity_type=ActivityType.FORM,
                title="Pre Form Sent",
                description="Pre-interview form link generated automatically.",
                created_by_user_id=user.id,
            )
        )


def _store_whatsapp_invite(
    db: Session,
    candidate: Candidate,
    body: CandidateScreeningCreate,
    user: User,
) -> None:
    profile = db.scalar(select(CandidateProfile).where(CandidateProfile.candidate_id == candidate.id))
    if not profile:
        profile = CandidateProfile(candidate_id=candidate.id)
        db.add(profile)

    visit_display = ""
    if body.branch_visit_date:
        visit_display = body.branch_visit_date.strftime("%A, %d %B %Y")

    invite = {
        "candidateName": candidate.full_name,
        "position": candidate.position_applied_for or "",
        "formLink": share_url_for_token(candidate.pre_form_token) or "",
        "branchName": body.visit_branch or candidate.branch_location or "",
        "visitDate": visit_display,
        "mapsLink": body.maps_link or "",
        "recruiterName": user.full_name,
        "extraInstructions": body.extra_instructions or "",
    }
    raw = dict(profile.raw_data or {})
    raw["whatsapp_invite"] = invite
    profile.raw_data = raw


def create_candidate(db: Session, body: CandidateCreate, user_id: UUID) -> Candidate:
    match = [Candidate.phone == body.phone]
    if body.email:
        match.append(Candidate.email == body.email)
    dup = db.scalar(select(Candidate).where(or_(*match)).limit(1))
    
    max_retries = 5
    for attempt in range(max_retries):
        try:
            row = Candidate(
                candidate_id=next_candidate_id(db),
                full_name=body.full_name,
                phone=body.phone,
                email=body.email,
                source=body.source,
                source_reference=body.source_reference,
                position_applied_for=body.position_applied_for,
                branch_location=body.branch_location,
                assigned_hr_user_id=body.assigned_hr_user_id,
                is_duplicate_flagged=dup is not None,
                duplicate_of_candidate_id=dup.id if dup else None,
                pre_form_status=FormStatus.NOT_SENT,
            )
            db.add(row)
            db.flush()
            
            screening = CandidateScreening(
                candidate_id=row.id,
                status=ScreeningStatus.PENDING,
            )
            db.add(screening)
            
            profile = CandidateProfile(candidate_id=row.id)
            db.add(profile)
            
            log_desc = "Candidate applied via public form." if user_id == body.assigned_hr_user_id and "public-apply" in str(user_id) else "Candidate created manually in SCREENING stage."
            # Since user_id is passed as UUID, we will just use a generic message
            log = ActivityLog(
                candidate_id=row.id,
                activity_type=ActivityType.SYSTEM,
                title="Candidate Created",
                description="Candidate record created.",
                created_by_user_id=user_id if user_id else None
            )
            db.add(log)
            
            db.add(StageHistory(candidate_id=row.id, to_stage=PipelineStage.SCREENING, changed_by_user_id=user_id))
            db.commit()
            db.refresh(row)
            return row
        except IntegrityError as e:
            db.rollback()
            # Check if the error is due to candidate_id unique constraint
            if "ix_candidates_candidate_id" in str(e) or "candidate_id" in str(e):
                if attempt < max_retries - 1:
                    continue  # Retry
                else:
                    raise HTTPException(status_code=500, detail="Failed to generate unique candidate ID after multiple attempts.")
            else:
                # Re-raise other integrity errors (e.g., duplicate phone/email)
                raise





def _resume_extension(filename: str | None) -> str:
    if not filename:
        raise HTTPException(status_code=400, detail="Filename is required.")
    ext = PurePosixPath(filename).suffix.lower()
    if ext not in ALLOWED_RESUME_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Resume must be a PDF, DOC, or DOCX file.")
    return ext


def _safe_filename(filename: str | None, ext: str) -> str:
    name = PurePosixPath(filename or f"resume{ext}").name
    name = name.replace("\x00", "").strip() or f"resume{ext}"
    if len(name) > 255:
        name = name[: 255 - len(ext)] + ext
    return name


def _validate_resume_content_type(content_type: str | None, ext: str) -> str:
    ct = (content_type or "").split(";")[0].strip().lower()
    if ct and ct not in ALLOWED_RESUME_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported resume content type.")
    if not ct or ct == "application/octet-stream":
        return EXT_CONTENT_TYPES[ext]
    return ct


async def _read_resume_bytes(file: UploadFile) -> bytes:
    max_bytes = settings.resume_max_bytes
    chunk = await file.read(max_bytes + 1)
    if not chunk:
        raise HTTPException(status_code=400, detail="Empty file.")
    if len(chunk) > max_bytes:
        raise HTTPException(status_code=400, detail="Resume must be 10 MB or smaller.")
    return chunk


def _validate_resume_magic(data: bytes, ext: str) -> None:
    if ext == ".pdf" and not data.startswith(b"%PDF"):
        raise HTTPException(status_code=400, detail="File content does not match a PDF.")
    if ext == ".doc" and not data.startswith(b"\xd0\xcf\x11\xe0"):
        raise HTTPException(status_code=400, detail="File content does not match a Word document.")
    if ext == ".docx" and not data.startswith(b"PK\x03\x04"):
        raise HTTPException(status_code=400, detail="File content does not match a Word document.")


def _get_resume_document(db: Session, candidate_id: UUID) -> Document | None:
    return db.scalar(
        select(Document).where(
            Document.candidate_id == candidate_id,
            Document.doc_type == DocumentType.RESUME,
        )
    )


def _document_out(doc: Document) -> DocumentOut:
    return DocumentOut(
        id=doc.id,
        candidate_id=doc.candidate_id,
        doc_type=doc.doc_type,
        file_name=doc.file_name,
        content_type=doc.content_type,
        file_size_bytes=doc.file_size_bytes,
        uploaded_by_user_id=doc.uploaded_by_user_id,
        created_at=doc.created_at,
        download_url=storage.create_signed_url(doc.storage_path),
    )


async def _save_resume_for_candidate(
    db: Session,
    candidate: Candidate,
    file: UploadFile,
    uploaded_by_user_id: UUID | None,
) -> DocumentOut:
    ext = _resume_extension(file.filename)
    content_type = _validate_resume_content_type(file.content_type, ext)
    data = await _read_resume_bytes(file)
    _validate_resume_magic(data, ext)

    candidate_id = candidate.id
    existing = _get_resume_document(db, candidate_id)
    old_path = existing.storage_path if existing else None
    doc_id = existing.id if existing else uuid4()
    storage_path = f"resumes/{candidate_id}/{doc_id}{ext}"
    file_name = _safe_filename(file.filename, ext)

    storage.upload_object(storage_path, data, content_type, upsert=True)

    if existing:
        existing.file_name = file_name
        existing.content_type = content_type
        existing.storage_path = storage_path
        existing.file_size_bytes = len(data)
        existing.uploaded_by_user_id = uploaded_by_user_id
        doc = existing
    else:
        doc = Document(
            id=doc_id,
            candidate_id=candidate_id,
            doc_type=DocumentType.RESUME,
            file_name=file_name,
            content_type=content_type,
            storage_path=storage_path,
            file_size_bytes=len(data),
            uploaded_by_user_id=uploaded_by_user_id,
        )
        db.add(doc)

    try:
        db.commit()
        db.refresh(doc)
    except Exception:
        db.rollback()
        if not existing or old_path != storage_path:
            storage.delete_object(storage_path)
        raise HTTPException(status_code=502, detail="Failed to save resume metadata.")

    if old_path and old_path != storage_path:
        storage.delete_object(old_path)

    return _document_out(doc)


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



@router.get("", response_model=list[CandidateOut])
def list_candidates(
    stage: PipelineStage | None = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.LOCAL_HR)),
):
    q = select(Candidate).options(joinedload(Candidate.profile)).order_by(Candidate.created_at.desc())
    if stage:
        q = q.where(Candidate.current_stage == stage)
    if user.role == UserRole.LOCAL_HR:
        q = q.where(Candidate.assigned_hr_user_id == user.id)
    
    q = q.offset(skip).limit(limit)
    rows = list(db.scalars(q).all())
    with_resume = resume_candidate_ids(db, [row.id for row in rows])
    return [to_candidate_out(row, row.id in with_resume) for row in rows]


@router.post("", response_model=CandidateOut, status_code=201)
def create(
    body: CandidateCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.LOCAL_HR)),
):
    if body.assigned_hr_user_id is None:
        body = body.model_copy(update={"assigned_hr_user_id": user.id})
    row = create_candidate(db, body, user.id)
    return to_candidate_out(row, False)


@router.get("/{id}", response_model=CandidateOut)
def get_one(
    id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.LOCAL_HR)),
):
    row = db.scalar(select(Candidate).options(joinedload(Candidate.profile)).where(Candidate.id == id))
    if not row:
        raise HTTPException(status_code=404, detail="Not found.")
    assert_candidate_access(user, row)
    return to_candidate_out(row, id in resume_candidate_ids(db, [id]))


@router.patch("/{id}/profile/raw_data", response_model=CandidateOut)
def update_profile_raw_data(
    id: UUID,
    body: CandidateProfileRawDataUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.LOCAL_HR)),
):
    row = db.scalar(select(Candidate).options(joinedload(Candidate.profile)).where(Candidate.id == id))
    if not row:
        raise HTTPException(status_code=404, detail="Not found.")
    assert_candidate_access(user, row)

    if not row.profile:
        row.profile = CandidateProfile(candidate_id=row.id, raw_data=body.raw_data)
        db.add(row.profile)
    else:
        # Merge dict or overwrite entirely? Since this is an edit of the whole form, overwrite.
        row.profile.raw_data = body.raw_data

    # Log the update
    log = ActivityLog(
        candidate_id=row.id,
        activity_type=ActivityType.NOTE,
        title="Application Form Updated",
        description=f"Candidate's pre-interview application form was manually updated by HR.",
        created_by_user_id=user.id,
    )
    db.add(log)
    db.commit()
    db.refresh(row)
    return to_candidate_out(row, id in resume_candidate_ids(db, [id]))


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


@router.post("/{id}/resume", response_model=DocumentOut, status_code=201)
async def upload_resume(
    id: UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.LOCAL_HR)),
):
    row = get_candidate_for_user(db, id, user)
    return await _save_resume_for_candidate(db, row, file, uploaded_by_user_id=user.id)


@router.get("/{id}/resume", response_model=DocumentOut)
def get_resume(
    id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.LOCAL_HR)),
):
    get_candidate_for_user(db, id, user)
    doc = _get_resume_document(db, id)
    if not doc:
        raise HTTPException(status_code=404, detail="Resume not found.")
    return _document_out(doc)


@router.post("/{id}/transition", response_model=CandidateOut)
def transition_stage(
    id: UUID,
    body: StageChange,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.LOCAL_HR)),
):
    row = get_candidate_for_user(db, id, user)
    updated = WorkflowService.transition(
        db=db,
        candidate=row,
        target_stage=body.to_stage,
        user=user,
        remarks=body.remarks
    )
    db.commit()
    db.refresh(updated)
    return to_candidate_out(updated, id in resume_candidate_ids(db, [id]))


@router.get("/{id}/stage-history", response_model=list[StageHistoryOut])
def history(
    id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.LOCAL_HR)),
):
    get_candidate_for_user(db, id, user)
    return list(db.scalars(select(StageHistory).where(StageHistory.candidate_id == id).order_by(StageHistory.created_at)))

@router.get("/{id}/activity-logs", response_model=list[ActivityLogOut])
def get_activity_logs(
    id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.LOCAL_HR)),
):
    get_candidate_for_user(db, id, user)
    return list(db.scalars(select(ActivityLog).where(ActivityLog.candidate_id == id).order_by(ActivityLog.created_at.desc())))

@router.get("/{id}/screening", response_model=CandidateScreeningOut)
def get_screening(
    id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.LOCAL_HR)),
):
    get_candidate_for_user(db, id, user)
    row = db.scalar(select(CandidateScreening).where(CandidateScreening.candidate_id == id))
    if not row:
        raise HTTPException(status_code=404, detail="Screening data not found.")
    return row

@router.post("/{id}/screening", response_model=ScreeningSubmitResponse)
def submit_screening(
    id: UUID,
    body: CandidateScreeningCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.LOCAL_HR)),
):
    candidate = get_candidate_for_user(db, id, user)
    screening = db.scalar(select(CandidateScreening).where(CandidateScreening.candidate_id == id))
    if not screening:
        screening = CandidateScreening(candidate_id=id)
        db.add(screening)

    screening.status = body.status
    screening.call_completed = body.call_completed
    screening.interest_confirmed = body.interest_confirmed
    screening.salary_discussed = body.salary_discussed
    screening.notice_period_discussed = body.notice_period_discussed
    screening.basic_eligibility_checked = body.basic_eligibility_checked
    screening.remarks = body.remarks
    screening.pending_reason = body.pending_reason
    screening.follow_up_date = body.follow_up_date
    screening.visit_branch = body.visit_branch
    screening.branch_visit_date = body.branch_visit_date
    screening.maps_link = body.maps_link
    screening.extra_instructions = body.extra_instructions

    log = ActivityLog(
        candidate_id=id,
        activity_type=ActivityType.CALL,
        title="Screening Updated",
        description=f"Status: {body.status.value}. Remarks: {body.remarks or 'None'}",
        created_by_user_id=user.id,
    )
    db.add(log)

    updated_candidate: Candidate | None = None
    if body.status == ScreeningStatus.QUALIFIED:
        _issue_pre_form(db, candidate, user)
        _store_whatsapp_invite(db, candidate, body, user)
        db.flush()
        db.refresh(candidate)
        updated_candidate = candidate

    db.commit()
    db.refresh(screening)
    if updated_candidate:
        db.refresh(updated_candidate)

    candidate_out = None
    if updated_candidate:
        candidate_out = to_candidate_out(updated_candidate, id in resume_candidate_ids(db, [id]))

    return ScreeningSubmitResponse(screening=screening, candidate=candidate_out)

@router.post("/{id}/pre-form/send", response_model=CandidateOut)
def send_pre_form(
    id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.LOCAL_HR)),
):
    row = get_candidate_for_user(db, id, user)
    _issue_pre_form(db, row, user)
    db.commit()
    db.refresh(row)
    return to_candidate_out(row, id in resume_candidate_ids(db, [id]))

@router.delete("/{id}", status_code=204)
def delete_candidate_endpoint(
    id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.LOCAL_HR)),
):
    row = get_candidate_for_user(db, id, user)
    
    # Try to delete documents from storage and db
    docs = db.scalars(select(Document).where(Document.candidate_id == id)).all()
    for doc in docs:
        if doc.storage_path:
            try:
                storage.delete_object(doc.storage_path)
            except Exception as e:
                print(f"Failed to delete {doc.storage_path}: {e}")
        db.delete(doc)
        
    # Delete stage histories
    histories = db.scalars(select(StageHistory).where(StageHistory.candidate_id == id)).all()
    for h in histories:
        db.delete(h)
        
    # Clear out any candidates marked as duplicates of this one
    duplicates = db.scalars(select(Candidate).where(Candidate.duplicate_of_candidate_id == id)).all()
    for dup in duplicates:
        dup.duplicate_of_candidate_id = None
        dup.is_duplicate_flagged = False
                
    db.delete(row)
    try:
        db.commit()
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail="Cannot delete candidate due to existing references.")


@router.post("/{id}/whatsapp-invite")
def send_whatsapp_invite(
    id: UUID,
    body: WhatsAppInviteCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.LOCAL_HR)),
):
    candidate = get_candidate_for_user(db, id, user)
    
    # Map variables in the correct order for the template nippon_pre_interview_invite
    DOUBLETICK_VARIABLE_KEYS = [
        "candidateName",
        "position",
        "formLink",
        "extraInstructions",
        "visitDate",
        "arrivalTime",
        "branchName",
        "mapsLink",
        "recruiterName",
    ]
    
    placeholders = []
    for key in DOUBLETICK_VARIABLE_KEYS:
        val = body.variables.get(key, "")
        placeholders.append(val)
        
    client = DoubleTickClient()
    
    try:
        res = client.send_template(
            to_phone=candidate.phone,
            template_name="nippon_pre_interview_invite",
            placeholders=placeholders,
        )
        external_message_id = None
        messages = res.get("messages", [])
        if messages:
            external_message_id = messages[0].get("id")
            
        status = CommunicationStatus.SENT
        err_msg = None
    except Exception as e:
        status = CommunicationStatus.FAILED
        err_msg = str(e)
        
    # Construct content preview
    content_lines = [
        f"Hello {body.variables.get('candidateName', '')},",
        "",
        f"Thank you for your interest in the *{body.variables.get('position', '')}* role at Nippon Toyota.",
        "",
        "Please complete your pre-interview form using the link below:",
        body.variables.get('formLink', ''),
        "",
        body.variables.get('extraInstructions', '').strip() or "Fill all sections carefully. Incomplete forms may delay your application.",
        "",
        f"Date: *{body.variables.get('visitDate', '')}*",
        f"Arrival time: *{body.variables.get('arrivalTime', '')}*",
        f"Location: *{body.variables.get('branchName', '')}*",
        "",
        "Google Maps:",
        body.variables.get('mapsLink', ''),
        "",
        "Regards,",
        body.variables.get('recruiterName', ''),
        "Nippon Toyota — HR Team"
    ]
    full_content = "\n".join(content_lines)
    
    comm = Communication(
        candidate_id=id,
        type=CommunicationType.WHATSAPP,
        direction=CommunicationDirection.OUTGOING,
        status=status,
        content_preview=full_content[:255],
        external_message_id=external_message_id,
        created_by=user.id
    )
    db.add(comm)
    
    activity_desc = f"Template: nippon_pre_interview_invite. Status: {status.value}."
    if err_msg:
        activity_desc += f" Error: {err_msg}"
        
    log = ActivityLog(
        candidate_id=id,
        activity_type=ActivityType.WHATSAPP,
        title="WhatsApp Invite Sent" if status == CommunicationStatus.SENT else "WhatsApp Invite Failed",
        description=activity_desc,
        created_by_user_id=user.id,
    )
    db.add(log)
    db.commit()
    
    if status == CommunicationStatus.FAILED:
        raise HTTPException(status_code=400, detail=f"Failed to send WhatsApp invite: {err_msg}")
        
    return {"status": "success", "message_id": external_message_id}

