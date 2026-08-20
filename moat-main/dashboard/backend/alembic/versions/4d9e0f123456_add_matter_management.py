"""add matter management

Revision ID: 4d9e0f123456
Revises: 3c8d9e0f1234
Create Date: 2026-06-04 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "4d9e0f123456"
down_revision = "3c8d9e0f1234"
branch_labels = None
depends_on = None

matter_status = postgresql.ENUM("intake", "active", "searching", "analysis", "review", "blocked", "completed", "archived", name="matter_status")
matter_priority = postgresql.ENUM("low", "medium", "high", "critical", name="matter_priority")
matter_member_role = postgresql.ENUM("owner", "manager", "contributor", "viewer", name="matter_member_role")
matter_document_type = postgresql.ENUM("patent", "prior_art", "technical", "legal", "evidence", "other", name="matter_document_type")


def upgrade() -> None:
    bind = op.get_bind()
    matter_status.create(bind, checkfirst=True)
    matter_priority.create(bind, checkfirst=True)
    matter_member_role.create(bind, checkfirst=True)
    matter_document_type.create(bind, checkfirst=True)

    op.create_table(
        "matters",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True, nullable=False),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=False), sa.ForeignKey("workspaces.id", ondelete="SET NULL"), nullable=True),
        sa.Column("owner_id", postgresql.UUID(as_uuid=False), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("matter_number", sa.String(length=64), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("client_name", sa.String(length=255), nullable=True),
        sa.Column("technology_area", sa.String(length=255), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("status", matter_status, nullable=False, server_default="intake"),
        sa.Column("priority", matter_priority, nullable=False, server_default="medium"),
        sa.Column("due_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("tags", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="[]"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_matters_matter_number", "matters", ["matter_number"], unique=True)
    op.create_index("ix_matters_owner_id", "matters", ["owner_id"])
    op.create_index("ix_matters_status", "matters", ["status"])
    op.create_index("ix_matters_priority", "matters", ["priority"])
    op.create_index("ix_matters_workspace_id", "matters", ["workspace_id"])
    op.create_index("ix_matters_owner_status", "matters", ["owner_id", "status"])
    op.create_index("ix_matters_workspace_status", "matters", ["workspace_id", "status"])

    op.create_table(
        "matter_members",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True, nullable=False),
        sa.Column("matter_id", postgresql.UUID(as_uuid=False), sa.ForeignKey("matters.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=False), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role", matter_member_role, nullable=False, server_default="viewer"),
        sa.Column("assigned_by_id", postgresql.UUID(as_uuid=False), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("joined_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("matter_id", "user_id", name="uq_matter_member_user"),
    )
    op.create_index("ix_matter_members_matter_id", "matter_members", ["matter_id"])
    op.create_index("ix_matter_members_user_id", "matter_members", ["user_id"])

    op.create_table(
        "matter_documents",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True, nullable=False),
        sa.Column("matter_id", postgresql.UUID(as_uuid=False), sa.ForeignKey("matters.id", ondelete="CASCADE"), nullable=False),
        sa.Column("uploaded_by_id", postgresql.UUID(as_uuid=False), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("filename", sa.String(length=255), nullable=False),
        sa.Column("document_type", matter_document_type, nullable=False, server_default="other"),
        sa.Column("content_type", sa.String(length=120), nullable=True),
        sa.Column("size_bytes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("storage_url", sa.String(length=1024), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_matter_documents_matter_id", "matter_documents", ["matter_id"])
    op.create_index("ix_matter_documents_uploaded_by_id", "matter_documents", ["uploaded_by_id"])

    op.create_table(
        "matter_activity",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True, nullable=False),
        sa.Column("matter_id", postgresql.UUID(as_uuid=False), sa.ForeignKey("matters.id", ondelete="CASCADE"), nullable=False),
        sa.Column("actor_id", postgresql.UUID(as_uuid=False), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("action", sa.String(length=100), nullable=False),
        sa.Column("entity_type", sa.String(length=100), nullable=False),
        sa.Column("entity_id", sa.String(length=64), nullable=True),
        sa.Column("message", sa.String(length=512), nullable=False),
        sa.Column("details", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_matter_activity_actor_id", "matter_activity", ["actor_id"])
    op.create_index("ix_matter_activity_matter_id", "matter_activity", ["matter_id"])
    op.create_index("ix_matter_activity_matter_created", "matter_activity", ["matter_id", "created_at"])

    op.create_table(
        "matter_status_history",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True, nullable=False),
        sa.Column("matter_id", postgresql.UUID(as_uuid=False), sa.ForeignKey("matters.id", ondelete="CASCADE"), nullable=False),
        sa.Column("from_status", matter_status, nullable=True),
        sa.Column("to_status", matter_status, nullable=False),
        sa.Column("changed_by_id", postgresql.UUID(as_uuid=False), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_matter_status_history_changed_by_id", "matter_status_history", ["changed_by_id"])
    op.create_index("ix_matter_status_history_matter_id", "matter_status_history", ["matter_id"])


def downgrade() -> None:
    op.drop_index("ix_matter_status_history_matter_id", table_name="matter_status_history")
    op.drop_index("ix_matter_status_history_changed_by_id", table_name="matter_status_history")
    op.drop_table("matter_status_history")
    op.drop_index("ix_matter_activity_matter_created", table_name="matter_activity")
    op.drop_index("ix_matter_activity_matter_id", table_name="matter_activity")
    op.drop_index("ix_matter_activity_actor_id", table_name="matter_activity")
    op.drop_table("matter_activity")
    op.drop_index("ix_matter_documents_uploaded_by_id", table_name="matter_documents")
    op.drop_index("ix_matter_documents_matter_id", table_name="matter_documents")
    op.drop_table("matter_documents")
    op.drop_index("ix_matter_members_user_id", table_name="matter_members")
    op.drop_index("ix_matter_members_matter_id", table_name="matter_members")
    op.drop_table("matter_members")
    op.drop_index("ix_matters_workspace_status", table_name="matters")
    op.drop_index("ix_matters_owner_status", table_name="matters")
    op.drop_index("ix_matters_workspace_id", table_name="matters")
    op.drop_index("ix_matters_priority", table_name="matters")
    op.drop_index("ix_matters_status", table_name="matters")
    op.drop_index("ix_matters_owner_id", table_name="matters")
    op.drop_index("ix_matters_matter_number", table_name="matters")
    op.drop_table("matters")
    matter_document_type.drop(op.get_bind(), checkfirst=True)
    matter_member_role.drop(op.get_bind(), checkfirst=True)
    matter_priority.drop(op.get_bind(), checkfirst=True)
    matter_status.drop(op.get_bind(), checkfirst=True)
