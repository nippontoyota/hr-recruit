from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.enums import RemarkStageContext
from app.schemas.common import ORMModel


class RemarkCreate(BaseModel):
    stage_context: RemarkStageContext
    content: str = Field(min_length=1)
    scores: dict[str, Any] | None = None


class RemarkResponse(ORMModel):
    id: UUID
    candidate_id: UUID
    stage_context: RemarkStageContext
    author_user_id: UUID
    content: str
    scores: dict[str, Any] | None
    created_at: datetime
    updated_at: datetime
