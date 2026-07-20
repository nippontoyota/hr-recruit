"""merge_heads

Revision ID: 2593c2c23b3a
Revises: 0176d77f4a59, 543b5501a7f3
Create Date: 2026-07-20 11:29:22.819220

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2593c2c23b3a'
down_revision: Union[str, None] = ('0176d77f4a59', '543b5501a7f3')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
