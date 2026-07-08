from datetime import datetime
from uuid import UUID

from app.models.enums import PipelineStage
from app.schemas.common import ORMModel


class StageHistoryResponse(ORMModel):
    id: UUID
    candidate_id: UUID
    from_stage: PipelineStage | None
    to_stage: PipelineStage
    changed_by_user_id: UUID
    reason: str | None
    created_at: datetime
