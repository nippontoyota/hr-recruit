from typing import TYPE_CHECKING
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.config import settings
from app.core.database import Base
from app.models.enums import CommunicationType, CommunicationDirection, CommunicationStatus

if TYPE_CHECKING:
    from app.models.candidate import Candidate


SCHEMA = settings.db_schema


class Communication(Base):
    __tablename__ = "communications"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    candidate_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey(f"{SCHEMA}.candidates.id", ondelete="CASCADE"), index=True
    )
    
    type: Mapped[CommunicationType] = mapped_column(
        Enum(CommunicationType, name="communication_type", schema=SCHEMA, create_type=False), nullable=False
    )
    direction: Mapped[CommunicationDirection] = mapped_column(
        Enum(CommunicationDirection, name="communication_direction", schema=SCHEMA, create_type=False), nullable=False
    )
    status: Mapped[CommunicationStatus] = mapped_column(
        Enum(CommunicationStatus, name="communication_status", schema=SCHEMA, create_type=False), nullable=False
    )
    
    subject: Mapped[str | None] = mapped_column(String(255), nullable=True)
    content_preview: Mapped[str] = mapped_column(Text, nullable=False)
    external_message_id: Mapped[str | None] = mapped_column(String(255), nullable=True)

    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey(f"{SCHEMA}.users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    candidate: Mapped["Candidate"] = relationship("Candidate", back_populates="communications")
