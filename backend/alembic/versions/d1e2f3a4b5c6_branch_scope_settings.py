"""scope interviewer_names and location_templates per branch

Revision ID: d1e2f3a4b5c6
Revises: c9a1b2d3e4f5
Create Date: 2026-08-12 11:25:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d1e2f3a4b5c6"
down_revision: Union[str, None] = "c9a1b2d3e4f5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "interviewer_names",
        sa.Column("branch_location", sa.String(length=255), nullable=False, server_default="Kalamassery"),
        schema="recruitment",
    )
    op.drop_constraint("interviewer_names_name_key", "interviewer_names", schema="recruitment", type_="unique")
    op.create_unique_constraint(
        "uq_interviewer_names_branch_name",
        "interviewer_names",
        ["branch_location", "name"],
        schema="recruitment",
    )
    op.create_index(
        "ix_interviewer_names_branch_location",
        "interviewer_names",
        ["branch_location"],
        schema="recruitment",
    )
    op.alter_column("interviewer_names", "branch_location", server_default=None, schema="recruitment")

    op.add_column(
        "location_templates",
        sa.Column("branch_location", sa.String(length=255), nullable=False, server_default="Kalamassery"),
        schema="recruitment",
    )
    op.create_index(
        "ix_location_templates_branch_location",
        "location_templates",
        ["branch_location"],
        schema="recruitment",
    )
    op.create_unique_constraint(
        "uq_location_templates_branch_name",
        "location_templates",
        ["branch_location", "name"],
        schema="recruitment",
    )
    op.alter_column("location_templates", "branch_location", server_default=None, schema="recruitment")


def downgrade() -> None:
    op.drop_constraint("uq_location_templates_branch_name", "location_templates", schema="recruitment", type_="unique")
    op.drop_index("ix_location_templates_branch_location", table_name="location_templates", schema="recruitment")
    op.drop_column("location_templates", "branch_location", schema="recruitment")

    op.drop_index("ix_interviewer_names_branch_location", table_name="interviewer_names", schema="recruitment")
    op.drop_constraint("uq_interviewer_names_branch_name", "interviewer_names", schema="recruitment", type_="unique")
    op.drop_column("interviewer_names", "branch_location", schema="recruitment")
    op.create_unique_constraint("interviewer_names_name_key", "interviewer_names", ["name"], schema="recruitment")
