from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Dict, List
from collections import defaultdict

from app.core.database import get_db
from app.models.user import User
from app.models.enums import UserRole, PipelineStage
from app.models.candidate import Candidate
from app.core.deps import require_roles
from app.schemas.admin import AdminDashboardStats, BottleneckStats, BranchCandidateData, CandidateDetail

router = APIRouter(prefix="/admin", tags=["admin"])

@router.get("/dashboard-stats", response_model=AdminDashboardStats)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN))
):
    # 1. Total candidates
    total_candidates = db.query(func.count(Candidate.id)).scalar() or 0
    
    # 2. Stage breakdown
    stage_counts = db.query(Candidate.current_stage, func.count(Candidate.id)).group_by(Candidate.current_stage).all()
    stage_breakdown = {stage.value: count for stage, count in stage_counts}
    
    # 3. Bottlenecks
    bottlenecks = {"on_hold": stage_breakdown.get(PipelineStage.ON_HOLD.value, 0), "pending_interviews": 0}
    bottlenecks["pending_interviews"] = (
        stage_breakdown.get(PipelineStage.BRANCH_INTERVIEW.value, 0) +
        stage_breakdown.get(PipelineStage.HO_INTERVIEWS.value, 0) +
        stage_breakdown.get(PipelineStage.CSS.value, 0)
    )
    
    # 4. Conversion rate
    hired = stage_breakdown.get(PipelineStage.HIRED.value, 0)
    rejected = stage_breakdown.get(PipelineStage.REJECTED.value, 0)
    conversion_rate = 0.0
    if (hired + rejected) > 0:
        conversion_rate = (hired / (hired + rejected)) * 100
        
    # 5. Branch Map
    # To keep it optimal and prevent massive payload, we fetch candidates grouped by branch.
    # We only include candidates that are not hired or rejected (Active Pipeline) for the dashboard preview,
    # and we limit to 10 per branch to keep the UI snappy.
    active_stages = [s for s in PipelineStage if s not in (PipelineStage.HIRED, PipelineStage.REJECTED)]
    
    branch_map = defaultdict(list)
    # Fetch all branches active candidates (ordered by latest)
    # Note: In production with millions of rows, a window function (ROW_NUMBER over partition) is better,
    # but for typical ATS sizes, fetching active candidates and grouping in python is extremely fast.
    active_candidates = db.query(Candidate).filter(Candidate.current_stage.in_(active_stages)).order_by(Candidate.created_at.desc()).all()
    
    for c in active_candidates:
        branch_name = c.branch_location or "Head Office"
        # Only take top 10 most recent active candidates per branch to prevent UI lag
        if len(branch_map[branch_name]) < 10:
            branch_map[branch_name].append(
                CandidateDetail(
                    id=c.id,
                    full_name=c.full_name,
                    department=c.department,
                    current_stage=c.current_stage,
                    created_at=c.created_at.isoformat()
                )
            )
        
    branch_data = [
        BranchCandidateData(branch_name=k, candidates=v)
        for k, v in branch_map.items()
    ]
    
    # Sort branch data by branch name
    branch_data.sort(key=lambda x: x.branch_name)
    
    
    return AdminDashboardStats(
        total_candidates=total_candidates,
        conversion_rate=conversion_rate,
        stage_breakdown=dict(stage_breakdown),
        bottlenecks=BottleneckStats(
            on_hold=bottlenecks["on_hold"],
            pending_interviews=bottlenecks["pending_interviews"]
        ),
        branch_data=branch_data
    )

from datetime import datetime, timedelta, UTC
from sqlalchemy import or_, and_
from app.schemas.candidate import CandidatePaginatedOut
from app.services.candidate_service import to_candidate_list_out

@router.get("/bottlenecks", response_model=CandidatePaginatedOut)
def get_bottlenecks(
    filter_mode: str = "ALL",
    search: str | None = None,
    page: int = 1,
    limit: int = 50,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN))
):
    skip = (page - 1) * limit
    q = db.query(Candidate)
    
    three_days_ago = datetime.now(UTC) - timedelta(days=3)
    
    conds = []
    if filter_mode in ("ALL", "ON_HOLD"):
        conds.append(Candidate.current_stage == PipelineStage.ON_HOLD)
        
    if filter_mode in ("ALL", "INTERVIEWS"):
        conds.append(and_(
            Candidate.current_stage.in_([
                PipelineStage.BRANCH_INTERVIEW, 
                PipelineStage.HO_INTERVIEWS, 
                PipelineStage.CSS
            ]),
            Candidate.updated_at < three_days_ago
        ))
        
    if conds:
        q = q.filter(or_(*conds))
    else:
        # If somehow filter_mode is unrecognized, return nothing
        q = q.filter(Candidate.id == None)
        
    if search:
        search_term = f"%{search}%"
        q = q.filter(
            or_(
                Candidate.full_name.ilike(search_term),
                Candidate.phone.ilike(search_term),
                Candidate.email.ilike(search_term)
            )
        )
        
    total_count = q.count()
    
    # Sort by staleness (oldest updated first)
    q = q.order_by(Candidate.updated_at.asc()).offset(skip).limit(limit)
    rows = q.all()
    
    data = [to_candidate_list_out(row, False) for row in rows]
    
    return CandidatePaginatedOut(
        data=data,
        total_count=total_count,
        page=page,
        limit=limit
    )
