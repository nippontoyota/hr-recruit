import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.core.positions import DEPARTMENTS
from app.core.branding import normalize_brand
from app.models.settings import HR_BRANCHES


class JobOpeningCreate(BaseModel):
    position: str = Field(..., min_length=1, max_length=100)
    department: str
    location: str
    headcount: int = Field(..., ge=1, le=999)
    brand: str | None = None

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
        if value != "River" and value not in HR_BRANCHES:
            raise ValueError(f"Location must be one of: {', '.join(HR_BRANCHES)}")
        return value

    @model_validator(mode="after")
    def validate_brand_location(self):
        if self.brand and self.brand.strip().upper() == "RIVER" and self.location != "River":
            raise ValueError("River openings must use the River location")
        if self.location == "River" and (not self.brand or self.brand.strip().upper() != "RIVER"):
            raise ValueError("River location requires the River brand")
        return self


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
    brand: str | None = None

    @field_validator("brand", mode="before")
    @classmethod
    def normalize_output_brand(cls, value: object) -> str:
        return normalize_brand(value)
