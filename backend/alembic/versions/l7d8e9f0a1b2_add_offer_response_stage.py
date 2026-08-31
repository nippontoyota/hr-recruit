"""add offer response stage

Revision ID: l7d8e9f0a1b2
Revises: f4a6b8c0d2e1
Create Date: 2026-08-31
"""

from typing import Sequence, Union

from alembic import op


revision: str = "l7d8e9f0a1b2"
down_revision: Union[str, None] = "f4a6b8c0d2e1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.get_context().autocommit_block():
        op.execute(
            "ALTER TYPE recruitment.pipeline_stage "
            "ADD VALUE IF NOT EXISTS 'OFFER_RESPONSE' BEFORE 'HIRED'"
        )

    op.execute(
        """
        UPDATE recruitment.candidates
        SET current_stage = 'OFFER_RESPONSE'
        WHERE current_stage = 'FINAL_APPROVAL'
          AND offer_status IN ('SENT', 'ACCEPTED', 'DECLINED')
        """
    )


def downgrade() -> None:
    # PostgreSQL does not support removing an enum value safely.
    pass
