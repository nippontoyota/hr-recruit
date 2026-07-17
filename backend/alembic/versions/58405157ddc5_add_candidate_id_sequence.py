"""add_candidate_id_sequence

Revision ID: 58405157ddc5
Revises: c1d2e3f4a5b6
Create Date: 2026-07-16 15:13:15.914535

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = '58405157ddc5'
down_revision: Union[str, None] = 'c1d2e3f4a5b6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


from app.core.config import settings

def upgrade() -> None:
    schema = settings.db_schema
    op.execute(f"CREATE SEQUENCE IF NOT EXISTS {schema}.candidate_id_seq START WITH 1")
    op.execute(
        f"ALTER TABLE {schema}.candidates ALTER COLUMN candidate_id SET DEFAULT "
        f"'NT-' || to_char(CURRENT_DATE, 'YYYY') || '-' || lpad(nextval('{schema}.candidate_id_seq')::text, 5, '0')"
    )


def downgrade() -> None:
    schema = settings.db_schema
    op.execute(f"ALTER TABLE {schema}.candidates ALTER COLUMN candidate_id DROP DEFAULT")
    op.execute(f"DROP SEQUENCE IF EXISTS {schema}.candidate_id_seq")
