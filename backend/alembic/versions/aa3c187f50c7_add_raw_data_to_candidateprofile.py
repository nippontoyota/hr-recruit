"""Add raw_data to CandidateProfile

Revision ID: aa3c187f50c7
Revises: a0e94e509384
Create Date: 2026-07-11 17:24:42.304534

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'aa3c187f50c7'
down_revision: Union[str, None] = 'a0e94e509384'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('candidate_profiles', schema='recruitment')]
    if 'raw_data' not in columns:
        op.add_column('candidate_profiles', sa.Column('raw_data', postgresql.JSONB(astext_type=sa.Text()), nullable=True), schema='recruitment')


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('candidate_profiles', schema='recruitment')]
    if 'raw_data' in columns:
        op.drop_column('candidate_profiles', 'raw_data', schema='recruitment')
    # ### end Alembic commands ###
