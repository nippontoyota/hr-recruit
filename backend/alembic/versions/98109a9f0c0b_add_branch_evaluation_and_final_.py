"""add branch_evaluation and final_approval to pipeline_stage

Revision ID: 98109a9f0c0b
Revises: f30f3504b063
Create Date: 2026-07-17 10:32:32.664373

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '98109a9f0c0b'
down_revision: Union[str, None] = 'f30f3504b063'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Postgres enum type ALTER cannot be run inside a transaction block
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE recruitment.pipeline_stage ADD VALUE IF NOT EXISTS 'BRANCH_EVALUATION'")
        op.execute("ALTER TYPE recruitment.pipeline_stage ADD VALUE IF NOT EXISTS 'FINAL_APPROVAL'")


def downgrade() -> None:
    # Cannot easily drop values from an ENUM in Postgres
    pass
