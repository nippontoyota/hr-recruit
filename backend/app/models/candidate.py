import uuid
from datetime import datetime

from sqlalchemy import Index, Boolean, DateTime, Enum, ForeignKey, String, func, FetchedValue
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import TYPE_CHECKING, List

from app.core.config import settings
from app.core.database import Base
from app.models.enums import PipelineStage, FormStatus
from app.models.evaluation import Evaluation

if TYPE_CHECKING:
    from app.models.candidate_profile import CandidateProfile
    from app.models.communication import Communication
    from app.models.followup import FollowUp


SCHEMA = settings.db_schema


class Candidate(Base):
    __tablename__ = "candidates"

    __table_args__ = (
        Index("ix_candidate_stage_created", "current_stage", "created_at"),
        {"schema": SCHEMA} if SCHEMA else None,
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    candidate_id: Mapped[str] = mapped_column(String(20), unique=True, nullable=False, index=True, server_default=FetchedValue())
    full_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    phone: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    source: Mapped[str] = mapped_column(String(100), nullable=False, server_default="Unknown")
    source_reference: Mapped[str | None] = mapped_column(String(255), nullable=True)
    position_applied_for: Mapped[str] = mapped_column(String(255), nullable=False, server_default="Unknown")
    experience: Mapped[str] = mapped_column(
        String(50), nullable=False, server_default="Fresher", default="Fresher"
    )
    current_stage: Mapped[PipelineStage] = mapped_column(
        Enum(PipelineStage, name="pipeline_stage", schema=SCHEMA, create_type=False),
        nullable=False,
        default=PipelineStage.CALL_LETTER,
        index=True,
    )
    department: Mapped[str | None] = mapped_column(String(255), nullable=True)
    branch_location: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    is_duplicate_flagged: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    duplicate_of_candidate_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey(f"{SCHEMA}.candidates.id"), nullable=True, index=True
    )
    assigned_hr_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey(f"{SCHEMA}.users.id"), nullable=True, index=True
    )
    assigned_manager_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey(f"{SCHEMA}.users.id"), nullable=True, index=True
    )
    assigned_gm_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey(f"{SCHEMA}.users.id"), nullable=True, index=True
    )
    is_head_office_hire: Mapped[bool] = mapped_column(Boolean, server_default="false", default=False, nullable=False)
    interviewer_assignments: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    offer_status: Mapped[str | None] = mapped_column(String(50), nullable=True) # PENDING, ACCEPTED, DECLINED
    salary_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True) # Mapped from Bulk Excel Upload
    
    # Visit Scheduling Fields
    visit_branch: Mapped[str | None] = mapped_column(String(255), nullable=True)
    visit_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    visit_time: Mapped[str | None] = mapped_column(String(50), nullable=True)
    visit_maps_link: Mapped[str | None] = mapped_column(String, nullable=True)
    visit_instructions: Mapped[str | None] = mapped_column(String, nullable=True)
    
    # Pre-Form Tracking
    pre_form_token: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True, index=True)
    pre_form_token_purpose: Mapped[str | None] = mapped_column(String(20), nullable=True)
    pre_form_token_revoked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, server_default="false")
    pre_form_status: Mapped[FormStatus] = mapped_column(
        Enum(FormStatus, name="form_status", schema=SCHEMA, create_type=False),
        nullable=False,
        default=FormStatus.NOT_SENT
    )
    pre_form_sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    pre_form_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    pre_form_submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


    applied_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    profile: Mapped["CandidateProfile"] = relationship("CandidateProfile", back_populates="candidate", uselist=False, cascade="all, delete-orphan", passive_deletes=True)
    communications: Mapped[List["Communication"]] = relationship("Communication", back_populates="candidate", cascade="all, delete-orphan", passive_deletes=True)
    followups: Mapped[List["FollowUp"]] = relationship("FollowUp", back_populates="candidate", cascade="all, delete-orphan", passive_deletes=True)
    evaluations: Mapped[List["Evaluation"]] = relationship("Evaluation", back_populates="candidate", cascade="all, delete-orphan", passive_deletes=True)


