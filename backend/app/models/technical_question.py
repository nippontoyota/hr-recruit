from datetime import datetime
from sqlalchemy import DateTime, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.config import settings
from app.core.database import Base

SCHEMA = settings.db_schema


class TechnicalQuestion(Base):
    __tablename__ = "technical_questions"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    department: Mapped[str] = mapped_column(String(50), primary_key=True)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    options: Mapped[dict] = mapped_column(JSONB, nullable=False)
    answer: Mapped[str] = mapped_column(String(10), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
