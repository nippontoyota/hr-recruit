"""Add pending reason and follow up date to screening

Revision ID: a0e94e509384
Revises: 3f28872de64d
Create Date: 2026-07-11 15:21:58.449958

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a0e94e509384'
down_revision: Union[str, None] = '3f28872de64d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('candidate_screening', schema='recruitment')]
    if 'pending_reason' not in columns:
        op.add_column('candidate_screening', sa.Column('pending_reason', sa.Text(), nullable=True), schema='recruitment')
    if 'follow_up_date' not in columns:
        op.add_column('candidate_screening', sa.Column('follow_up_date', sa.DateTime(timezone=True), nullable=True), schema='recruitment')


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('candidate_screening', schema='recruitment')]
    if 'follow_up_date' in columns:
        op.drop_column('candidate_screening', 'follow_up_date', schema='recruitment')
    if 'pending_reason' in columns:
        op.drop_column('candidate_screening', 'pending_reason', schema='recruitment')
