from datetime import UTC, datetime
import anyio
from pathlib import PurePosixPath
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy import or_, select, cast, String, func, delete
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel
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
from app.models.evaluation import Evaluation
from app.models.enums import DocumentType, PipelineStage, UserRole, ActivityType, ScreeningStatus, FormStatus, EvaluationType
from app.models.stage_history import StageHistory
from app.models.user import User
from app.schemas.candidate import (
    CandidateCreate,
    CandidateListOut,
    CandidatePaginatedOut, DocumentOut,
    CandidateProfileRawDataUpdate, CandidateResolveDuplicate, CandidatePortalOut, CandidatePortalEvaluationOut, CandidatePortalResponseIn
)
from app.services import storage


from app.services.workflow import transition

router = APIRouter(prefix="/candidates", tags=["candidates"])

# PORTAL ENDPOINTS

@router.get("/portal/{token}", response_model=CandidatePortalOut)
def get_candidate_portal(token: str, db: Session = Depends(get_db)):
    from sqlalchemy.orm import joinedload
    from app.core.config import settings
    from app.services import storage

    candidate = db.scalar(select(Candidate).options(joinedload(Candidate.profile)).where(Candidate.pre_form_token == token))
    if not candidate:
        raise HTTPException(status_code=404, detail="Invalid token")
        
    evaluations = db.scalars(select(Evaluation).where(Evaluation.candidate_id == candidate.id)).all()
    eval_outs = []
    for ev in evaluations:
        # Only show interviews, not tests
        if ev.type != EvaluationType.TECHNICAL_TEST:
            eval_outs.append(CandidatePortalEvaluationOut(
                id=ev.id,
                type=ev.type.value,
                status=ev.status.value,
                scheduled_time=ev.scheduled_time,
                location_or_link=ev.location_or_link,
                candidate_response=ev.candidate_response,
                interview_mode=ev.interview_mode.value if hasattr(ev, 'interview_mode') and ev.interview_mode else None
            ))
            
    photo_url = None
    if candidate.profile and candidate.profile.photo_url:
        path = candidate.profile.photo_url
        if "http" in path and "object/public" in path:
            try:
                bucket = settings.supabase_storage_bucket
                path = path.split(f"/{bucket}/")[-1]
            except Exception:
                pass
        try:
            photo_url = storage.create_signed_url(path, expires_in=3600)
        except Exception:
            pass
            
    return CandidatePortalOut(
        id=candidate.id,
        full_name=candidate.full_name,
        position_applied_for=candidate.position_applied_for,
        phone=candidate.phone,
        email=candidate.email,
        branch_location=candidate.branch_location,
        photo_url=photo_url,
        current_stage=candidate.current_stage,
        offer_status=candidate.offer_status,
        evaluations=eval_outs
    )


@router.post("/portal/{token}/response")
def submit_candidate_portal_response(token: str, body: CandidatePortalResponseIn, db: Session = Depends(get_db)):
    candidate = db.scalar(select(Candidate).where(Candidate.pre_form_token == token))
    if not candidate:
        raise HTTPException(status_code=404, detail="Invalid token")
        
    if body.action_type in ["INTERVIEW_CONFIRM", "INTERVIEW_DECLINE"]:
        if not body.evaluation_id:
            raise HTTPException(status_code=400, detail="evaluation_id is required")
        ev = db.get(Evaluation, body.evaluation_id)
        if not ev or ev.candidate_id != candidate.id:
            raise HTTPException(status_code=404, detail="Evaluation not found")
            
        ev.candidate_response = "CONFIRMED" if body.action_type == "INTERVIEW_CONFIRM" else "DECLINED"
        db.add(ActivityLog(
            candidate_id=candidate.id,
            activity_type=ActivityType.CALL,
            title=f"Interview {ev.candidate_response.title()}",
            description=f"Candidate has {ev.candidate_response.lower()} the interview scheduled for {ev.scheduled_time}.",
            created_by_user_id=None
        ))
        
    elif body.action_type in ["OFFER_ACCEPT", "OFFER_DECLINE"]:
        candidate.offer_status = "ACCEPTED" if body.action_type == "OFFER_ACCEPT" else "DECLINED"
        db.add(ActivityLog(
            candidate_id=candidate.id,
            activity_type=ActivityType.SYSTEM,
            title=f"Offer {candidate.offer_status.title()}",
            description=f"Candidate has {candidate.offer_status.lower()} the offer.",
            created_by_user_id=None
        ))
    else:
        raise HTTPException(status_code=400, detail="Invalid action_type")
        
    db.commit()
    return {"status": "success"}


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
    from app.services import storage
    
    share_url = share_url_for_token(row.pre_form_token)
    out = CandidateOut.model_validate(row).model_copy(
        update={"has_resume": has_resume, "is_rejoining": False, "share_url": share_url}
    )
    
    if out.profile and out.profile.photo_url:
        path = out.profile.photo_url
        if "http" in path and "object/public" in path:
            try:
                bucket = settings.supabase_storage_bucket
                path = path.split(f"/{bucket}/")[-1]
            except Exception:
                pass
        try:
            out.profile.photo_url = storage.create_signed_url(path, expires_in=3600)
        except Exception:
            pass
            
    return out

def to_candidate_list_out(row: Candidate, has_resume: bool) -> CandidateListOut:
    from app.core.config import settings
    share_url = share_url_for_token(row.pre_form_token)
    return CandidateListOut.model_validate(row).model_copy(
        update={"has_resume": has_resume, "is_rejoining": False, "share_url": share_url}
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




def _store_whatsapp_invite(
    db: Session,
    candidate: Candidate,
    user: User,
) -> None:
    profile = db.scalar(select(CandidateProfile).where(CandidateProfile.candidate_id == candidate.id))
    if not profile:
        profile = CandidateProfile(candidate_id=candidate.id)
        db.add(profile)

    visit_display = ""
    if candidate.visit_date:
        visit_display = candidate.visit_date.strftime("%A, %d %B %Y")
    if candidate.visit_time:
        visit_display += f" at {candidate.visit_time}"

    invite = {
        "candidateName": candidate.full_name,
        "position": candidate.position_applied_for or "",
        "formLink": share_url_for_token(candidate.pre_form_token) or "",
        "branchName": candidate.visit_branch or candidate.branch_location or "",
        "visitDate": visit_display,
        "mapsLink": candidate.visit_maps_link or "",
        "recruiterName": user.full_name,
        "extraInstructions": candidate.visit_instructions or "",
    }
    raw = dict(profile.raw_data or {})
    raw["whatsapp_invite"] = invite
    profile.raw_data = raw


def create_candidate(db: Session, body: CandidateCreate, user_id: UUID | None, created_via_public_apply: bool = False) -> Candidate:
    from app.core.security import generate_secure_token
    
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
            department=body.department,
            branch_location=body.branch_location,
            assigned_hr_user_id=body.assigned_hr_user_id,
            is_duplicate_flagged=dup is not None,
            duplicate_of_candidate_id=dup.id if dup else None,
            current_stage=PipelineStage.CANDIDATE_FORM,
            pre_form_status=FormStatus.SENT,
            pre_form_token=generate_secure_token(),
            pre_form_sent_at=datetime.now(UTC),
        )
        db.add(row)
        db.flush()
        
        profile = CandidateProfile(candidate_id=row.id)
        db.add(profile)
        
        log_desc = "Candidate applied via public form." if created_via_public_apply else "Candidate created manually. Form link generated."
        log = ActivityLog(
            candidate_id=row.id,
            activity_type=ActivityType.SYSTEM,
            title="Candidate Created",
            description=log_desc,
            created_by_user_id=user_id if user_id else None
        )
        db.add(log)
        
        db.add(StageHistory(candidate_id=row.id, to_stage=PipelineStage.CANDIDATE_FORM, changed_by_user_id=user_id))
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

    await anyio.to_thread.run_sync(
        storage.upload_object, storage_path, data, content_type, True
    )

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
            await anyio.to_thread.run_sync(storage.delete_object, storage_path)
        raise HTTPException(status_code=502, detail="Failed to save resume metadata.")

    if old_path and old_path != storage_path:
        await anyio.to_thread.run_sync(storage.delete_object, old_path)

    return _document_out(doc)

async def _save_photo_for_candidate(
    db: Session,
    candidate: Candidate,
    file: UploadFile,
) -> dict:
    ext = ""
    if file.filename and "." in file.filename:
        ext = f".{file.filename.rsplit('.', 1)[-1].lower()}"
    
    if ext not in [".jpg", ".jpeg", ".png", ".webp"]:
        raise HTTPException(status_code=400, detail="Photo must be JPG, PNG, or WEBP")
        
    data = await file.read()
    if len(data) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Photo must be under 5MB")
        
    candidate_id = candidate.id
    storage_path = f"photos/{candidate_id}/{uuid4()}{ext}"
    
    await anyio.to_thread.run_sync(
        storage.upload_object, storage_path, data, file.content_type or "image/jpeg", True
    )
    
    if not candidate.profile:
        candidate.profile = CandidateProfile(candidate_id=candidate.id)
    
    candidate.profile.photo_url = storage_path
    db.commit()
    
    signed_url = storage.create_signed_url(storage_path, expires_in=3600)
    return {"status": "success", "photo_url": signed_url}



@router.get("", response_model=CandidatePaginatedOut)
def list_candidates(
    stage: PipelineStage | None = None,
    search: str | None = None,
    page: int = 1,
    limit: int = 50,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.HO_HR, UserRole.LOCAL_HR)),
):
    skip = (page - 1) * limit
    q = select(Candidate)
    if stage:
        q = q.where(Candidate.current_stage == stage)
    if search:
        search_term = f"%{search}%"
        q = q.where(
            or_(
                Candidate.full_name.ilike(search_term),
                Candidate.phone.ilike(search_term),
                Candidate.candidate_id.ilike(search_term),
                Candidate.email.ilike(search_term)
            )
        )
        
    # Row-Level Security / Visibility Logic
    if user.role in (UserRole.ADMIN, UserRole.HO_HR):
        pass # sees all
    elif user.role == UserRole.LOCAL_HR:
        # Local HR sees candidates in their branch
        q = q.where(Candidate.branch_location == user.branch_location)
    else:
        # Fallback to prevent leaks
        q = q.where(Candidate.id == None)

    total_count = db.scalar(select(func.count()).select_from(q.subquery())) or 0

    q = q.order_by(Candidate.created_at.desc()).offset(skip).limit(limit)
    rows = list(db.scalars(q).all())
    with_resume = resume_candidate_ids(db, [row.id for row in rows])
    data = [to_candidate_list_out(row, row.id in with_resume) for row in rows]
    
    return CandidatePaginatedOut(
        data=data,
        total_count=total_count,
        page=page,
        limit=limit
    )


@router.post("", response_model=CandidateOut, status_code=201)
def create(
    body: CandidateCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.HO_HR, UserRole.LOCAL_HR)),
):
    if body.assigned_hr_user_id is None:
        body = body.model_copy(update={"assigned_hr_user_id": user.id})
    row = create_candidate(db, body, user.id, created_via_public_apply=False)
    return to_candidate_out(row, False)


@router.get("/{id}", response_model=CandidateOut)
def get_candidate(
    id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.HO_HR, UserRole.LOCAL_HR)),
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
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.HO_HR, UserRole.LOCAL_HR)),
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
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.HO_HR, UserRole.LOCAL_HR)),
):
    row = get_candidate_for_user(db, id, user)
    
    # Try to bulk delete documents from storage
    docs = db.scalars(select(Document).where(Document.candidate_id == id)).all()
    storage_paths = [doc.storage_path for doc in docs if doc.storage_path]
    if storage_paths:
        try:
            storage.delete_objects(storage_paths)
        except Exception as e:
            print(f"Failed to bulk delete documents: {e}")
            
    # Bulk delete documents and stage histories
    db.execute(delete(Document).where(Document.candidate_id == id))
    db.execute(delete(StageHistory).where(StageHistory.candidate_id == id))
        
    # Clear out any candidates marked as duplicates of this one
    # Note: the update allows taking advantage of the newly added index
    from sqlalchemy import update
    db.execute(
        update(Candidate)
        .where(Candidate.duplicate_of_candidate_id == id)
        .values(duplicate_of_candidate_id=None, is_duplicate_flagged=False)
    )
                
    db.delete(row)
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    return {"status": "success", "message": "Candidate and all associated records deleted."}


@router.post("/{id}/resolve-duplicate")
def resolve_duplicate(
    id: UUID,
    body: CandidateResolveDuplicate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(UserRole.ADMIN, UserRole.HO_HR, UserRole.LOCAL_HR)),
):
    candidate = db.get(Candidate, id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
        
    if body.action == "NOT_DUPLICATE":
        candidate.is_duplicate_flagged = False
        candidate.duplicate_of_candidate_id = None
        log_desc = "Marked as not a duplicate (False Positive)."
    elif body.action == "MERGE":
        # We just reject the current one as duplicate
        candidate.current_stage = PipelineStage.REJECTED
        log_desc = f"Archived as duplicate of {candidate.duplicate_of_candidate_id}."
        db.add(StageHistory(candidate_id=candidate.id, to_stage=PipelineStage.REJECTED, changed_by_user_id=current_user.id, reason=log_desc))
    else:
        raise HTTPException(status_code=400, detail="Invalid action")
        
    db.add(ActivityLog(
        candidate_id=candidate.id,
        activity_type=ActivityType.SYSTEM,
        title="Duplicate Resolution",
        description=log_desc,
        created_by_user_id=current_user.id
    ))
    db.commit()
    return {"status": "success"}


class BulkDeleteRequest(BaseModel):
    candidate_ids: list[UUID]

@router.post("/bulk-delete", status_code=200)
def bulk_delete_candidates_endpoint(
    request: BulkDeleteRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.HO_HR, UserRole.LOCAL_HR)),
):
    if not request.candidate_ids:
        return {"success_count": 0, "failed_ids": []}
        
    cids = request.candidate_ids
    
    # 1. Enforce Role access: Ensure user has access to all requested IDs
    if user.role == UserRole.LOCAL_HR:
        valid_cids = db.scalars(select(Candidate.id).where(
            Candidate.id.in_(cids),
            Candidate.branch_location == user.branch_location
        )).all()
        cids = [c for c in cids if c in valid_cids]
        
    if not cids:
        return {"success_count": 0, "failed_ids": request.candidate_ids}

    # 2. Bulk delete documents from storage
    docs = db.scalars(select(Document).where(Document.candidate_id.in_(cids))).all()
    storage_paths = [doc.storage_path for doc in docs if doc.storage_path]
    if storage_paths:
        try:
            storage.delete_objects(storage_paths)
        except Exception as e:
            print(f"Failed to bulk delete documents: {e}")

    try:
        # 3. Bulk DB Operations
        db.execute(delete(Document).where(Document.candidate_id.in_(cids)))
        db.execute(delete(StageHistory).where(StageHistory.candidate_id.in_(cids)))
        
        # 4. Un-flag duplicates
        from sqlalchemy import update
        db.execute(
            update(Candidate)
            .where(Candidate.duplicate_of_candidate_id.in_(cids))
            .values(duplicate_of_candidate_id=None, is_duplicate_flagged=False)
        )
        
        # 5. Delete the candidates
        db.execute(delete(Candidate).where(Candidate.id.in_(cids)))
        
        db.commit()
        return {"success_count": len(cids), "failed_ids": list(set(request.candidate_ids) - set(cids))}
    except Exception as e:
        db.rollback()
        print(f"Bulk delete failed: {e}")
        return {"success_count": 0, "failed_ids": request.candidate_ids}


