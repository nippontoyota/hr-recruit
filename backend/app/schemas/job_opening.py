import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.positions import DEPARTMENTS
from app.models.settings import HR_BRANCHES


class JobOpeningCreate(BaseModel):
    position: str = Field(..., min_length=1, max_length=100)
    department: str
    location: str
    headcount: int = Field(..., ge=1, le=999)

    @field_validator("position")
    @classmethod
    def strip_position(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("Position is required")
        return trimmed

    @field_validator("department")
    @classmethod
    def valid_department(cls, value: str) -> str:
        if value not in DEPARTMENTS:
            raise ValueError(f"Department must be one of: {', '.join(DEPARTMENTS)}")
        return value

    @field_validator("location")
    @classmethod
    def valid_location(cls, value: str) -> str:
        if value not in HR_BRANCHES:
            raise ValueError(f"Location must be one of: {', '.join(HR_BRANCHES)}")
        return value


class JobOpeningUpdate(JobOpeningCreate):
    pass


class JobOpeningOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    position: str
    department: str
    location: str
    headcount: int
    created_by: uuid.UUID | None
    created_at: datetime
    updated_at: datetime
