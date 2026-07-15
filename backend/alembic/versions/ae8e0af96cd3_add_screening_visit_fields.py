"""Add screening visit fields

Revision ID: ae8e0af96cd3
Revises: aa3c187f50c7
Create Date: 2026-07-13 16:56:35.250256

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ae8e0af96cd3'
down_revision: Union[str, None] = 'aa3c187f50c7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('candidate_screening', schema='recruitment')]
    if 'visit_branch' not in columns:
        op.add_column('candidate_screening', sa.Column('visit_branch', sa.String(), nullable=True), schema='recruitment')
    if 'branch_visit_date' not in columns:
        op.add_column('candidate_screening', sa.Column('branch_visit_date', sa.DateTime(timezone=True), nullable=True), schema='recruitment')
    if 'maps_link' not in columns:
        op.add_column('candidate_screening', sa.Column('maps_link', sa.Text(), nullable=True), schema='recruitment')
    if 'extra_instructions' not in columns:
        op.add_column('candidate_screening', sa.Column('extra_instructions', sa.Text(), nullable=True), schema='recruitment')


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('candidate_screening', schema='recruitment')]
    if 'extra_instructions' in columns:
        op.drop_column('candidate_screening', 'extra_instructions', schema='recruitment')
    if 'maps_link' in columns:
        op.drop_column('candidate_screening', 'maps_link', schema='recruitment')
    if 'branch_visit_date' in columns:
        op.drop_column('candidate_screening', 'branch_visit_date', schema='recruitment')
    if 'visit_branch' in columns:
        op.drop_column('candidate_screening', 'visit_branch', schema='recruitment')
