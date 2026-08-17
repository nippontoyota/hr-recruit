from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_roles
from app.core.access import assert_candidate_access, assert_local_hr_can_mutate, get_candidate_for_user
from app.models.candidate import Candidate
from app.models.communication import Communication
from app.models.enums import UserRole, CommunicationType, CommunicationDirection, CommunicationStatus, ActivityType
from app.models.user import User
from app.models.activity_log import ActivityLog
from pydantic import BaseModel
from datetime import datetime

router = APIRouter(prefix="/communications", tags=["communications"])

class CommunicationCreate(BaseModel):
    candidate_id: UUID
    type: CommunicationType
    content: str
    send: bool = False

class CommunicationOut(BaseModel):
    id: UUID
    candidate_id: UUID
    channel: str
    type: CommunicationType
    direction: CommunicationDirection
    status: CommunicationStatus
    recipient: str | None
    subject: str | None
    content_preview: str
    preview: str
    external_message_id: str | None
    created_by: UUID | None
    sender: str | None
    created_at: datetime
    sent_at: datetime | None
    failure_reason: str | None


def _failure_reason(db: Session, comm: Communication) -> str | None:
    if comm.status != CommunicationStatus.FAILED:
        return None
    activity_type = ActivityType.WHATSAPP if comm.type == CommunicationType.WHATSAPP else ActivityType.EMAIL
    logs = db.scalars(
        select(ActivityLog)
        .where(
            ActivityLog.candidate_id == comm.candidate_id,
            ActivityLog.activity_type == activity_type,
            ActivityLog.created_at >= comm.created_at,
        )
        .order_by(ActivityLog.created_at.asc())
    ).all()
    for log in logs:
        if "error:" in (log.description or '').lower():
            return log.description.split("Error:", 1)[-1].strip()
    return "Provider did not accept this message."


def _communication_out(db: Session, comm: Communication) -> CommunicationOut:
    candidate = db.get(Candidate, comm.candidate_id)
    sender = db.get(User, comm.created_by) if comm.created_by else None
    recipient = None
    if candidate:
        recipient = candidate.email if comm.type == CommunicationType.EMAIL else candidate.phone
    return CommunicationOut(
        id=comm.id,
        candidate_id=comm.candidate_id,
        channel=comm.type.value,
        type=comm.type,
        direction=comm.direction,
        status=comm.status,
        recipient=recipient,
        subject=comm.subject,
        content_preview=comm.content_preview,
        preview=comm.content_preview,
        external_message_id=comm.external_message_id,
        created_by=comm.created_by,
        sender=sender.full_name if sender else None,
        created_at=comm.created_at,
        sent_at=comm.created_at if comm.status in {
            CommunicationStatus.SENT,
            CommunicationStatus.DELIVERED,
            CommunicationStatus.READ,
        } else None,
        failure_reason=_failure_reason(db, comm),
    )

@router.post("", response_model=CommunicationOut, status_code=201)
def create_communication(
    body: CommunicationCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.HO_HR, UserRole.LOCAL_HR)),
):
    row = db.get(Candidate, body.candidate_id)
    if not row:
        raise HTTPException(status_code=404, detail="Candidate not found.")
    assert_candidate_access(user, row, db)
    assert_local_hr_can_mutate(user, row, db)
        
    comm = Communication(
        candidate_id=body.candidate_id,
        type=body.type,
        direction=CommunicationDirection.OUTGOING,
        # This generic endpoint only records a communication draft. It has no
        # provider call, so it must never claim that a message was sent.
        status=CommunicationStatus.PENDING,
        content_preview=body.content[:255],
        created_by=user.id
    )
    db.add(comm)
    
    # Log to activity
    log = ActivityLog(
        candidate_id=body.candidate_id,
        activity_type=ActivityType.WHATSAPP if body.type == CommunicationType.WHATSAPP else ActivityType.EMAIL,
        title=f"Communication recorded ({body.type.value.title()})",
        description=(
            f"Message recorded as pending; no provider was called. Preview: {body.content[:100]}..."
            if body.send else f"Message draft: {body.content[:100]}..."
        ),
        created_by_user_id=user.id
    )
    db.add(log)
    
    db.commit()
    db.refresh(comm)
    return _communication_out(db, comm)

@router.get("/candidate/{candidate_id}", response_model=List[CommunicationOut])
def list_candidate_communications(
    candidate_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.HO_HR, UserRole.LOCAL_HR)),
):
    get_candidate_for_user(db, candidate_id, user)
    rows = db.scalars(
        select(Communication)
        .where(Communication.candidate_id == candidate_id)
        .order_by(Communication.created_at.desc())
    ).all()
    return [_communication_out(db, row) for row in rows]
