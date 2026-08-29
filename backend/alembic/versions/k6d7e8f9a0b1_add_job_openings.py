"""add job_openings table

Revision ID: k6d7e8f9a0b1
Revises: j5c6d7e8f9a0
Create Date: 2026-08-19

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from app.core.config import settings


revision: str = "k6d7e8f9a0b1"
down_revision: Union[str, None] = "j5c6d7e8f9a0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    schema = settings.db_schema
    op.create_table(
        "job_openings",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("position", sa.String(length=100), nullable=False),
        sa.Column("department", sa.String(length=100), nullable=False),
        sa.Column("location", sa.String(length=255), nullable=False),
        sa.Column("headcount", sa.Integer(), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["created_by"], [f"{schema}.users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        schema=schema,
    )
    op.create_index(
        "ix_job_openings_created_at",
        "job_openings",
        ["created_at"],
        schema=schema,
    )


def downgrade() -> None:
    schema = settings.db_schema
    op.drop_index("ix_job_openings_created_at", table_name="job_openings", schema=schema)
    op.drop_table("job_openings", schema=schema)
