"""enterprise_recruitment_pipeline

Revision ID: e91238e32a5f
Revises: b3b1b70ff4cf
Create Date: 2026-07-15 11:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'e91238e32a5f'
down_revision: Union[str, None] = 'b3b1b70ff4cf'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SCHEMA = "recruitment"


def upgrade() -> None:
    # 1. Create evaluation_type and evaluation_verdict enums
    op.execute(f"""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type t INNER JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'evaluation_type' AND n.nspname = '{SCHEMA}') THEN
                CREATE TYPE {SCHEMA}.evaluation_type AS ENUM (
                    'BRANCH_HR', 'DEPT_HEAD', 'GM_LEVEL', 'TECHNICAL_TEST', 'HQ_INTERVIEW'
                );
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_type t INNER JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'evaluation_verdict' AND n.nspname = '{SCHEMA}') THEN
                CREATE TYPE {SCHEMA}.evaluation_verdict AS ENUM (
                    'SELECTED', 'REJECTED', 'ON_HOLD', 'PASS', 'FAIL'
                );
            END IF;
        END $$;
    """)

    # 2. Create evaluations table
    op.execute(f"""
        CREATE TABLE IF NOT EXISTS {SCHEMA}.evaluations (
            id UUID PRIMARY KEY,
            candidate_id UUID NOT NULL REFERENCES {SCHEMA}.candidates(id) ON DELETE CASCADE,
            type {SCHEMA}.evaluation_type NOT NULL,
            status {SCHEMA}.interview_status NOT NULL DEFAULT 'PENDING_SCHEDULE',
            interview_mode {SCHEMA}.interview_mode,
            scheduled_time TIMESTAMPTZ,
            location_or_link VARCHAR,
            verdict {SCHEMA}.evaluation_verdict,
            remarks TEXT,
            scores JSONB,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)
    op.execute(f"CREATE UNIQUE INDEX IF NOT EXISTS ix_recruitment_evaluations_candidate_id_type ON {SCHEMA}.evaluations(candidate_id, type)")

    # 3. Create evaluation_tokens table
    op.create_table('evaluation_tokens',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('evaluation_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('token', sa.String(), nullable=False),
        sa.Column('is_used', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['evaluation_id'], [f'{SCHEMA}.evaluations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        schema=SCHEMA
    )
    op.create_index('ix_recruitment_evaluation_tokens_token', 'evaluation_tokens', ['token'], unique=True, schema=SCHEMA)


def downgrade() -> None:
    # 1. Drop evaluation_tokens table
    op.drop_table('evaluation_tokens', schema=SCHEMA)

    # 2. Drop evaluations table
    op.drop_table('evaluations', schema=SCHEMA)

    # 3. Drop enums
    op.execute(f"DROP TYPE IF EXISTS {SCHEMA}.evaluation_verdict")
    op.execute(f"DROP TYPE IF EXISTS {SCHEMA}.evaluation_type")
