"""add phone to interviewer_names

Revision ID: f9a0b1c2d3e4
Revises: e8f1a2b3c4d5
Create Date: 2026-08-13

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f9a0b1c2d3e4"
down_revision: Union[str, None] = "e8f1a2b3c4d5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "interviewer_names",
        sa.Column("phone", sa.String(length=20), nullable=True),
        schema="recruitment",
    )


def downgrade() -> None:
    op.drop_column("interviewer_names", "phone", schema="recruitment")
