"""add nullable brand fields for multi-brand recruitment

Revision ID: q7r8s9t0u1v2
Revises: p1b2c3d4e5f6
Create Date: 2026-09-07
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "q7r8s9t0u1v2"
down_revision: Union[str, None] = "p1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SCHEMA = "recruitment"


def upgrade() -> None:
    op.add_column("users", sa.Column("brand", sa.String(length=50), nullable=True), schema=SCHEMA)
    op.add_column("candidates", sa.Column("brand", sa.String(length=50), nullable=True), schema=SCHEMA)


def downgrade() -> None:
    op.drop_column("candidates", "brand", schema=SCHEMA)
    op.drop_column("users", "brand", schema=SCHEMA)
