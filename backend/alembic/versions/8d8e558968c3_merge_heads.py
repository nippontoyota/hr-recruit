"""merge_heads

Revision ID: 8d8e558968c3
Revises: 1d2171c26366, 98109a9f0c0b
Create Date: 2026-07-18 08:58:28.019276

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8d8e558968c3'
down_revision: Union[str, None] = ('1d2171c26366', '98109a9f0c0b')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
