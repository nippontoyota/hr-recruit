from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict
from app.models.enums import EvaluationType, InterviewStatus, InterviewMode, EvaluationVerdict


class TechnicalQuestionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    department: str
    text: str
    options: dict
    answer: str

class EvaluationSchedule(BaseModel):
    interview_mode: InterviewMode | None = None
    scheduled_time: datetime | None = None
    location_or_link: str | None = None
    interviewer_id: UUID | None = None


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
    candidate_email: str | None = None
    candidate_phone: str | None = None
    candidate_location: str | None = None
    candidate_source: str | None = None
    candidate_skills: str | None = None
    candidate_current_salary: str | None = None
    candidate_expected_salary: str | None = None
    candidate_notice_period: str | None = None
    previous_remarks: list[dict] = []
    is_already_submitted: bool = False


class EvaluationPublicSubmit(BaseModel):
    verdict: EvaluationVerdict
    remarks: str
    scores: dict | None = None


class CandidateTestSubmit(BaseModel):
    answers: dict[str, str]


class EvaluationWhatsAppInvite(BaseModel):
    to_phone: str
    recipient_type: str = "CANDIDATE"
    variables: dict[str, str]
