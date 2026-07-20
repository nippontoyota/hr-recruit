"""remove_post_form_pipeline

Revision ID: a24100dfafac
Revises: 2593c2c23b3a
Create Date: 2026-07-20 11:29:23.021405

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a24100dfafac'
down_revision: Union[str, None] = '2593c2c23b3a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop index first
    op.drop_index(op.f('ix_recruitment_candidates_post_form_token'), table_name='candidates', schema='recruitment')
    
    # Drop columns
    op.drop_column('candidates', 'post_form_token', schema='recruitment')
    op.drop_column('candidates', 'post_form_status', schema='recruitment')
    op.drop_column('candidates', 'post_form_sent_at', schema='recruitment')
    op.drop_column('candidates', 'post_form_submitted_at', schema='recruitment')


def downgrade() -> None:
    # Add columns back (with minimal types for downgrade)
    op.add_column('candidates', sa.Column('post_form_submitted_at', sa.DateTime(timezone=True), nullable=True), schema='recruitment')
    op.add_column('candidates', sa.Column('post_form_sent_at', sa.DateTime(timezone=True), nullable=True), schema='recruitment')
    op.add_column('candidates', sa.Column('post_form_status', sa.String(length=50), server_default='NOT_SENT', nullable=False), schema='recruitment')
    op.add_column('candidates', sa.Column('post_form_token', sa.String(length=255), nullable=True), schema='recruitment')
    
    # Add index back
    op.create_index(op.f('ix_recruitment_candidates_post_form_token'), 'candidates', ['post_form_token'], unique=True, schema='recruitment')
