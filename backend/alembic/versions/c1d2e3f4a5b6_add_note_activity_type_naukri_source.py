"""add_note_to_activity_type_naukri_to_source_channel

Revision ID: c1d2e3f4a5b6
Revises: 9558be2e8a6d
Create Date: 2026-07-16 09:30:00.000000

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'c1d2e3f4a5b6'
down_revision: Union[str, None] = '9558be2e8a6d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ADD 'NOTE' to activity_type enum (safe, IF NOT EXISTS is Postgres 9.6+)
    op.execute("ALTER TYPE recruitment.activity_type ADD VALUE IF NOT EXISTS 'NOTE'")
    # ADD 'NAUKRI' to source_channel enum
    op.execute("ALTER TYPE recruitment.source_channel ADD VALUE IF NOT EXISTS 'NAUKRI'")


def downgrade() -> None:
    # Postgres does not support removing enum values — downgrade is a no-op.
    # To remove, you'd need to recreate the enum and migrate all columns, which
    # is a heavy operation not worth doing for two added leaf values.
    pass
