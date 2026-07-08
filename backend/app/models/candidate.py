import uuid
from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import PipelineStage, SourceChannel


class Candidate(Base):
    """
    A person in the hiring pipeline.
    candidate_id (NT-2026-00001) is the human-readable ID shown to HR; internal id is UUID.
    """

    __tablename__ = "candidates"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    candidate_id: Mapped[str] = mapped_column(String(20), unique=True, nullable=False, index=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    phone: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    date_of_birth: Mapped[date | None] = mapped_column(Date, nullable=True)
    source_channel: Mapped[SourceChannel] = mapped_column(
        Enum(SourceChannel, name="source_channel"), nullable=False
    )
    is_rejoining: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_duplicate_flagged: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    duplicate_of_candidate_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("candidates.id"), nullable=True
    )
    current_stage: Mapped[PipelineStage] = mapped_column(
        Enum(PipelineStage, name="pipeline_stage"),
        nullable=False,
        default=PipelineStage.NEW_APPLICATION,
        index=True,
    )
    applied_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    assigned_hr_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    branch_location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # Structured fields from the recruitment application form (personal, education, work history, etc.)
    application_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True, default=dict)
    profile_completeness_pct: Mapped[int | None] = mapped_column(Integer, nullable=True)
    notes_summary: Mapped[str | None] = mapped_column(Text, nullable=True)

    assigned_hr = relationship("User", foreign_keys=[assigned_hr_user_id])
    duplicate_of = relationship("Candidate", remote_side=[id], foreign_keys=[duplicate_of_candidate_id])
    stage_history = relationship("StageHistory", back_populates="candidate", order_by="StageHistory.created_at")
    remarks = relationship("Remark", back_populates="candidate", order_by="Remark.created_at")
    documents = relationship("Document", back_populates="candidate")
    messages = relationship("Message", back_populates="candidate")
