"""merge heads

Revision ID: 0748a768e009
Revises: 56edb2557cf5, f123456789ab
Create Date: 2026-07-17 13:11:17.755950

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0748a768e009'
down_revision: Union[str, None] = ('56edb2557cf5', 'f123456789ab')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
