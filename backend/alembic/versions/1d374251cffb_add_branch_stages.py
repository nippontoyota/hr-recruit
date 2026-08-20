"""add branch stages

Revision ID: 1d374251cffb
Revises: 5d9d46dda73e
Create Date: 2026-08-06 10:46:15.750563

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1d374251cffb'
down_revision: Union[str, None] = '5d9d46dda73e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # PostgreSQL requires ALTER TYPE to not run inside a transaction block, 
    # but Alembic auto-wraps in transactions. For simple ADD VALUE IF NOT EXISTS,
    # some PG versions allow it. We will use a workaround or just execute it directly.
    # Note: IF NOT EXISTS is safe.
    op.execute("ALTER TYPE recruitment.pipeline_stage ADD VALUE IF NOT EXISTS 'CALL_LETTER'")
    op.execute("ALTER TYPE recruitment.pipeline_stage ADD VALUE IF NOT EXISTS 'INTERVIEWS'")
    op.execute("ALTER TYPE recruitment.pipeline_stage ADD VALUE IF NOT EXISTS 'BACKGROUND_VERIFICATION'")
    op.execute("ALTER TYPE recruitment.pipeline_stage ADD VALUE IF NOT EXISTS 'APPLICATION'")
    op.execute("ALTER TYPE recruitment.pipeline_stage ADD VALUE IF NOT EXISTS 'SENT_TO_HO'")

def downgrade() -> None:
    # Cannot easily remove values from a postgres enum.
    pass
