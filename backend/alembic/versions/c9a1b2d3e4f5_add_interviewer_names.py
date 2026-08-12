"""add interviewer_names table

Revision ID: c9a1b2d3e4f5
Revises: 12e282df068a
Create Date: 2026-08-12 09:50:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "c9a1b2d3e4f5"
down_revision: Union[str, None] = "12e282df068a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "interviewer_names",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
        schema="recruitment",
    )


def downgrade() -> None:
    op.drop_table("interviewer_names", schema="recruitment")
