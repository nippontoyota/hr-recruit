from pathlib import PurePosixPath
from uuid import UUID, uuid4
import anyio
from fastapi import HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.candidate import Candidate
from app.models.candidate_profile import CandidateProfile
from app.models.document import Document
from app.models.enums import DocumentType
from app.schemas.candidate import DocumentOut
from app.services import storage


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


def get_resume_document(db: Session, candidate_id: UUID) -> Document | None:
    return db.scalar(
        select(Document).where(
            Document.candidate_id == candidate_id,
            Document.doc_type == DocumentType.RESUME,
        )
    )


def document_out(doc: Document) -> DocumentOut:
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


async def save_resume_for_candidate(
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
    existing = get_resume_document(db, candidate_id)
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

    return document_out(doc)


async def save_photo_for_candidate(
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

def process_photo_url(url: str | None) -> str | None:
    if not url:
        return None
    path = url
    if "http" in path and "object/public" in path:
        try:
            bucket = settings.supabase_storage_bucket
            path = path.split(f"/{bucket}/")[-1]
        except Exception:
            pass
    try:
        return storage.create_signed_url(path, expires_in=3600)
    except Exception:
        return None
