from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_roles
from app.core.access import assert_candidate_access, get_candidate_for_user
from app.models.candidate import Candidate
from app.models.communication import Communication
from app.models.enums import UserRole, CommunicationType, CommunicationDirection, CommunicationStatus, ActivityType
from app.models.user import User
from app.models.activity_log import ActivityLog
from pydantic import BaseModel, ConfigDict
from datetime import datetime

router = APIRouter(prefix="/communications", tags=["communications"])

class CommunicationCreate(BaseModel):
    candidate_id: UUID
    type: CommunicationType
    content: str
    send: bool = False

class CommunicationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    candidate_id: UUID
    type: CommunicationType
    direction: CommunicationDirection
    status: CommunicationStatus
    subject: str | None
    content_preview: str
    external_message_id: str | None
    created_by: UUID | None
    created_at: datetime

@router.post("", response_model=CommunicationOut, status_code=201)
def create_communication(
    body: CommunicationCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.LOCAL_HR)),
):
    row = db.get(Candidate, body.candidate_id)
    if not row:
        raise HTTPException(status_code=404, detail="Candidate not found.")
    assert_candidate_access(user, row)
        
    comm = Communication(
        candidate_id=body.candidate_id,
        type=body.type,
        direction=CommunicationDirection.OUTGOING,
        status=CommunicationStatus.SENT if body.send else CommunicationStatus.PENDING,
        content_preview=body.content[:255],
        created_by=user.id
    )
    db.add(comm)
    
    # Log to activity
    log = ActivityLog(
        candidate_id=body.candidate_id,
        activity_type=ActivityType.WHATSAPP if body.type == CommunicationType.WHATSAPP else ActivityType.EMAIL,
        title=f"Sent {body.type.value.title()}",
        description=f"Message: {body.content[:100]}...",
        created_by_user_id=user.id
    )
    db.add(log)
    
    db.commit()
    db.refresh(comm)
    return comm

@router.get("/candidate/{candidate_id}", response_model=List[CommunicationOut])
def list_candidate_communications(
    candidate_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.LOCAL_HR)),
):
    get_candidate_for_user(db, candidate_id, user)
    return list(db.scalars(
        select(Communication)
        .where(Communication.candidate_id == candidate_id)
        .order_by(Communication.created_at.desc())
    ).all())
