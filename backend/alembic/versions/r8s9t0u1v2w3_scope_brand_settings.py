"""add brand scope to openings and reusable settings without rewriting rows"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "r8s9t0u1v2w3"
down_revision: Union[str, None] = "q7r8s9t0u1v2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SCHEMA = "recruitment"


def upgrade() -> None:
    for table in ("job_openings", "location_templates", "message_templates", "touchpoint_templates", "interviewer_names"):
        op.add_column(table, sa.Column("brand", sa.String(length=50), nullable=True), schema=SCHEMA)

    for table, old_name, new_name in (
        ("location_templates", "uq_location_templates_branch_name", "uq_location_templates_brand_branch_name"),
        ("touchpoint_templates", "uq_touchpoint_templates_branch_name", "uq_touchpoint_templates_brand_branch_name"),
        ("interviewer_names", "uq_interviewer_names_branch_name", "uq_interviewer_names_brand_branch_name"),
    ):
        op.drop_constraint(old_name, table, schema=SCHEMA, type_="unique")
        op.create_unique_constraint(new_name, table, ["brand", "branch_location", "name"], schema=SCHEMA)


def downgrade() -> None:
    for table, old_name, new_name in (
        ("location_templates", "uq_location_templates_branch_name", "uq_location_templates_brand_branch_name"),
        ("touchpoint_templates", "uq_touchpoint_templates_branch_name", "uq_touchpoint_templates_brand_branch_name"),
        ("interviewer_names", "uq_interviewer_names_branch_name", "uq_interviewer_names_brand_branch_name"),
    ):
        op.drop_constraint(new_name, table, schema=SCHEMA, type_="unique")
        op.create_unique_constraint(old_name, table, ["branch_location", "name"], schema=SCHEMA)
    for table in ("interviewer_names", "touchpoint_templates", "message_templates", "location_templates", "job_openings"):
        op.drop_column(table, "brand", schema=SCHEMA)
