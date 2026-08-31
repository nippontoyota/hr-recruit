"""add head office interview intimation stage

Revision ID: f4a6b8c0d2e1
Revises: k6d7e8f9a0b1
Create Date: 2026-08-28
"""

from typing import Sequence, Union

from alembic import op


revision: str = "f4a6b8c0d2e1"
down_revision: Union[str, None] = "k6d7e8f9a0b1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.get_context().autocommit_block():
        op.execute(
            "ALTER TYPE recruitment.pipeline_stage "
            "ADD VALUE IF NOT EXISTS 'HO_INTERVIEW_INTIMATION' BEFORE 'HO_INTERVIEWS'"
        )

    op.execute(
        """
        UPDATE recruitment.candidates
        SET current_stage = 'HO_INTERVIEW_INTIMATION'
        WHERE current_stage = 'SENT_TO_HO'
        """
    )


def downgrade() -> None:
    # PostgreSQL does not support removing an enum value safely.
    pass
