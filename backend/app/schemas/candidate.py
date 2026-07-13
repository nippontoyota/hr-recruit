from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import AliasChoices, BaseModel, ConfigDict, Field, field_validator

from app.models.enums import DocumentType, PipelineStage, FormStatus, ScreeningStatus, ActivityType


class CandidateCreate(BaseModel):
    """Accepts SPA field names; unknown extras are ignored."""

    model_config = ConfigDict(extra="ignore")

    full_name: str
    phone: str
    email: str | None = None
    source: str = "Unknown"
    source_reference: str | None = None
    position_applied_for: str = "Unknown"
    branch_location: str | None = Field(
        default=None,
        validation_alias=AliasChoices("branch_location", "branch_name"),
    )
    assigned_hr_user_id: UUID | None = None




class CandidateProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    candidate_id: UUID
    version: int
    current_location: str | None
    experience_level: str | None
    total_experience: str | None
    current_company: str | None
    expected_salary: str | None
    joining_date: str | None
    email: str | None
    resume_url: str | None
    raw_data: dict | None = None
    created_at: datetime
    updated_at: datetime

class CandidateOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    candidate_id: str
    full_name: str
    phone: str
    email: str | None
    source: str
    source_reference: str | None
    position_applied_for: str
    share_url: str | None = None
    pre_form_status: FormStatus
    pre_form_sent_at: datetime | None
    pre_form_submitted_at: datetime | None
    current_stage: PipelineStage
    branch_location: str | None
    profile: CandidateProfileOut | None = None
    is_duplicate_flagged: bool
    duplicate_of_candidate_id: UUID | None
    assigned_hr_user_id: UUID | None
    assigned_manager_id: UUID | None
    assigned_gm_id: UUID | None
    applied_at: datetime
    created_at: datetime
    updated_at: datetime
    has_resume: bool = False
    is_rejoining: bool = False


class StageChange(BaseModel):
    to_stage: PipelineStage
    remarks: str | None = None


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

class CandidateScreeningCreate(BaseModel):
    status: ScreeningStatus
    call_completed: bool = False
    interest_confirmed: bool = False
    salary_discussed: bool = False
    notice_period_discussed: bool = False
    basic_eligibility_checked: bool = False
    remarks: str | None = None
    pending_reason: str | None = None
    follow_up_date: datetime | None = None

class CandidateScreeningOut(CandidateScreeningCreate):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    candidate_id: UUID
    created_at: datetime
    updated_at: datetime

class ActivityLogCreate(BaseModel):
    activity_type: ActivityType
    title: str
    description: str

class ActivityLogOut(ActivityLogCreate):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    candidate_id: UUID
    created_by_user_id: UUID | None
    created_at: datetime
