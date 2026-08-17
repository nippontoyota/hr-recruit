"""add HO HR and dept interview pipeline stages

Revision ID: e8f1a2b3c4d5
Revises: d1e2f3a4b5c6
Create Date: 2026-08-12

"""
from typing import Sequence, Union

from alembic import op


revision: str = "e8f1a2b3c4d5"
down_revision: Union[str, None] = "d1e2f3a4b5c6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE recruitment.pipeline_stage ADD VALUE IF NOT EXISTS 'HO_HR_INTERVIEW'")
        op.execute("ALTER TYPE recruitment.pipeline_stage ADD VALUE IF NOT EXISTS 'HO_DEPT_INTERVIEW'")

    op.execute(
        """
        UPDATE recruitment.candidates
        SET current_stage = 'HO_HR_INTERVIEW'
        WHERE current_stage = 'HO_INTERVIEWS'
        """
    )


def downgrade() -> None:
    pass
