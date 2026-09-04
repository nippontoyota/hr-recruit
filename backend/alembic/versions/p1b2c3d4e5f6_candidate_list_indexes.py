"""add indexes for candidate list filters

Revision ID: p1b2c3d4e5f6
Revises: o0a1b2c3d4e5
Create Date: 2026-09-04
"""

from typing import Sequence, Union

from alembic import op


revision: str = "p1b2c3d4e5f6"
down_revision: Union[str, None] = "o0a1b2c3d4e5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SCHEMA = "recruitment"


def upgrade() -> None:
    op.create_index("ix_recruitment_candidates_branch_created", "candidates", ["branch_location", "created_at"], schema=SCHEMA)
    op.create_index("ix_recruitment_candidates_pre_form_sent_at", "candidates", ["pre_form_sent_at"], schema=SCHEMA)


def downgrade() -> None:
    op.drop_index("ix_recruitment_candidates_pre_form_sent_at", table_name="candidates", schema=SCHEMA)
    op.drop_index("ix_recruitment_candidates_branch_created", table_name="candidates", schema=SCHEMA)
