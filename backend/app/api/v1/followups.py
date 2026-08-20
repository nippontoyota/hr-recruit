from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from datetime import datetime

from app.core.database import get_db
from app.core.deps import require_roles
from app.core.access import assert_candidate_access, assert_local_hr_can_mutate, get_candidate_for_user
from app.models.candidate import Candidate
from app.models.followup import FollowUp
from app.models.enums import UserRole, FollowUpPriority, FollowUpStatus
from app.models.user import User
from pydantic import BaseModel, ConfigDict

router = APIRouter(prefix="/followups", tags=["followups"])

class FollowUpCreate(BaseModel):
    candidate_id: UUID
    title: str
    description: str | None = None
    due_at: datetime
    priority: FollowUpPriority = FollowUpPriority.MEDIUM
    assigned_to: UUID | None = None

class FollowUpUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    due_at: datetime | None = None
    priority: FollowUpPriority | None = None
    status: FollowUpStatus | None = None
    assigned_to: UUID | None = None

class FollowUpOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    candidate_id: UUID
    title: str
    description: str | None
    due_at: datetime
    priority: FollowUpPriority
    status: FollowUpStatus
    assigned_to: UUID | None
    completed_at: datetime | None
    created_by: UUID | None
    created_at: datetime

class FollowUpPaginatedOut(BaseModel):
    data: List[FollowUpOut]
    total_count: int
    page: int
    limit: int

@router.post("", response_model=FollowUpOut, status_code=201)
def create_followup(
    body: FollowUpCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.HO_HR, UserRole.LOCAL_HR)),
):
    row = db.get(Candidate, body.candidate_id)
    if not row:
        raise HTTPException(status_code=404, detail="Candidate not found.")
    assert_candidate_access(user, row, db)
    assert_local_hr_can_mutate(user, row, db)
        
    fu = FollowUp(
        candidate_id=body.candidate_id,
        title=body.title,
        description=body.description,
        due_at=body.due_at,
        priority=body.priority,
        assigned_to=body.assigned_to,
        created_by=user.id
    )
    db.add(fu)
    db.commit()
    db.refresh(fu)
    return fu

@router.get("", response_model=FollowUpPaginatedOut)
def list_followups(
    page: int = 1,
    limit: int = 50,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.HO_HR, UserRole.LOCAL_HR)),
):
    from sqlalchemy import func
    skip = (page - 1) * limit
    q = select(FollowUp)
    if user.role == UserRole.LOCAL_HR:
        q = q.where(FollowUp.assigned_to == user.id)
        
    total_count = db.scalar(select(func.count()).select_from(q.subquery())) or 0
    q = q.order_by(FollowUp.due_at.asc()).offset(skip).limit(limit)
    data = list(db.scalars(q).all())
    
    return FollowUpPaginatedOut(
        data=data,
        total_count=total_count,
        page=page,
        limit=limit
    )

@router.get("/candidate/{candidate_id}", response_model=List[FollowUpOut])
def list_candidate_followups(
    candidate_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.HO_HR, UserRole.LOCAL_HR)),
):
    get_candidate_for_user(db, candidate_id, user)
    return list(db.scalars(
        select(FollowUp)
        .where(FollowUp.candidate_id == candidate_id)
        .order_by(FollowUp.due_at.asc())
    ).all())

@router.patch("/{id}", response_model=FollowUpOut)
def update_followup(
    id: UUID,
    body: FollowUpUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.HO_HR, UserRole.LOCAL_HR)),
):
    fu = db.get(FollowUp, id)
    if not fu:
        raise HTTPException(status_code=404, detail="FollowUp not found.")
    get_candidate_for_user(db, fu.candidate_id, user, write=True)
    
    update_data = body.model_dump(exclude_unset=True)
    if "status" in update_data and update_data["status"] == FollowUpStatus.COMPLETED and fu.status != FollowUpStatus.COMPLETED:
        fu.completed_at = datetime.now()
        
    for k, v in update_data.items():
        setattr(fu, k, v)
        
    db.commit()
    db.refresh(fu)
    return fu

@router.delete("/{id}", status_code=204)
def delete_followup(
    id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.HO_HR, UserRole.LOCAL_HR)),
):
    fu = db.get(FollowUp, id)
    if not fu:
        raise HTTPException(status_code=404, detail="FollowUp not found.")
    get_candidate_for_user(db, fu.candidate_id, user, write=True)
    db.delete(fu)
    db.commit()
