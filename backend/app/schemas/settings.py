import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import InterviewMode, CommunicationType


# Location Template Schemas
class LocationTemplateBase(BaseModel):
    name: str = Field(..., max_length=255, description="Name of the location template")
    location_or_link: str = Field(..., description="The physical address or meeting link")
    mode: InterviewMode = Field(..., description="PHYSICAL or ONLINE")
    is_default: bool = Field(False, description="Whether this is the default location")
    branch_location: str = Field(..., max_length=255)


class LocationTemplateCreate(BaseModel):
    name: str = Field(..., max_length=255)
    location_or_link: str = Field(..., description="Physical address or maps link")
    mode: InterviewMode = Field(InterviewMode.PHYSICAL, description="PHYSICAL or ONLINE")
    is_default: bool = Field(False)
    branch_location: str | None = Field(
        None, max_length=255, description="Required for ADMIN/HO_HR; LOCAL_HR uses their account branch"
    )


class LocationTemplateUpdate(BaseModel):
    name: str | None = Field(None, max_length=255)
    location_or_link: str | None = None
    mode: InterviewMode | None = None
    is_default: bool | None = None


class LocationTemplateResponse(LocationTemplateBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Message Template Schemas
class MessageTemplateBase(BaseModel):
    name: str = Field(..., max_length=255, description="Name of the message template")
    type: CommunicationType = Field(..., description="Type of communication (e.g., EMAIL, WHATSAPP)")
    subject: str | None = Field(None, max_length=255, description="Subject for emails")
    content: str = Field(..., description="The message content with optional variables like {{candidate_name}}")
    is_default: bool = Field(False, description="Whether this is the default message for its type")


class MessageTemplateCreate(MessageTemplateBase):
    pass


class MessageTemplateUpdate(BaseModel):
    name: str | None = Field(None, max_length=255)
    type: CommunicationType | None = None
    subject: str | None = Field(None, max_length=255)
    content: str | None = None
    is_default: bool | None = None


class MessageTemplateResponse(MessageTemplateBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Touchpoint Template Schemas (call letter Meeting Point / Touch Point 1-2, saved per branch)
class TouchpointTemplateCreate(BaseModel):
    name: str = Field(..., max_length=255)
    meeting_point: str = Field(..., min_length=1)
    touch_point_1_label: str = Field(..., min_length=1, max_length=255)
    touch_point_1_phone: str | None = Field(None, max_length=20)
    touch_point_2_label: str | None = Field(None, max_length=255)
    touch_point_2_phone: str | None = Field(None, max_length=20)
    is_default: bool = Field(False)
    branch_location: str | None = Field(
        None, max_length=255, description="Required for ADMIN/HO_HR; LOCAL_HR uses their account branch"
    )


class TouchpointTemplateResponse(BaseModel):
    id: uuid.UUID
    branch_location: str
    name: str
    meeting_point: str
    touch_point_1_label: str
    touch_point_1_phone: str | None = None
    touch_point_2_label: str | None = None
    touch_point_2_phone: str | None = None
    is_default: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class InterviewerNameCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    phone: str | None = Field(None, max_length=20)
    branch_location: str | None = Field(
        None, max_length=255, description="Required for ADMIN/HO_HR; LOCAL_HR uses their account branch"
    )


class InterviewerNameUpdate(BaseModel):
    phone: str = Field(..., min_length=10, max_length=20)


class InterviewerNameResponse(BaseModel):
    id: uuid.UUID
    name: str
    phone: str | None = None
    branch_location: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
