"""add touchpoint_templates for per-branch call letter meeting/touch points

Revision ID: n9f0a1b2c3d4
Revises: l7d8e9f0a1b2
Create Date: 2026-08-31
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "n9f0a1b2c3d4"
down_revision: Union[str, None] = "l7d8e9f0a1b2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "touchpoint_templates",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("branch_location", sa.String(length=255), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("meeting_point", sa.Text(), nullable=False),
        sa.Column("touch_point_1_label", sa.String(length=255), nullable=False),
        sa.Column("touch_point_1_phone", sa.String(length=20), nullable=True),
        sa.Column("touch_point_2_label", sa.String(length=255), nullable=True),
        sa.Column("touch_point_2_phone", sa.String(length=20), nullable=True),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        schema="recruitment",
    )
    op.create_index(
        "ix_touchpoint_templates_branch_location",
        "touchpoint_templates",
        ["branch_location"],
        schema="recruitment",
    )
    op.create_unique_constraint(
        "uq_touchpoint_templates_branch_name",
        "touchpoint_templates",
        ["branch_location", "name"],
        schema="recruitment",
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_touchpoint_templates_branch_name", "touchpoint_templates", schema="recruitment", type_="unique"
    )
    op.drop_index("ix_touchpoint_templates_branch_location", table_name="touchpoint_templates", schema="recruitment")
    op.drop_table("touchpoint_templates", schema="recruitment")
