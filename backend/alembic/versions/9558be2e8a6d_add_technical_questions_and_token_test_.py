"""add_technical_questions_and_token_test_data

Revision ID: 9558be2e8a6d
Revises: e91238e32a5f
Create Date: 2026-07-15 14:57:51.118922

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '9558be2e8a6d'
down_revision: Union[str, None] = 'e91238e32a5f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SCHEMA = "recruitment"

TEST_QUESTIONS = {
    "IT": [
        {"id": "q1", "text": "What is the output of typeof null in JavaScript?", "options": {"a": "null", "b": "object", "c": "undefined", "d": "number"}, "answer": "b"},
        {"id": "q2", "text": "Which HTTP status code represents 'Unauthorized'?", "options": {"a": "400", "b": "401", "c": "403", "d": "404"}, "answer": "b"},
        {"id": "q3", "text": "What does SQL stand for?", "options": {"a": "Structured Query Language", "b": "Simple Query Language", "c": "Standard Query Language", "d": "System Query Language"}, "answer": "a"},
        {"id": "q4", "text": "Which database type uses tables and keys?", "options": {"a": "NoSQL", "b": "Relational", "c": "Graph", "d": "Key-value"}, "answer": "b"},
        {"id": "q5", "text": "Which git command downloads commits and merges them?", "options": {"a": "git fetch", "b": "git push", "c": "git pull", "d": "git checkout"}, "answer": "c"}
    ],
    "SALES": [
        {"id": "q1", "text": "What is the first step in the traditional sales process?", "options": {"a": "Closing", "b": "Handling objections", "c": "Prospecting", "d": "Presentation"}, "answer": "c"},
        {"id": "q2", "text": "What does CRM stand for in sales operations?", "options": {"a": "Customer Relationship Management", "b": "Client Relations Manager", "c": "Company Revenue Management", "d": "Customer Retention Model"}, "answer": "a"},
        {"id": "q3", "text": "How should you handle a customer's pricing objection?", "options": {"a": "Offer discount immediately", "b": "Focus on value and benefits first", "c": "Tell them they are wrong", "d": "Ignore the objection"}, "answer": "b"},
        {"id": "q4", "text": "What is the conversion rate?", "options": {"a": "Leads converted divided by total leads", "b": "Sales revenue divided by customer count", "c": "Clicks divided by impressions", "d": "Deals lost divided by deals won"}, "answer": "a"},
        {"id": "q5", "text": "Which term describes selling an additional, more premium product?", "options": {"a": "Cross-selling", "b": "Down-selling", "c": "Up-selling", "d": "Cold calling"}, "answer": "c"}
    ],
    "SERVICE": [
        {"id": "q1", "text": "What is the primary function of engine oil?", "options": {"a": "Cooling only", "b": "Lubrication and friction reduction", "c": "Fuel combustion", "d": "Exhaust filtration"}, "answer": "b"},
        {"id": "q2", "text": "What tool is used to read vehicle diagnostic trouble codes (DTCs)?", "options": {"a": "Multimeter", "b": "OBD-II Scanner", "c": "Pressure gauge", "d": "Hydrometer"}, "answer": "b"},
        {"id": "q3", "text": "If a brake pedal feels spongy, what is the most likely cause?", "options": {"a": "Worn brake pads", "b": "Air in the brake lines", "c": "Worn rotors", "d": "Stuck caliper"}, "answer": "b"},
        {"id": "q4", "text": "What does PSI measure in vehicle servicing?", "options": {"a": "Engine torque", "b": "Tire pressure", "c": "Battery voltage", "d": "Coolant temperature"}, "answer": "b"},
        {"id": "q5", "text": "Which component is responsible for recharging the vehicle battery while driving?", "options": {"a": "Starter motor", "b": "Alternator", "c": "Radiator", "d": "Distributor"}, "answer": "b"}
    ],
    "FINANCE": [
        {"id": "q1", "text": "Which financial statement shows assets, liabilities, and equity at a specific point in time?", "options": {"a": "Income Statement", "b": "Balance Sheet", "c": "Cash Flow Statement", "d": "Retained Earnings statement"}, "answer": "b"},
        {"id": "q2", "text": "What is the formula for calculating Net Income?", "options": {"a": "Assets - Liabilities", "b": "Revenue - Expenses", "c": "Cash Inflow - Cash Outflow", "d": "Gross Profit - Cost of Goods Sold"}, "answer": "b"},
        {"id": "q3", "text": "Which account increases with a debit entry?", "options": {"a": "Accounts Payable", "b": "Revenue", "c": "Cash (Asset)", "d": "Retained Earnings"}, "answer": "c"},
        {"id": "q4", "text": "What does ROI stand for?", "options": {"a": "Return on Investment", "b": "Rate of Inflation", "c": "Revenue on Invoices", "d": "Return on Interest"}, "answer": "a"},
        {"id": "q5", "text": "What is depreciation?", "options": {"a": "Increase in asset value over time", "b": "Allocation of the cost of an asset over its useful life", "c": "Cash payments to investors", "d": "Inventory losses due to theft"}, "answer": "b"}
    ]
}


def upgrade() -> None:
    # 1. Create technical_questions table
    op.create_table(
        'technical_questions',
        sa.Column('id', sa.String(length=50), nullable=False),
        sa.Column('department', sa.String(length=50), nullable=False),
        sa.Column('text', sa.Text(), nullable=False),
        sa.Column('options', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('answer', sa.String(length=10), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id', 'department'),
        schema=SCHEMA
    )

    # 2. Add test_data column to evaluation_tokens
    op.add_column(
        'evaluation_tokens',
        sa.Column('test_data', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        schema=SCHEMA
    )

    # 3. Seed technical_questions table
    meta = sa.MetaData()
    technical_questions_table = sa.Table(
        'technical_questions', meta,
        sa.Column('id', sa.String(50), primary_key=True),
        sa.Column('department', sa.String(50), primary_key=True),
        sa.Column('text', sa.Text(), nullable=False),
        sa.Column('options', postgresql.JSONB(), nullable=False),
        sa.Column('answer', sa.String(10), nullable=False),
        schema=SCHEMA
    )

    seed_data = []
    for dept, questions in TEST_QUESTIONS.items():
        for q in questions:
            seed_data.append({
                "id": q["id"],
                "department": dept,
                "text": q["text"],
                "options": q["options"],
                "answer": q["answer"]
            })
    op.bulk_insert(technical_questions_table, seed_data)


def downgrade() -> None:
    op.drop_column('evaluation_tokens', 'test_data', schema=SCHEMA)
    op.drop_table('technical_questions', schema=SCHEMA)
