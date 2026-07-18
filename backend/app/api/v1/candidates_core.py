from datetime import UTC, datetime
from pathlib import PurePosixPath
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy import or_, select, cast, String, func
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
from app.schemas.candidate import CandidateCreate, CandidateOut, DocumentOut, CandidateScreeningCreate, CandidateProfileRawDataUpdate
from app.services import storage
from app.services.workflow import transition

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
    from app.core.config import settings
    share_url = share_url_for_token(row.pre_form_token)
    post_share_url = f"{settings.public_app_url}/#/post-form/{row.post_form_token}" if row.post_form_token else None
    return CandidateOut.model_validate(row).model_copy(
        update={"has_resume": has_resume, "is_rejoining": False, "share_url": share_url, "post_share_url": post_share_url}
    )


def _issue_pre_form(db: Session, candidate: Candidate, user: User) -> None:
    from app.core.security import generate_secure_token

    if not candidate.pre_form_token:
        candidate.pre_form_token = generate_secure_token()
    candidate.pre_form_status = FormStatus.SENT
    candidate.pre_form_sent_at = datetime.now(UTC)

    if candidate.current_stage != PipelineStage.CANDIDATE_FORM:
        transition(
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

def _issue_post_form(db: Session, candidate: Candidate, user: User) -> None:
    from app.core.security import generate_secure_token
    from datetime import datetime, UTC
    from app.models.enums import FormStatus, ActivityType
    from app.models.activity_log import ActivityLog

    if not candidate.post_form_token:
        candidate.post_form_token = generate_secure_token()
    candidate.post_form_status = FormStatus.SENT
    candidate.post_form_sent_at = datetime.now(UTC)

    db.add(
        ActivityLog(
            candidate_id=candidate.id,
            activity_type=ActivityType.FORM,
            title="Post Form Sent",
            description="Post-interview form link generated automatically.",
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


def create_candidate(db: Session, body: CandidateCreate, user_id: UUID | None, created_via_public_apply: bool = False) -> Candidate:
    match = [Candidate.phone == body.phone]
    if body.email:
        match.append(Candidate.email == body.email)
    dup = db.scalar(select(Candidate).where(or_(*match)).limit(1))
    
    try:
        row = Candidate(
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
        
        log_desc = "Candidate applied via public form." if created_via_public_apply else "Candidate created manually in SCREENING stage."
        log = ActivityLog(
            candidate_id=row.id,
            activity_type=ActivityType.SYSTEM,
            title="Candidate Created",
            description=log_desc,
            created_by_user_id=user_id if user_id else None
        )
        db.add(log)
        
        db.add(StageHistory(candidate_id=row.id, to_stage=PipelineStage.SCREENING, changed_by_user_id=user_id))
        db.commit()
        db.refresh(row)
        return row
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Database integrity error. Check if a candidate with this phone/email already exists.")





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


@router.get("", response_model=list[CandidateOut])
def list_candidates(
    stage: PipelineStage | None = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(
        UserRole.COMPANY_HR_HEAD, UserRole.SUPER_ADMIN, UserRole.ADMIN,
        UserRole.BRANCH_HR, UserRole.DEPT_HEAD, UserRole.BRANCH_VP,
        UserRole.SERVICE_VP, UserRole.FINANCE, UserRole.HQ_HR,
        UserRole.HQ_STAFF, UserRole.LOCAL_HR
    )),
):
    q = select(Candidate).options(joinedload(Candidate.profile), joinedload(Candidate.screening)).order_by(Candidate.created_at.desc())
    if stage:
        q = q.where(Candidate.current_stage == stage)
        
    # Row-Level Security / Visibility Logic
    if user.role in (UserRole.COMPANY_HR_HEAD, UserRole.SUPER_ADMIN, UserRole.ADMIN):
        pass # sees all
    elif user.role == UserRole.BRANCH_HR:
        # Branch HR sees candidates assigned to them, or candidates in their branch
        q = q.where(
            or_(
                Candidate.assigned_hr_user_id == user.id,
                Candidate.branch_location == user.branch_location
            )
        )
    elif user.role == UserRole.DEPT_HEAD:
        # Dept Head sees candidates for their department, or where they are assigned as interviewer
        q = q.where(
            or_(
                Candidate.position_applied_for == user.department,
                func.jsonb_path_exists(Candidate.interviewer_assignments, f'$.* ? (@ == "{str(user.id)}")')
            )
        )
    elif user.role == UserRole.BRANCH_VP:
        q = q.where(
            or_(
                Candidate.branch_location == user.branch_location,
                func.jsonb_path_exists(Candidate.interviewer_assignments, f'$.* ? (@ == "{str(user.id)}")')
            )
        )
    elif user.role == UserRole.SERVICE_VP:
        q = q.where(
            or_(
                Candidate.position_applied_for.ilike("%service%"),
                func.jsonb_path_exists(Candidate.interviewer_assignments, f'$.* ? (@ == "{str(user.id)}")')
            )
        )
    elif user.role == UserRole.FINANCE:
        # Finance only sees candidates in final stages
        q = q.where(Candidate.current_stage.in_([PipelineStage.FINAL_APPROVAL, PipelineStage.HIRED]))
    else:
        # HQ_HR, HQ_STAFF, INTERVIEWER fallback
        q = q.where(
            or_(
                Candidate.assigned_hr_user_id == user.id,
                func.jsonb_path_exists(Candidate.interviewer_assignments, f'$.* ? (@ == "{str(user.id)}")')
            )
        )
    
    q = q.offset(skip).limit(limit)
    rows = list(db.scalars(q).all())
    with_resume = resume_candidate_ids(db, [row.id for row in rows])
    return [to_candidate_out(row, row.id in with_resume) for row in rows]


@router.post("", response_model=CandidateOut, status_code=201)
def create(
    body: CandidateCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_HR_HEAD, UserRole.BRANCH_HR, UserRole.HQ_HR, UserRole.ADMIN, UserRole.LOCAL_HR)),
):
    if body.assigned_hr_user_id is None:
        body = body.model_copy(update={"assigned_hr_user_id": user.id})
    row = create_candidate(db, body, user.id, created_via_public_apply=False)
    return to_candidate_out(row, False)


@router.get("/{id}", response_model=CandidateOut)
def get_candidate(
    id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_HR_HEAD, UserRole.BRANCH_HR, UserRole.HQ_HR, UserRole.ADMIN, UserRole.LOCAL_HR)),
):
    row = db.scalar(select(Candidate).options(joinedload(Candidate.profile), joinedload(Candidate.screening)).where(Candidate.id == id))
    if not row:
        raise HTTPException(status_code=404, detail="Not found.")
    assert_candidate_access(user, row)
    return to_candidate_out(row, id in resume_candidate_ids(db, [id]))


@router.patch("/{id}/profile/raw_data", response_model=CandidateOut)
def update_profile_raw_data(
    id: UUID,
    body: CandidateProfileRawDataUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_HR_HEAD, UserRole.BRANCH_HR, UserRole.HQ_HR, UserRole.ADMIN, UserRole.LOCAL_HR)),
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
        description="Candidate's pre-interview application form was manually updated by HR.",
        created_by_user_id=user.id,
    )
    db.add(log)
    db.commit()
    db.refresh(row)
    return to_candidate_out(row, id in resume_candidate_ids(db, [id]))


@router.delete("/{id}", status_code=204)
def delete_candidate_endpoint(
    id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_HR_HEAD, UserRole.BRANCH_HR, UserRole.HQ_HR, UserRole.ADMIN, UserRole.LOCAL_HR)),
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
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Cannot delete candidate due to existing references.")


