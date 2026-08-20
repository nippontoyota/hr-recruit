"""short candidate ids NT-1

Revision ID: i4b5c6d7e8f9
Revises: h2b3c4d5e6f7
Create Date: 2026-08-17

"""
from typing import Sequence, Union

from alembic import op

from app.core.config import settings

revision: str = "i4b5c6d7e8f9"
down_revision: Union[str, None] = "h2b3c4d5e6f7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    schema = settings.db_schema
    seq = f"{schema}.candidate_id_seq"
    op.execute(
        f"ALTER TABLE {schema}.candidates ALTER COLUMN candidate_id SET DEFAULT "
        f"'NT-' || nextval('{seq}')::text"
    )
    op.execute(
        f"""
        UPDATE {schema}.candidates AS c
        SET candidate_id = 'NT-' || n.rn::text
        FROM (
            SELECT id, row_number() OVER (ORDER BY created_at ASC, id ASC) AS rn
            FROM {schema}.candidates
        ) AS n
        WHERE c.id = n.id
        """
    )
    op.execute(
        f"""
        SELECT setval(
            '{seq}',
            GREATEST(
                COALESCE(
                    (
                        SELECT MAX(CAST(substring(candidate_id FROM 4) AS bigint))
                        FROM {schema}.candidates
                        WHERE candidate_id ~ '^NT-[0-9]+$'
                    ),
                    0
                ),
                1
            ),
            (SELECT COUNT(*) FROM {schema}.candidates) > 0
        )
        """
    )


def downgrade() -> None:
    schema = settings.db_schema
    seq = f"{schema}.candidate_id_seq"
    op.execute(
        f"""
        UPDATE {schema}.candidates
        SET candidate_id = 'NT-' || to_char(CURRENT_DATE, 'YYYY') || '-'
            || lpad(regexp_replace(candidate_id, '^NT-', ''), 5, '0')
        WHERE candidate_id ~ '^NT-[0-9]+$'
        """
    )
    op.execute(
        f"ALTER TABLE {schema}.candidates ALTER COLUMN candidate_id SET DEFAULT "
        f"'NT-' || to_char(CURRENT_DATE, 'YYYY') || '-' || lpad(nextval('{seq}')::text, 5, '0')"
    )
