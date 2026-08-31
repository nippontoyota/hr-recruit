import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.config import settings
from app.core.database import Base
from app.models.enums import InterviewMode, CommunicationType

SCHEMA = settings.db_schema

# LOCAL_HR accounts — one roster / location list per branch
HR_BRANCHES = (
    "Head Office",
    "Trivandrum",
    "Kollam",
    "Pathanamthitta",
    "Kayamkulam",
    "Kottayam",
    "Muvattupuzha",
    "Kalamassery",
    "Cochin",
    "Thrissur",
)


class LocationTemplate(Base):
    __tablename__ = "location_templates"
    __table_args__ = (
        UniqueConstraint("branch_location", "name", name="uq_location_templates_branch_name"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    branch_location: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    location_or_link: Mapped[str] = mapped_column(Text, nullable=False)
    mode: Mapped[InterviewMode] = mapped_column(
        Enum(InterviewMode, name="interview_mode", schema=SCHEMA, create_type=False),
        nullable=False,
    )
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class MessageTemplate(Base):
    __tablename__ = "message_templates"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[CommunicationType] = mapped_column(
        Enum(CommunicationType, name="communication_type", schema=SCHEMA, create_type=False),
        nullable=False,
    )
    subject: Mapped[str | None] = mapped_column(String(255), nullable=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class TouchpointTemplate(Base):
    """Per-branch reusable meeting point / touch-point presets for the call letter."""

    __tablename__ = "touchpoint_templates"
    __table_args__ = (
        UniqueConstraint("branch_location", "name", name="uq_touchpoint_templates_branch_name"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    branch_location: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    meeting_point: Mapped[str] = mapped_column(Text, nullable=False)
    touch_point_1_label: Mapped[str] = mapped_column(String(255), nullable=False)
    touch_point_1_phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    touch_point_2_label: Mapped[str | None] = mapped_column(String(255), nullable=True)
    touch_point_2_phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class InterviewerName(Base):
    """Per-branch interviewer roster for scorecards."""

    __tablename__ = "interviewer_names"
    __table_args__ = (
        UniqueConstraint("branch_location", "name", name="uq_interviewer_names_branch_name"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    branch_location: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
