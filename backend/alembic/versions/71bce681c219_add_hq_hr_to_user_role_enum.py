"""add HQ_HR to user_role enum

Revision ID: 71bce681c219
Revises: 866937a8d89f
Create Date: 2026-07-17 11:08:56.566380

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = '71bce681c219'
down_revision: Union[str, None] = '866937a8d89f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE recruitment.user_role ADD VALUE IF NOT EXISTS 'HQ_HR'")
    pass


def downgrade() -> None:
    pass
