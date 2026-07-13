"""Simplify pipeline stages

Revision ID: 003_simplify
Revises: 002_documents
Create Date: 2026-07-10 16:05:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = '003_simplify'
down_revision: Union[str, None] = '002_documents'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SCHEMA = "recruitment"


def upgrade() -> None:
    # 1. Rename old enum
    op.execute(f"ALTER TYPE {SCHEMA}.pipeline_stage RENAME TO pipeline_stage_old")
    
    # 2. Create new enum
    op.execute(f"""
        CREATE TYPE {SCHEMA}.pipeline_stage AS ENUM (
            'SCREENING',
            'CANDIDATE_FORM',
            'HR_INTERVIEW',
            'DEPARTMENT_INTERVIEW',
            'GM_INTERVIEW',
            'FINALIZING',
            'HIRED',
            'REJECTED',
            'ON_HOLD'
        )
    """)
    
    # 3. Alter columns using a mapping CASE statement to translate existing values
    mapping_case = f"""
        CASE 
            WHEN current_stage::text = 'NEW_APPLICATION' THEN 'SCREENING'
            WHEN current_stage::text = 'AWAITING_PRE_INTERVIEW_FORM_FILL' THEN 'CANDIDATE_FORM'
            WHEN current_stage::text = 'AWAITING_LOCAL_INTERVIEW' THEN 'HR_INTERVIEW'
            WHEN current_stage::text = 'LOCAL_HR_REVIEW_COMPLETE' THEN 'HR_INTERVIEW'
            WHEN current_stage::text = 'AWAITING_HEAD_OFFICE_INTERVIEW' THEN 'DEPARTMENT_INTERVIEW'
            WHEN current_stage::text = 'HEAD_OFFICE_INTERVIEW_COMPLETE' THEN 'GM_INTERVIEW'
            WHEN current_stage::text = 'SUITABLE_FOR_HIRE' THEN 'FINALIZING'
            WHEN current_stage::text IN ('SALARY_PENDING', 'SALARY_APPROVED', 'OFFER_SENT', 'OFFER_ACCEPTED') THEN 'FINALIZING'
            WHEN current_stage::text IN ('JOINING_SCHEDULED', 'JOINED') THEN 'HIRED'
            WHEN current_stage::text = 'OFFER_DECLINED' THEN 'REJECTED'
            WHEN current_stage::text = 'REJECTED' THEN 'REJECTED'
            WHEN current_stage::text = 'ON_HOLD' THEN 'ON_HOLD'
            ELSE 'SCREENING'
        END
    """
    
    mapping_case_to = mapping_case.replace("current_stage", "to_stage")
    mapping_case_from = mapping_case.replace("current_stage", "from_stage")
    
    op.execute(f"ALTER TABLE {SCHEMA}.candidates ALTER COLUMN current_stage TYPE {SCHEMA}.pipeline_stage USING ({mapping_case})::{SCHEMA}.pipeline_stage")
    op.execute(f"ALTER TABLE {SCHEMA}.stage_history ALTER COLUMN to_stage TYPE {SCHEMA}.pipeline_stage USING ({mapping_case_to})::{SCHEMA}.pipeline_stage")
    
    # Handle NULL in from_stage properly
    op.execute(f"ALTER TABLE {SCHEMA}.stage_history ALTER COLUMN from_stage TYPE {SCHEMA}.pipeline_stage USING (CASE WHEN from_stage IS NULL THEN NULL ELSE ({mapping_case_from}) END)::{SCHEMA}.pipeline_stage")
    
    # 4. Drop old enum
    op.execute(f"DROP TYPE {SCHEMA}.pipeline_stage_old")


def downgrade() -> None:
    # Not supported for this migration
    pass
