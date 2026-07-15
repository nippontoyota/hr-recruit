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
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names(schema=SCHEMA)
    
    # 1. Update pipeline_stage enum values
    result = conn.execute(sa.text(f"""
        SELECT exists (
            SELECT 1 FROM pg_type t 
            LEFT JOIN pg_enum e ON t.oid = e.enumtypid 
            INNER JOIN pg_namespace n ON n.oid = t.typnamespace
            WHERE t.typname = 'pipeline_stage' 
              AND n.nspname = '{SCHEMA}'
              AND e.enumlabel = 'BRANCH_EVALUATION'
        )
    """)).scalar()
    
    if not result:
        op.execute(f"DROP TYPE IF EXISTS {SCHEMA}.pipeline_stage_old CASCADE")
        op.execute(f"ALTER TYPE {SCHEMA}.pipeline_stage RENAME TO pipeline_stage_old")
        
        op.execute(f"""
            CREATE TYPE {SCHEMA}.pipeline_stage AS ENUM (
                'SCREENING',
                'CANDIDATE_FORM',
                'BRANCH_EVALUATION',
                'HQ_EVALUATION',
                'HIRED',
                'REJECTED',
                'ON_HOLD'
            )
        """)
        
        mapping_case = f"""
            CASE 
                WHEN current_stage::text = 'SCREENING' THEN 'SCREENING'
                WHEN current_stage::text = 'CANDIDATE_FORM' THEN 'CANDIDATE_FORM'
                WHEN current_stage::text = 'HR_INTERVIEW' THEN 'BRANCH_EVALUATION'
                WHEN current_stage::text = 'DEPARTMENT_INTERVIEW' THEN 'BRANCH_EVALUATION'
                WHEN current_stage::text = 'FINAL_APPROVAL' THEN 'HQ_EVALUATION'
                WHEN current_stage::text = 'HIRED' THEN 'HIRED'
                WHEN current_stage::text = 'REJECTED' THEN 'REJECTED'
                WHEN current_stage::text = 'ON_HOLD' THEN 'ON_HOLD'
                ELSE 'SCREENING'
            END
        """
        
        mapping_case_to = mapping_case.replace("current_stage", "to_stage")
        mapping_case_from = mapping_case.replace("current_stage", "from_stage")
        
        op.execute(f"ALTER TABLE {SCHEMA}.candidates ALTER COLUMN current_stage TYPE {SCHEMA}.pipeline_stage USING ({mapping_case})::{SCHEMA}.pipeline_stage")
        op.execute(f"ALTER TABLE {SCHEMA}.stage_history ALTER COLUMN to_stage TYPE {SCHEMA}.pipeline_stage USING ({mapping_case_to})::{SCHEMA}.pipeline_stage")
        op.execute(f"ALTER TABLE {SCHEMA}.stage_history ALTER COLUMN from_stage TYPE {SCHEMA}.pipeline_stage USING (CASE WHEN from_stage IS NULL THEN NULL ELSE ({mapping_case_from}) END)::{SCHEMA}.pipeline_stage")
        
        op.execute(f"DROP TYPE IF EXISTS {SCHEMA}.pipeline_stage_old CASCADE")

    # 2. Update user_role enum to add HQ_HR
    result_role = conn.execute(sa.text(f"""
        SELECT exists (
            SELECT 1 FROM pg_type t 
            LEFT JOIN pg_enum e ON t.oid = e.enumtypid 
            INNER JOIN pg_namespace n ON n.oid = t.typnamespace
            WHERE t.typname = 'user_role' 
              AND n.nspname = '{SCHEMA}'
              AND e.enumlabel = 'HQ_HR'
        )
    """)).scalar()
    
    if not result_role:
        op.execute(f"DROP TYPE IF EXISTS {SCHEMA}.user_role_old CASCADE")
        op.execute(f"""
            CREATE TYPE {SCHEMA}.user_role AS ENUM (
                'ADMIN',
                'LOCAL_HR',
                'HQ_HR'
            )
        """)
        mapping_role = f"""
            CASE 
                WHEN role::text = 'ADMIN' THEN 'ADMIN'
                WHEN role::text = 'LOCAL_HR' THEN 'LOCAL_HR'
                WHEN role::text = 'HEAD_OFFICE_HR' THEN 'HQ_HR'
                WHEN role::text = 'DEPARTMENT_HEAD' THEN 'LOCAL_HR'
                WHEN role::text = 'SALARY_TEAM' THEN 'HQ_HR'
                ELSE 'LOCAL_HR'
            END
        """
        op.execute(f"ALTER TABLE {SCHEMA}.users ALTER COLUMN role TYPE {SCHEMA}.user_role USING ({mapping_role})::{SCHEMA}.user_role")
        op.execute(f"DROP TYPE IF EXISTS {SCHEMA}.user_role_old CASCADE")

    # 3. Drop existing hr_interviews table
    op.execute(f"DROP TABLE IF EXISTS {SCHEMA}.hr_interviews CASCADE")

    # 4. Create evaluations table
    op.execute(f"DROP TABLE IF EXISTS {SCHEMA}.evaluation_tokens CASCADE")
    op.execute(f"DROP TABLE IF EXISTS {SCHEMA}.evaluations CASCADE")
    op.execute(f"DROP TYPE IF EXISTS {SCHEMA}.evaluation_type CASCADE")
    op.execute(f"DROP TYPE IF EXISTS {SCHEMA}.evaluation_verdict CASCADE")
    
    op.execute(f"""
        CREATE TYPE {SCHEMA}.evaluation_type AS ENUM (
            'BRANCH_HR', 'DEPT_HEAD', 'GM_LEVEL', 'TECHNICAL_TEST', 'HQ_INTERVIEW'
        )
    """)
    op.execute(f"""
        CREATE TYPE {SCHEMA}.evaluation_verdict AS ENUM (
            'SELECTED', 'REJECTED', 'ON_HOLD', 'PASS', 'FAIL'
        )
    """)
    op.execute(f"""
        CREATE TABLE {SCHEMA}.evaluations (
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
    op.execute(f"CREATE UNIQUE INDEX ix_recruitment_evaluations_candidate_id_type ON {SCHEMA}.evaluations(candidate_id, type)")

    # 5. Create evaluation_tokens table
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
    pass
