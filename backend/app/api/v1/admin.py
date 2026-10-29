from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, select
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
    try:
        # The grouped stage count is enough to derive the total, so this avoids a
        # second full-table aggregate on every dashboard visit.
        stage_counts = db.execute(
            select(Candidate.current_stage, func.count(Candidate.id)).group_by(Candidate.current_stage)
        ).all()
        stage_breakdown = {}
        for stage, count in stage_counts:
            key = stage.value if hasattr(stage, "value") else str(stage) if stage is not None else "UNKNOWN"
            stage_breakdown[key] = count
        total_candidates = sum(stage_breakdown.values())
        
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
            
        branch_name = func.coalesce(Candidate.branch_location, "Head Office").label("branch_name")
        ranked_candidates = (
            select(
                Candidate.id,
                Candidate.full_name,
                Candidate.department,
                Candidate.current_stage,
                Candidate.created_at,
                branch_name,
                func.row_number().over(
                    partition_by=branch_name,
                    order_by=Candidate.created_at.desc(),
                ).label("branch_rank"),
            )
            .where(Candidate.current_stage.notin_([PipelineStage.HIRED, PipelineStage.REJECTED]))
            .subquery()
        )
        branch_map = defaultdict(list)
        active_candidates = db.execute(
            select(
                ranked_candidates.c.id,
                ranked_candidates.c.full_name,
                ranked_candidates.c.department,
                ranked_candidates.c.current_stage,
                ranked_candidates.c.created_at,
                ranked_candidates.c.branch_name,
            )
            .where(ranked_candidates.c.branch_rank <= 10)
            .order_by(ranked_candidates.c.branch_name.asc(), ranked_candidates.c.created_at.desc())
        ).all()

        for candidate_id, full_name, department, current_stage, created_at, candidate_branch in active_candidates:
            created_at_str = (
                created_at.isoformat()
                if hasattr(created_at, "isoformat")
                else str(created_at or "")
            )
            branch_map[candidate_branch].append(
                CandidateDetail(
                    id=candidate_id,
                    full_name=full_name or "Unknown",
                    department=department,
                    current_stage=current_stage,
                    created_at=created_at_str,
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
    except Exception as exc:
        import logging
        logging.getLogger(__name__).error(f"Error fetching dashboard stats: {exc}", exc_info=True)
        return AdminDashboardStats(
            total_candidates=0,
            conversion_rate=0.0,
            stage_breakdown={},
            bottlenecks=BottleneckStats(on_hold=0, pending_interviews=0),
            branch_data=[]
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
