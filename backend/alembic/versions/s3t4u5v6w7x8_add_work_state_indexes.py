"""add indexes for latest candidate work-state reads

Revision ID: s3t4u5v6w7x8
Revises: r8s9t0u1v2w3
Create Date: 2026-09-08
"""

from typing import Sequence, Union

from alembic import op


revision: str = "s3t4u5v6w7x8"
down_revision: Union[str, None] = "r8s9t0u1v2w3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SCHEMA = "recruitment"


def upgrade() -> None:
    # CONCURRENTLY avoids taking a write lock on these high-traffic tables while
    # the index builds; it cannot run inside alembic's default transaction.
    with op.get_context().autocommit_block():
        op.create_index(
            "ix_recruitment_stage_history_candidate_created_at",
            "stage_history",
            ["candidate_id", "created_at"],
            schema=SCHEMA,
            postgresql_concurrently=True,
            if_not_exists=True,
        )
        op.create_index(
            "ix_recruitment_activity_logs_candidate_created_at",
            "activity_logs",
            ["candidate_id", "created_at"],
            schema=SCHEMA,
            postgresql_concurrently=True,
            if_not_exists=True,
        )


def downgrade() -> None:
    with op.get_context().autocommit_block():
        op.drop_index(
            "ix_recruitment_activity_logs_candidate_created_at",
            table_name="activity_logs",
            schema=SCHEMA,
            postgresql_concurrently=True,
            if_exists=True,
        )
        op.drop_index(
            "ix_recruitment_stage_history_candidate_created_at",
            table_name="stage_history",
            schema=SCHEMA,
            postgresql_concurrently=True,
            if_exists=True,
        )
