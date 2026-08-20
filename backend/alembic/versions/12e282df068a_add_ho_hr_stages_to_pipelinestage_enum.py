"""add ho hr stages to pipelinestage enum

Revision ID: 12e282df068a
Revises: 644d5f55c8fb
Create Date: 2026-08-11 11:48:19.975726

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '12e282df068a'
down_revision: Union[str, None] = '644d5f55c8fb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add new HO HR stages to the pipelinestage enum
    # We use IF NOT EXISTS just in case it was already added
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE recruitment.pipeline_stage ADD VALUE IF NOT EXISTS 'HO_INTERVIEWS'")
        op.execute("ALTER TYPE recruitment.pipeline_stage ADD VALUE IF NOT EXISTS 'SALARY_DETAILS'")
        op.execute("ALTER TYPE recruitment.pipeline_stage ADD VALUE IF NOT EXISTS 'CSS'")


def downgrade() -> None:
    # Postgres doesn't easily support removing enum values
    pass
