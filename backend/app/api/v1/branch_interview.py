from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select
from pydantic import BaseModel
from datetime import datetime

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.models.branch_interview import BranchInterview
from app.models.candidate import Candidate
from app.models.activity_log import ActivityLog
from app.models.enums import PipelineStage, InterviewMode, InterviewStatus, ActivityType
from app.schemas.candidate import WhatsAppInviteCreate
from app.services.doubletick import send_template

router = APIRouter(prefix="/candidates/{candidate_id}/branch-interview", tags=["Branch Interview"])


class BranchInterviewUpdate(BaseModel):
    interview_mode: InterviewMode | None = None
    scheduled_time: datetime | None = None
    location_or_link: str | None = None
    status: InterviewStatus | None = None
    
    current_salary: str | None = None
    expected_salary: str | None = None
    notice_period: str | None = None


class BranchInterviewResponse(BranchInterviewUpdate):
    id: UUID
    candidate_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


@router.get("", response_model=BranchInterviewResponse | None)
def get_branch_interview(
    candidate_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    candidate = db.scalars(select(Candidate).where(Candidate.id == candidate_id)).first()
    if not candidate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found")
        
    interview = db.scalars(select(BranchInterview).where(BranchInterview.candidate_id == candidate_id)).first()
    return interview


@router.patch("", response_model=BranchInterviewResponse)
def submit_branch_interview(
    candidate_id: UUID,
    data: BranchInterviewUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    candidate = db.scalars(select(Candidate).where(Candidate.id == candidate_id)).first()
    if not candidate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found")
        
    interview = db.scalars(select(BranchInterview).where(BranchInterview.candidate_id == candidate_id)).first()
    if not interview:
        interview = BranchInterview(candidate_id=candidate_id)
        db.add(interview)
        
    for key, value in data.dict(exclude_unset=True).items():
        setattr(interview, key, value)
        
    if data.interview_mode or data.scheduled_time or data.location_or_link:
        if not interview.status or interview.status == InterviewStatus.PENDING_SCHEDULE:
            interview.status = InterviewStatus.SCHEDULED
            

    db.commit()
    db.refresh(interview)
        
    return interview


@router.post("/send-invite")
def send_branch_interview_invite(
    candidate_id: UUID,
    body: WhatsAppInviteCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    candidate = db.scalars(select(Candidate).where(Candidate.id == candidate_id)).first()
    if not candidate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found")
        
    interview = db.scalars(select(BranchInterview).where(BranchInterview.candidate_id == candidate_id)).first()
    if not interview or interview.status == InterviewStatus.PENDING_SCHEDULE:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Interview is not scheduled yet")

    DOUBLETICK_VARIABLE_KEYS = [
        "candidateName",
        "position",
        "date",
        "time",
        "mode",
        "locationOrLink",
        "recruiterName",
    ]
    
    placeholders = []
    for key in DOUBLETICK_VARIABLE_KEYS:
        val = body.variables.get(key, "") if body.variables else ""
        placeholders.append(val)
        
    try:
        res = send_template(
            to_phone=candidate.phone,
            template_name="nippon_hr_interview_invite",
            placeholders=placeholders,
        )
        external_message_id = None
        messages = res.get("messages", []) if res else []
        if messages:
            external_message_id = messages[0].get("id")
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Failed to send invite: {str(e)}")
        
    log = ActivityLog(
        candidate_id=candidate.id,
        activity_type=ActivityType.CALL,
        title="Branch Interview Invite Sent",
        description="WhatsApp invite for Branch interview sent to candidate." + (f" Message ID: {external_message_id}" if external_message_id else ""),
        created_by_user_id=current_user.id,
    )
    db.add(log)
    db.commit()
    
    return {"status": "success", "message": "WhatsApp invite sent successfully"}
