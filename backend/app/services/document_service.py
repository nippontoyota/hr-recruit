"""Candidate resume and photo storage helpers."""

from __future__ import annotations

from pathlib import Path
from uuid import UUID, uuid4

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.candidate import Candidate
from app.models.candidate_profile import CandidateProfile
from app.models.document import Document
from app.models.enums import DocumentType
from app.schemas.candidate import DocumentOut
from app.services import storage


_RESUME_CONTENT_TYPES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}
_RESUME_EXTENSIONS = {".pdf", ".doc", ".docx"}
_EXTENSION_TO_CONTENT_TYPE = {
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}
_PHOTO_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}


def resume_extension(filename: str) -> str:
    extension = Path(filename or "resume").suffix.lower()
    if extension not in _RESUME_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Resume must be PDF, DOC, or DOCX.",
        )
    return extension


def safe_filename(filename: str, extension: str) -> str:
    return Path(filename or f"resume{extension}").name


def resolve_resume_content_type(content_type: str | None, extension: str) -> str:
    normalized = (content_type or "").lower()
    if normalized in _RESUME_CONTENT_TYPES:
        return normalized
    if normalized in {"", "application/octet-stream"}:
        mapped = _EXTENSION_TO_CONTENT_TYPE.get(extension)
        if mapped:
            return mapped
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Unsupported resume file type.",
    )


def resume_candidate_ids(db: Session, candidate_ids: list[UUID]) -> set[UUID]:
    if not candidate_ids:
        return set()
    return set(
        db.scalars(
            select(Document.candidate_id).where(
                Document.candidate_id.in_(candidate_ids),
                Document.doc_type == DocumentType.RESUME,
            )
        ).all()
    )


def get_resume_document(db: Session, candidate_id: UUID) -> Document | None:
    return db.scalar(
        select(Document).where(
            Document.candidate_id == candidate_id,
            Document.doc_type == DocumentType.RESUME,
        )
    )


def document_out(document: Document) -> DocumentOut:
    return DocumentOut(
        id=document.id,
        candidate_id=document.candidate_id,
        doc_type=document.doc_type,
        file_name=document.file_name,
        content_type=document.content_type,
        file_size_bytes=document.file_size_bytes,
        uploaded_by_user_id=document.uploaded_by_user_id,
        created_at=document.created_at,
        download_url=storage.create_signed_url(document.storage_path),
    )


def process_photo_url(photo_url: str | None) -> str | None:
    if not photo_url or photo_url.startswith(("http://", "https://", "data:")):
        return photo_url
    try:
        return storage.create_signed_url(photo_url)
    except Exception:
        return None


async def _read_upload(
    file: UploadFile,
    *,
    allowed_content_types: set[str],
    label: str,
    resolved_content_type: str | None = None,
) -> bytes:
    content_type = resolved_content_type or (file.content_type or "").lower()
    if content_type not in allowed_content_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported {label} file type.",
        )
    data = await file.read(settings.resume_max_bytes + 1)
    if not data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{label.title()} file is empty.",
        )
    if len(data) > settings.resume_max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"{label.title()} exceeds the upload size limit.",
        )
    return data


async def save_resume_for_candidate(
    db: Session,
    candidate: Candidate,
    file: UploadFile,
    uploaded_by_user_id: UUID | None,
) -> DocumentOut:
    extension = resume_extension(file.filename or "resume")
    filename = safe_filename(file.filename or "resume", extension)
    content_type = resolve_resume_content_type(file.content_type, extension)
    data = await _read_upload(
        file,
        allowed_content_types=_RESUME_CONTENT_TYPES,
        label="resume",
        resolved_content_type=content_type,
    )
    storage_path = f"candidates/{candidate.id}/resume-{uuid4().hex}{extension}"
    storage.upload_object(storage_path, data, content_type)

    document = get_resume_document(db, candidate.id)
    old_storage_path = document.storage_path if document else None
    if document is None:
        document = Document(
            candidate_id=candidate.id,
            doc_type=DocumentType.RESUME,
            file_name=filename,
            content_type=content_type,
            storage_path=storage_path,
            file_size_bytes=len(data),
            uploaded_by_user_id=uploaded_by_user_id,
        )
        db.add(document)
    else:
        document.file_name = filename
        document.content_type = content_type
        document.storage_path = storage_path
        document.file_size_bytes = len(data)
        document.uploaded_by_user_id = uploaded_by_user_id

    try:
        db.commit()
    except Exception as exc:
        db.rollback()
        storage.delete_object(storage_path)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to save resume record. Please try again.",
        ) from exc
    db.refresh(document)
    if old_storage_path and old_storage_path != storage_path:
        storage.delete_object(old_storage_path)
    return document_out(document)


async def save_photo_for_candidate(
    db: Session,
    candidate: Candidate,
    file: UploadFile,
) -> dict[str, str]:
    data = await _read_upload(
        file,
        allowed_content_types=_PHOTO_CONTENT_TYPES,
        label="photo",
    )
    suffix = Path(file.filename or "photo").suffix.lower()
    storage_path = f"candidates/{candidate.id}/photo-{uuid4().hex}{suffix}"
    storage.upload_object(storage_path, data, file.content_type or "application/octet-stream")

    profile = candidate.profile
    if profile is None:
        profile = CandidateProfile(candidate_id=candidate.id)
        candidate.profile = profile
        db.add(profile)
    old_storage_path = profile.photo_url
    profile.photo_url = storage_path
    db.commit()

    if old_storage_path and not old_storage_path.startswith(("http://", "https://", "data:")):
        storage.delete_object(old_storage_path)
    return {"photo_url": process_photo_url(storage_path) or ""}
