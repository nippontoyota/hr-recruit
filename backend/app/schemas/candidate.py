from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models.enums import DocumentType, PipelineStage, SourceChannel


class CandidateCreate(BaseModel):
    full_name: str
    phone: str
    email: str | None = None
    source_channel: SourceChannel
    branch_location: str | None = None
    application_data: dict[str, Any] | None = None
    assigned_hr_user_id: UUID | None = None


class CandidateOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    candidate_id: str
    full_name: str
    phone: str
    email: str | None
    source_channel: SourceChannel
    current_stage: PipelineStage
    branch_location: str | None
    application_data: dict[str, Any] | None
    is_duplicate_flagged: bool
    duplicate_of_candidate_id: UUID | None
    assigned_hr_user_id: UUID | None
    applied_at: datetime
    created_at: datetime
    updated_at: datetime
    has_resume: bool = False


class StageChange(BaseModel):
    to_stage: PipelineStage
    changed_by_user_id: UUID
    reason: str | None = None


class StageHistoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    candidate_id: UUID
    from_stage: PipelineStage | None
    to_stage: PipelineStage
    changed_by_user_id: UUID
    reason: str | None
    created_at: datetime


class DocumentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    candidate_id: UUID
    doc_type: DocumentType
    file_name: str
    content_type: str
    file_size_bytes: int
    uploaded_by_user_id: UUID | None
    created_at: datetime
    download_url: str
