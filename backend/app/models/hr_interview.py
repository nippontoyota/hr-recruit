import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.config import settings
from app.core.database import Base
from app.models.enums import InterviewMode, InterviewStatus, InterviewVerdict

SCHEMA = settings.db_schema


class HRInterview(Base):
    __tablename__ = "hr_interviews"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    candidate_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey(f"{SCHEMA}.candidates.id", ondelete="CASCADE"), index=True, unique=True
    )
    
    interview_mode: Mapped[InterviewMode | None] = mapped_column(
        Enum(InterviewMode, name="interview_mode", schema=SCHEMA, create_type=False),
        nullable=True
    )
    scheduled_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    location_or_link: Mapped[str | None] = mapped_column(String, nullable=True)
    status: Mapped[InterviewStatus] = mapped_column(
        Enum(InterviewStatus, name="interview_status", schema=SCHEMA, create_type=False),
        default=InterviewStatus.PENDING_SCHEDULE, nullable=False
    )
    
    communication_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    technical_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    experience_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    cultural_fit_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    
    current_salary: Mapped[str | None] = mapped_column(String, nullable=True)
    expected_salary: Mapped[str | None] = mapped_column(String, nullable=True)
    notice_period: Mapped[str | None] = mapped_column(String, nullable=True)
    
    verdict: Mapped[InterviewVerdict | None] = mapped_column(
        Enum(InterviewVerdict, name="interview_verdict", schema=SCHEMA, create_type=False),
        nullable=True
    )
    remarks: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
