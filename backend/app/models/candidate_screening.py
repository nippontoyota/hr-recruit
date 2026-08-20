import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.config import settings
from app.core.database import Base
from app.models.enums import ScreeningStatus

SCHEMA = settings.db_schema


class CandidateScreening(Base):
    __tablename__ = "candidate_screening"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    candidate_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey(f"{SCHEMA}.candidates.id", ondelete="CASCADE"), index=True, unique=True
    )
    
    status: Mapped[ScreeningStatus] = mapped_column(
        Enum(ScreeningStatus, name="screening_status", schema=SCHEMA, create_type=False),
        nullable=False,
        default=ScreeningStatus.PENDING
    )
    
    call_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    interest_confirmed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    salary_discussed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    notice_period_discussed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    basic_eligibility_checked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    
    remarks: Mapped[str | None] = mapped_column(Text, nullable=True)
    pending_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    follow_up_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    
    visit_branch: Mapped[str | None] = mapped_column(String, nullable=True)
    branch_visit_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    maps_link: Mapped[str | None] = mapped_column(Text, nullable=True)
    extra_instructions: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
