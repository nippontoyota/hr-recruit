import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String, func, FetchedValue
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import List

from app.core.config import settings
from app.core.database import Base
from app.models.enums import PipelineStage, FormStatus
from app.models.evaluation import Evaluation

SCHEMA = settings.db_schema


class Candidate(Base):
    __tablename__ = "candidates"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    candidate_id: Mapped[str] = mapped_column(String(20), unique=True, nullable=False, index=True, server_default=FetchedValue())
    full_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    phone: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    source: Mapped[str] = mapped_column(String(100), nullable=False, server_default="Unknown")
    source_reference: Mapped[str | None] = mapped_column(String(255), nullable=True)
    position_applied_for: Mapped[str] = mapped_column(String(255), nullable=False, server_default="Unknown")
    current_stage: Mapped[PipelineStage] = mapped_column(
        Enum(PipelineStage, name="pipeline_stage", schema=SCHEMA, create_type=False),
        nullable=False,
        default=PipelineStage.SCREENING,
        index=True,
    )
    branch_location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_duplicate_flagged: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    duplicate_of_candidate_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey(f"{SCHEMA}.candidates.id"), nullable=True
    )
    assigned_hr_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey(f"{SCHEMA}.users.id"), nullable=True
    )
    assigned_manager_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey(f"{SCHEMA}.users.id"), nullable=True
    )
    assigned_gm_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey(f"{SCHEMA}.users.id"), nullable=True
    )
    is_head_office_hire: Mapped[bool] = mapped_column(Boolean, server_default="false", default=False, nullable=False)
    interviewer_assignments: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    
    # Pre-Form Tracking
    pre_form_token: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True, index=True)
    pre_form_status: Mapped[FormStatus] = mapped_column(
        Enum(FormStatus, name="form_status", schema=SCHEMA, create_type=False),
        nullable=False,
        default=FormStatus.NOT_SENT
    )
    pre_form_sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    pre_form_submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    applied_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    profile: Mapped["CandidateProfile"] = relationship("CandidateProfile", back_populates="candidate", uselist=False, cascade="all, delete-orphan")
    communications: Mapped[List["Communication"]] = relationship("Communication", back_populates="candidate", cascade="all, delete-orphan")
    followups: Mapped[List["FollowUp"]] = relationship("FollowUp", back_populates="candidate", cascade="all, delete-orphan")
    evaluations: Mapped[List["Evaluation"]] = relationship("Evaluation", back_populates="candidate", cascade="all, delete-orphan")

