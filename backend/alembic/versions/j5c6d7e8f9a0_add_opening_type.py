"""add candidate opening_type

Revision ID: j5c6d7e8f9a0
Revises: i4b5c6d7e8f9
Create Date: 2026-08-19

"""
from typing import Sequence, Union

from alembic import op

from app.core.config import settings


revision: str = "j5c6d7e8f9a0"
down_revision: Union[str, None] = "i4b5c6d7e8f9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    schema = settings.db_schema
    op.execute(
        f"""
        ALTER TABLE {schema}.candidates
        ADD COLUMN IF NOT EXISTS opening_type VARCHAR(20)
        """
    )


def downgrade() -> None:
    schema = settings.db_schema
    op.execute(f"ALTER TABLE {schema}.candidates DROP COLUMN IF EXISTS opening_type")
