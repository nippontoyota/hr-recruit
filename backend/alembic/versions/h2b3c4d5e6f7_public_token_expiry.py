"""public token purpose + revoked

Revision ID: h2b3c4d5e6f7
Revises: h3c4d5e6f7a8
Create Date: 2026-08-14

"""
from typing import Sequence, Union

from alembic import op


revision: str = "h2b3c4d5e6f7"
down_revision: Union[str, None] = "h3c4d5e6f7a8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE recruitment.candidates
        ADD COLUMN IF NOT EXISTS pre_form_token_purpose VARCHAR(20),
        ADD COLUMN IF NOT EXISTS pre_form_token_revoked BOOLEAN NOT NULL DEFAULT false
        """
    )
    op.execute(
        """
        UPDATE recruitment.candidates
        SET pre_form_token_purpose = 'PRE_FORM',
            pre_form_token_revoked = false
        WHERE pre_form_token IS NOT NULL
        """
    )


def downgrade() -> None:
    op.execute(
        """
        ALTER TABLE recruitment.candidates
        DROP COLUMN IF EXISTS pre_form_token_purpose,
        DROP COLUMN IF EXISTS pre_form_token_revoked
        """
    )
