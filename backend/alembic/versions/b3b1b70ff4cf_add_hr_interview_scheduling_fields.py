"""Add HR Interview scheduling fields

Revision ID: b3b1b70ff4cf
Revises: e08d1c7427a3
Create Date: 2026-07-14 15:42:38.566336

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b3b1b70ff4cf'
down_revision: Union[str, None] = 'e08d1c7427a3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('hr_interviews', schema='recruitment')]
    
    if 'interview_mode' not in columns:
        op.execute("DROP TYPE IF EXISTS recruitment.interview_mode CASCADE")
        interview_mode = sa.Enum('PHYSICAL', 'ONLINE', name='interview_mode', schema='recruitment')
        interview_mode.create(op.get_bind())
        op.add_column('hr_interviews', sa.Column('interview_mode', interview_mode, nullable=True), schema='recruitment')
        
    if 'scheduled_time' not in columns:
        op.add_column('hr_interviews', sa.Column('scheduled_time', sa.DateTime(timezone=True), nullable=True), schema='recruitment')
        
    if 'location_or_link' not in columns:
        op.add_column('hr_interviews', sa.Column('location_or_link', sa.String(), nullable=True), schema='recruitment')
        
    if 'status' not in columns:
        op.execute("DROP TYPE IF EXISTS recruitment.interview_status CASCADE")
        interview_status = sa.Enum('PENDING_SCHEDULE', 'SCHEDULED', 'EVALUATED', name='interview_status', schema='recruitment')
        interview_status.create(op.get_bind())
        op.add_column('hr_interviews', sa.Column('status', interview_status, nullable=False, server_default='PENDING_SCHEDULE'), schema='recruitment')


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('hr_interviews', schema='recruitment')]
    
    if 'status' in columns:
        op.drop_column('hr_interviews', 'status', schema='recruitment')
    if 'location_or_link' in columns:
        op.drop_column('hr_interviews', 'location_or_link', schema='recruitment')
    if 'scheduled_time' in columns:
        op.drop_column('hr_interviews', 'scheduled_time', schema='recruitment')
    if 'interview_mode' in columns:
        op.drop_column('hr_interviews', 'interview_mode', schema='recruitment')
    
    op.execute("DROP TYPE IF EXISTS recruitment.interview_status CASCADE")
    op.execute("DROP TYPE IF EXISTS recruitment.interview_mode CASCADE")
