from typing import TYPE_CHECKING
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.config import settings
from app.core.database import Base

if TYPE_CHECKING:
    from app.models.candidate import Candidate


SCHEMA = settings.db_schema


class CandidateProfile(Base):
    """
    Stores the structured pre-form / application data to replace the monolithic JSONB blob.
    Future-proofed with a version column if candidate resubmits.
    """
    __tablename__ = "candidate_profiles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    candidate_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey(f"{SCHEMA}.candidates.id", ondelete="CASCADE"), index=True
    )
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    
    # Core Pre-Form Fields
    current_location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    experience_level: Mapped[str | None] = mapped_column(String(50), nullable=True) # e.g. Fresher / Experienced
    total_experience: Mapped[str | None] = mapped_column(String(100), nullable=True)
    current_company: Mapped[str | None] = mapped_column(String(255), nullable=True)
    expected_salary: Mapped[str | None] = mapped_column(String(100), nullable=True)
    joining_date: Mapped[str | None] = mapped_column(String(100), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    resume_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    photo_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    raw_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    
    # Audit
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    candidate: Mapped["Candidate"] = relationship("Candidate", back_populates="profile")
