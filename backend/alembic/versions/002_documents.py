"""Add documents table for resume uploads"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "002_documents"
down_revision: Union[str, None] = "001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SCHEMA = "recruitment"


def upgrade() -> None:
    document_type = postgresql.ENUM(
        "RESUME",
        name="document_type",
        schema=SCHEMA,
        create_type=False,
    )
    document_type.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "documents",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("candidate_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("doc_type", document_type, nullable=False),
        sa.Column("file_name", sa.String(length=255), nullable=False),
        sa.Column("content_type", sa.String(length=100), nullable=False),
        sa.Column("storage_path", sa.Text(), nullable=False),
        sa.Column("file_size_bytes", sa.Integer(), nullable=False),
        sa.Column("uploaded_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["candidate_id"], [f"{SCHEMA}.candidates.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["uploaded_by_user_id"], [f"{SCHEMA}.users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "doc_type", name="uq_documents_candidate_doc_type"),
        schema=SCHEMA,
    )
    op.create_index("ix_documents_candidate_id", "documents", ["candidate_id"], schema=SCHEMA)


def downgrade() -> None:
    op.drop_index("ix_documents_candidate_id", table_name="documents", schema=SCHEMA)
    op.drop_table("documents", schema=SCHEMA)
    postgresql.ENUM(name="document_type", schema=SCHEMA).drop(op.get_bind(), checkfirst=True)
