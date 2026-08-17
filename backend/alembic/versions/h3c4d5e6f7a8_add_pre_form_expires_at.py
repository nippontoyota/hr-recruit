"""add pre_form_expires_at

Revision ID: h3c4d5e6f7a8
Revises: h2b3c4d5e6f7
Create Date: 2026-08-14

"""
from typing import Sequence, Union

from alembic import op


revision: str = "h3c4d5e6f7a8"
down_revision: Union[str, None] = "g1a2b3c4d5e6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE recruitment.candidates
        ADD COLUMN IF NOT EXISTS pre_form_expires_at TIMESTAMPTZ
        """
    )
    op.execute(
        """
        UPDATE recruitment.candidates
        SET pre_form_expires_at = pre_form_sent_at + INTERVAL '3 days'
        WHERE pre_form_expires_at IS NULL
          AND pre_form_sent_at IS NOT NULL
        """
    )
    op.execute(
        """
        UPDATE recruitment.candidates
        SET pre_form_status = 'EXPIRED'
        WHERE pre_form_status IN ('SENT', 'VIEWED')
          AND pre_form_expires_at IS NOT NULL
          AND pre_form_expires_at <= NOW()
        """
    )


def downgrade() -> None:
    op.execute("ALTER TABLE recruitment.candidates DROP COLUMN IF EXISTS pre_form_expires_at")
