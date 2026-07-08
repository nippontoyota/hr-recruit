from datetime import date, datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from app.models.enums import PipelineStage, RemarkStageContext, SourceChannel
from app.schemas.common import ORMModel


class CandidateCreate(BaseModel):
    full_name: str = Field(min_length=1, max_length=255)
    phone: str = Field(min_length=10, max_length=20)
    email: EmailStr | None = None
    date_of_birth: date | None = None
    source_channel: SourceChannel
    branch_location: str | None = None
    is_rejoining: bool = False
    application_data: dict[str, Any] | None = None
    assigned_hr_user_id: UUID | None = None
    notes_summary: str | None = None
    profile_completeness_pct: int | None = Field(default=None, ge=0, le=100)
    current_stage: PipelineStage = PipelineStage.NEW_APPLICATION


class CandidateUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=255)
    phone: str | None = Field(default=None, min_length=10, max_length=20)
    email: EmailStr | None = None
    date_of_birth: date | None = None
    branch_location: str | None = None
    is_rejoining: bool | None = None
    application_data: dict[str, Any] | None = None
    assigned_hr_user_id: UUID | None = None
    notes_summary: str | None = None
    profile_completeness_pct: int | None = Field(default=None, ge=0, le=100)


class CandidateResponse(ORMModel):
    id: UUID
    candidate_id: str
    full_name: str
    phone: str
    email: EmailStr | None
    date_of_birth: date | None
    source_channel: SourceChannel
    is_rejoining: bool
    is_duplicate_flagged: bool
    duplicate_of_candidate_id: UUID | None
    current_stage: PipelineStage
    applied_at: datetime
    created_at: datetime
    updated_at: datetime
    assigned_hr_user_id: UUID | None
    branch_location: str | None
    application_data: dict[str, Any] | None
    profile_completeness_pct: int | None
    notes_summary: str | None


class StageChangeRequest(BaseModel):
    to_stage: PipelineStage
    reason: str | None = None
