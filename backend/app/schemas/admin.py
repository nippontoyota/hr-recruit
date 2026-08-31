from pydantic import BaseModel
from typing import Dict, List
from uuid import UUID

from app.models.enums import PipelineStage

class BottleneckStats(BaseModel):
    on_hold: int
    pending_interviews: int

class CandidateDetail(BaseModel):
    id: UUID
    full_name: str
    department: str | None
    current_stage: PipelineStage
    created_at: str

class BranchCandidateData(BaseModel):
    branch_name: str
    candidates: List[CandidateDetail]

class AdminDashboardStats(BaseModel):
    total_candidates: int
    conversion_rate: float
    stage_breakdown: Dict[str, int]
    bottlenecks: BottleneckStats
    branch_data: List[BranchCandidateData]
