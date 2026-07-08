"""Initial schema — users, candidates, pipeline, remarks, stubs

Revision ID: 001_initial
Revises:
Create Date: 2026-07-08

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    user_role = postgresql.ENUM(
        "ADMIN", "LOCAL_HR", "HEAD_OFFICE_HR", "DEPARTMENT_HEAD", "SALARY_TEAM",
        name="user_role",
    )
    pipeline_stage = postgresql.ENUM(
        "NEW_APPLICATION",
        "AWAITING_LOCAL_INTERVIEW",
        "LOCAL_HR_REVIEW_COMPLETE",
        "AWAITING_HEAD_OFFICE_INTERVIEW",
        "HEAD_OFFICE_INTERVIEW_COMPLETE",
        "SUITABLE_FOR_HIRE",
        "SALARY_PENDING",
        "SALARY_APPROVED",
        "OFFER_SENT",
        "OFFER_ACCEPTED",
        "OFFER_DECLINED",
        "JOINING_SCHEDULED",
        "JOINED",
        "REJECTED",
        "ON_HOLD",
        name="pipeline_stage",
    )
    source_channel = postgresql.ENUM(
        "WALK_IN", "INDEED", "REFERRAL", "CAMPUS", "OTHER",
        name="source_channel",
    )
    remark_stage_context = postgresql.ENUM(
        "LOCAL_HR", "HEAD_OFFICE_HR", "TECHNICAL_TEST", "DEPT_HEAD",
        name="remark_stage_context",
    )
    document_file_type = postgresql.ENUM(
        "RESUME", "ID_PROOF", "EDUCATION_CERT", "OFFER_LETTER", "JOINING_FORM", "OTHER",
        name="document_file_type",
    )
    message_channel = postgresql.ENUM(
        "WHATSAPP", "EMAIL", "SMS",
        name="message_channel",
    )
    message_status = postgresql.ENUM(
        "PENDING", "SENT", "DELIVERED", "FAILED",
        name="message_status",
    )

    user_role.create(op.get_bind(), checkfirst=True)
    pipeline_stage.create(op.get_bind(), checkfirst=True)
    source_channel.create(op.get_bind(), checkfirst=True)
    remark_stage_context.create(op.get_bind(), checkfirst=True)
    document_file_type.create(op.get_bind(), checkfirst=True)
    message_channel.create(op.get_bind(), checkfirst=True)
    message_status.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("role", user_role, nullable=False),
        sa.Column("branch_location", sa.String(length=255), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "candidates",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("candidate_id", sa.String(length=20), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("phone", sa.String(length=20), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("date_of_birth", sa.Date(), nullable=True),
        sa.Column("source_channel", source_channel, nullable=False),
        sa.Column("is_rejoining", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("is_duplicate_flagged", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("duplicate_of_candidate_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("current_stage", pipeline_stage, nullable=False),
        sa.Column("applied_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("assigned_hr_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("branch_location", sa.String(length=255), nullable=True),
        sa.Column("application_data", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("profile_completeness_pct", sa.Integer(), nullable=True),
        sa.Column("notes_summary", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["assigned_hr_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["duplicate_of_candidate_id"], ["candidates.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_candidates_candidate_id", "candidates", ["candidate_id"], unique=True)
    op.create_index("ix_candidates_full_name", "candidates", ["full_name"])
    op.create_index("ix_candidates_phone", "candidates", ["phone"])
    op.create_index("ix_candidates_email", "candidates", ["email"])
    op.create_index("ix_candidates_current_stage", "candidates", ["current_stage"])

    op.create_table(
        "stage_history",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("candidate_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("from_stage", pipeline_stage, nullable=True),
        sa.Column("to_stage", pipeline_stage, nullable=False),
        sa.Column("changed_by_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["candidate_id"], ["candidates.id"]),
        sa.ForeignKeyConstraint(["changed_by_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_stage_history_candidate_id", "stage_history", ["candidate_id"])

    op.create_table(
        "remarks",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("candidate_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("stage_context", remark_stage_context, nullable=False),
        sa.Column("author_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("scores", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["author_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["candidate_id"], ["candidates.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_remarks_candidate_id", "remarks", ["candidate_id"])

    op.create_table(
        "documents",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("candidate_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("file_type", document_file_type, nullable=False),
        sa.Column("file_path", sa.String(length=500), nullable=False),
        sa.Column("uploaded_by_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["candidate_id"], ["candidates.id"]),
        sa.ForeignKeyConstraint(["uploaded_by_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_documents_candidate_id", "documents", ["candidate_id"])

    op.create_table(
        "messages",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("candidate_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("channel", message_channel, nullable=False),
        sa.Column("template_name", sa.String(length=255), nullable=True),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("status", message_status, nullable=False),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["candidate_id"], ["candidates.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_messages_candidate_id", "messages", ["candidate_id"])

    op.create_table(
        "audit_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("entity_type", sa.String(length=100), nullable=False),
        sa.Column("entity_id", sa.String(length=100), nullable=False),
        sa.Column("action", sa.String(length=100), nullable=False),
        sa.Column("old_value", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("new_value", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_audit_logs_entity_type", "audit_logs", ["entity_type"])
    op.create_index("ix_audit_logs_entity_id", "audit_logs", ["entity_id"])


def downgrade() -> None:
    op.drop_table("audit_logs")
    op.drop_table("messages")
    op.drop_table("documents")
    op.drop_table("remarks")
    op.drop_table("stage_history")
    op.drop_table("candidates")
    op.drop_table("users")

    for enum_name in (
        "message_status",
        "message_channel",
        "document_file_type",
        "remark_stage_context",
        "source_channel",
        "pipeline_stage",
        "user_role",
    ):
        postgresql.ENUM(name=enum_name).drop(op.get_bind(), checkfirst=True)
