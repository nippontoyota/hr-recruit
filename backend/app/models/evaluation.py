import uuid
from datetime import datetime
from sqlalchemy import DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.config import settings
from app.core.database import Base
from app.models.enums import EvaluationType, InterviewStatus, InterviewMode, EvaluationVerdict

SCHEMA = settings.db_schema


class Evaluation(Base):
    __tablename__ = "evaluations"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    candidate_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey(f"{SCHEMA}.candidates.id", ondelete="CASCADE"), index=True, nullable=False
    )
    type: Mapped[EvaluationType] = mapped_column(
        Enum(EvaluationType, name="evaluation_type", schema=SCHEMA, create_type=False),
        nullable=False
    )
    status: Mapped[InterviewStatus] = mapped_column(
        Enum(InterviewStatus, name="interview_status", schema=SCHEMA, create_type=False),
        default=InterviewStatus.PENDING_SCHEDULE,
        nullable=False
    )
    interview_mode: Mapped[InterviewMode | None] = mapped_column(
        Enum(InterviewMode, name="interview_mode", schema=SCHEMA, create_type=False),
        nullable=True
    )
    scheduled_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    location_or_link: Mapped[str | None] = mapped_column(String, nullable=True)
    verdict: Mapped[EvaluationVerdict | None] = mapped_column(
        Enum(EvaluationVerdict, name="evaluation_verdict", schema=SCHEMA, create_type=False),
        nullable=True
    )
    remarks: Mapped[str | None] = mapped_column(Text, nullable=True)
    scores: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    candidate = relationship("Candidate", back_populates="evaluations")
    tokens = relationship("EvaluationToken", back_populates="evaluation", cascade="all, delete-orphan")

