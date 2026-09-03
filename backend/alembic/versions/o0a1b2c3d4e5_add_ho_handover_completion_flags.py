"""add technical test verification and background verification completion flags

Revision ID: o0a1b2c3d4e5
Revises: n9f0a1b2c3d4
Create Date: 2026-09-03
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "o0a1b2c3d4e5"
down_revision: Union[str, None] = "n9f0a1b2c3d4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SCHEMA = "recruitment"


def upgrade() -> None:
    op.add_column(
        "candidates",
        sa.Column("technical_test_verified", sa.Boolean(), nullable=False, server_default="false"),
        schema=SCHEMA,
    )
    op.add_column(
        "candidates",
        sa.Column("technical_test_verified_at", sa.DateTime(timezone=True), nullable=True),
        schema=SCHEMA,
    )
    op.add_column(
        "candidates",
        sa.Column("technical_test_verified_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        schema=SCHEMA,
    )
    op.add_column(
        "candidates",
        sa.Column("background_verification_completed", sa.Boolean(), nullable=False, server_default="false"),
        schema=SCHEMA,
    )
    op.add_column(
        "candidates",
        sa.Column("background_verification_completed_at", sa.DateTime(timezone=True), nullable=True),
        schema=SCHEMA,
    )
    op.add_column(
        "candidates",
        sa.Column("background_verification_completed_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        schema=SCHEMA,
    )
    op.create_foreign_key(
        "fk_candidates_technical_test_verified_by_user_id",
        "candidates",
        "users",
        ["technical_test_verified_by_user_id"],
        ["id"],
        source_schema=SCHEMA,
        referent_schema=SCHEMA,
    )
    op.create_foreign_key(
        "fk_candidates_background_verification_completed_by_user_id",
        "candidates",
        "users",
        ["background_verification_completed_by_user_id"],
        ["id"],
        source_schema=SCHEMA,
        referent_schema=SCHEMA,
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_candidates_background_verification_completed_by_user_id",
        "candidates",
        schema=SCHEMA,
        type_="foreignkey",
    )
    op.drop_constraint(
        "fk_candidates_technical_test_verified_by_user_id",
        "candidates",
        schema=SCHEMA,
        type_="foreignkey",
    )
    op.drop_column("candidates", "background_verification_completed_by_user_id", schema=SCHEMA)
    op.drop_column("candidates", "background_verification_completed_at", schema=SCHEMA)
    op.drop_column("candidates", "background_verification_completed", schema=SCHEMA)
    op.drop_column("candidates", "technical_test_verified_by_user_id", schema=SCHEMA)
    op.drop_column("candidates", "technical_test_verified_at", schema=SCHEMA)
    op.drop_column("candidates", "technical_test_verified", schema=SCHEMA)
