from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict
from app.models.enums import EvaluationType, InterviewStatus, InterviewMode, EvaluationVerdict


class EvaluationSchedule(BaseModel):
    interview_mode: InterviewMode | None = None
    scheduled_time: datetime | None = None
    location_or_link: str | None = None


class EvaluationSubmitScorecard(BaseModel):
    verdict: EvaluationVerdict | None = None
    remarks: str | None = None
    scores: dict | None = None


class EvaluationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    candidate_id: UUID
    type: EvaluationType
    status: InterviewStatus
    interview_mode: InterviewMode | None = None
    scheduled_time: datetime | None = None
    location_or_link: str | None = None
    verdict: EvaluationVerdict | None = None
    remarks: str | None = None
    scores: dict | None = None
    created_at: datetime
    updated_at: datetime


class EvaluationTokenOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    token: str
    expires_at: datetime


class EvaluationPublicOut(BaseModel):
    id: UUID
    type: EvaluationType
    candidate_name: str
    candidate_position: str
    candidate_resume_url: str | None = None
    candidate_education: str | None = None
    candidate_experience: str | None = None
    previous_remarks: list[dict] = []


class EvaluationPublicSubmit(BaseModel):
    verdict: EvaluationVerdict
    remarks: str
    scores: dict | None = None


class CandidateTestSubmit(BaseModel):
    answers: dict
