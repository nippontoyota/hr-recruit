"""add candidate experience column

Revision ID: g1a2b3c4d5e6
Revises: f9a0b1c2d3e4
Create Date: 2026-08-13

"""
from typing import Sequence, Union

from alembic import op


revision: str = "g1a2b3c4d5e6"
down_revision: Union[str, None] = "f9a0b1c2d3e4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE recruitment.candidates
        ADD COLUMN IF NOT EXISTS experience VARCHAR(50) NOT NULL DEFAULT 'Fresher'
        """
    )


def downgrade() -> None:
    op.execute("ALTER TABLE recruitment.candidates DROP COLUMN IF EXISTS experience")
