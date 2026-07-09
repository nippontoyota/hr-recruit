from datetime import UTC, datetime
from pathlib import PurePosixPath
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_active_user, require_roles
from app.models.candidate import Candidate
from app.models.document import Document
from app.models.enums import DocumentType, PipelineStage, UserRole
from app.models.stage_history import StageHistory
from app.models.user import User
from app.schemas.candidate import CandidateCreate, CandidateOut, DocumentOut, StageChange, StageHistoryOut
from app.services import storage

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


def to_candidate_out(row: Candidate, has_resume: bool) -> CandidateOut:
    return CandidateOut.model_validate(row).model_copy(update={"has_resume": has_resume})


def create_candidate(db: Session, body: CandidateCreate, user_id: UUID) -> Candidate:
    match = [Candidate.phone == body.phone]
    if body.email:
        match.append(Candidate.email == body.email)
    dup = db.scalar(select(Candidate).where(or_(*match)).limit(1))

    row = Candidate(
        candidate_id=next_candidate_id(db),
        full_name=body.full_name,
        phone=body.phone,
        email=body.email,
        source_channel=body.source_channel,
        branch_location=body.branch_location,
        application_data=body.application_data or {},
        assigned_hr_user_id=body.assigned_hr_user_id,
        is_duplicate_flagged=dup is not None,
        duplicate_of_candidate_id=dup.id if dup else None,
    )
    db.add(row)
    db.flush()
    db.add(StageHistory(candidate_id=row.id, to_stage=PipelineStage.NEW_APPLICATION, changed_by_user_id=user_id))
    db.commit()
    db.refresh(row)
    return row


def change_stage(db: Session, row: Candidate, body: StageChange) -> Candidate:
    if row.current_stage == body.to_stage:
        raise HTTPException(status_code=400, detail="Already at that stage.")
    db.add(
        StageHistory(
            candidate_id=row.id,
            from_stage=row.current_stage,
            to_stage=body.to_stage,
            changed_by_user_id=body.changed_by_user_id,
            reason=body.reason,
        )
    )
    row.current_stage = body.to_stage
    db.commit()
    db.refresh(row)
    return row


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


@router.get("", response_model=list[CandidateOut])
def list_candidates(
    stage: PipelineStage | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.HEAD_OFFICE_HR, UserRole.ADMIN, UserRole.LOCAL_HR)),
):
    q = select(Candidate).order_by(Candidate.created_at.desc())
    if stage:
        q = q.where(Candidate.current_stage == stage)
    rows = list(db.scalars(q).all())
    with_resume = resume_candidate_ids(db, [row.id for row in rows])
    return [to_candidate_out(row, row.id in with_resume) for row in rows]


@router.post("", response_model=CandidateOut, status_code=201)
def create(
    body: CandidateCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_active_user),
):
    if body.assigned_hr_user_id is None:
        body = body.model_copy(update={"assigned_hr_user_id": user.id})
    row = create_candidate(db, body, user.id)
    return to_candidate_out(row, False)


@router.get("/{id}", response_model=CandidateOut)
def get_one(
    id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    row = db.get(Candidate, id)
    if not row:
        raise HTTPException(status_code=404, detail="Not found.")
    return to_candidate_out(row, id in resume_candidate_ids(db, [id]))


@router.post("/{id}/resume", response_model=DocumentOut, status_code=201)
async def upload_resume(
    id: UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_active_user),
):
    row = db.get(Candidate, id)
    if not row:
        raise HTTPException(status_code=404, detail="Not found.")

    ext = _resume_extension(file.filename)
    content_type = _validate_resume_content_type(file.content_type, ext)
    data = await _read_resume_bytes(file)

    existing = _get_resume_document(db, id)
    old_path = existing.storage_path if existing else None
    doc_id = existing.id if existing else uuid4()
    storage_path = f"resumes/{id}/{doc_id}{ext}"
    file_name = _safe_filename(file.filename, ext)

    storage.upload_object(storage_path, data, content_type, upsert=True)

    if existing:
        existing.file_name = file_name
        existing.content_type = content_type
        existing.storage_path = storage_path
        existing.file_size_bytes = len(data)
        existing.uploaded_by_user_id = user.id
        doc = existing
    else:
        doc = Document(
            id=doc_id,
            candidate_id=id,
            doc_type=DocumentType.RESUME,
            file_name=file_name,
            content_type=content_type,
            storage_path=storage_path,
            file_size_bytes=len(data),
            uploaded_by_user_id=user.id,
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


@router.get("/{id}/resume", response_model=DocumentOut)
def get_resume(
    id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    if not db.get(Candidate, id):
        raise HTTPException(status_code=404, detail="Not found.")
    doc = _get_resume_document(db, id)
    if not doc:
        raise HTTPException(status_code=404, detail="Resume not found.")
    return _document_out(doc)


@router.post("/{id}/stage", response_model=CandidateOut)
def move_stage(
    id: UUID,
    body: StageChange,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_active_user),
):
    row = db.get(Candidate, id)
    if not row:
        raise HTTPException(status_code=404, detail="Not found.")
    payload = body.model_copy(update={"changed_by_user_id": user.id})
    updated = change_stage(db, row, payload)
    return to_candidate_out(updated, id in resume_candidate_ids(db, [id]))


@router.get("/{id}/stage-history", response_model=list[StageHistoryOut])
def history(
    id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    if not db.get(Candidate, id):
        raise HTTPException(status_code=404, detail="Not found.")
    return list(db.scalars(select(StageHistory).where(StageHistory.candidate_id == id).order_by(StageHistory.created_at)))
