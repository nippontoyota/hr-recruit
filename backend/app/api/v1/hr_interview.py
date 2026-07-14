from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select
from pydantic import BaseModel
from datetime import datetime

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.models.hr_interview import HRInterview
from app.models.candidate import Candidate
from app.models.enums import InterviewVerdict, PipelineStage, InterviewMode, InterviewStatus

router = APIRouter(prefix="/candidates/{candidate_id}/hr-interview", tags=["HR Interview"])


class HRInterviewUpdate(BaseModel):
    interview_mode: InterviewMode | None = None
    scheduled_time: datetime | None = None
    location_or_link: str | None = None
    status: InterviewStatus | None = None
    communication_score: int | None = None
    technical_score: int | None = None
    experience_score: int | None = None
    cultural_fit_score: int | None = None
    current_salary: str | None = None
    expected_salary: str | None = None
    notice_period: str | None = None
    verdict: InterviewVerdict | None = None
    remarks: str | None = None


class HRInterviewResponse(HRInterviewUpdate):
    id: UUID
    candidate_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


@router.get("", response_model=HRInterviewResponse | None)
def get_hr_interview(
    candidate_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    candidate = db.scalars(select(Candidate).where(Candidate.id == candidate_id)).first()
    if not candidate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found")
        
    interview = db.scalars(select(HRInterview).where(HRInterview.candidate_id == candidate_id)).first()
    return interview


@router.post("", response_model=HRInterviewResponse)
def submit_hr_interview(
    candidate_id: UUID,
    data: HRInterviewUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    candidate = db.scalars(select(Candidate).where(Candidate.id == candidate_id)).first()
    if not candidate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found")
        
    interview = db.scalars(select(HRInterview).where(HRInterview.candidate_id == candidate_id)).first()
    if not interview:
        interview = HRInterview(candidate_id=candidate_id)
        db.add(interview)
        
    for key, value in data.dict(exclude_unset=True).items():
        setattr(interview, key, value)
        
    if data.interview_mode or data.scheduled_time or data.location_or_link:
        if not interview.status or interview.status == InterviewStatus.PENDING_SCHEDULE:
            interview.status = InterviewStatus.SCHEDULED
            
    # Update candidate stage based on final verdict if present
    if data.verdict:
        interview.status = InterviewStatus.EVALUATED
        if data.verdict == InterviewVerdict.SELECTED:
            candidate.current_stage = PipelineStage.DEPARTMENT_INTERVIEW
        elif data.verdict == InterviewVerdict.REJECTED:
            candidate.current_stage = PipelineStage.REJECTED
        elif data.verdict == InterviewVerdict.ON_HOLD:
            candidate.current_stage = PipelineStage.ON_HOLD
            
    db.commit()
    db.refresh(interview)
        
    return interview
