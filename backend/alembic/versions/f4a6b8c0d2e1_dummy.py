"""Dummy revision to fix remote db state

Revision ID: f4a6b8c0d2e1
Revises: i4b5c6d7e8f9
Create Date: 2026-08-29

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'f4a6b8c0d2e1'
down_revision: Union[str, None] = 'i4b5c6d7e8f9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    pass

def downgrade() -> None:
    pass
