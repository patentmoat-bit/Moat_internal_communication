"""add ai invention workspace

Revision ID: 5e0f12345678
Revises: 4d9e0f123456
Create Date: 2026-06-04 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "5e0f12345678"
down_revision = "4d9e0f123456"
branch_labels = None
depends_on = None

invention_status = postgresql.ENUM("draft", "ready", "analyzing", "analyzed", "failed", "archived", name="invention_status")
invention_document_type = postgresql.ENUM("pdf", "patent", "technical_document", "image", "sketch", "diagram", "other", name="invention_document_type")


def upgrade() -> None:
    bind = op.get_bind()
    invention_status.create(bind, checkfirst=True)
    invention_document_type.create(bind, checkfirst=True)

    op.create_table(
        "inventions",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True, nullable=False),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=False), sa.ForeignKey("workspaces.id", ondelete="SET NULL"), nullable=True),
        sa.Column("matter_id", postgresql.UUID(as_uuid=False), sa.ForeignKey("matters.id", ondelete="SET NULL"), nullable=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", invention_status, nullable=False, server_default="draft"),
        sa.Column("created_by", postgresql.UUID(as_uuid=False), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_inventions_workspace_id", "inventions", ["workspace_id"])
    op.create_index("ix_inventions_matter_id", "inventions", ["matter_id"])
    op.create_index("ix_inventions_created_by", "inventions", ["created_by"])
    op.create_index("ix_inventions_status", "inventions", ["status"])
    op.create_index("ix_inventions_creator_status", "inventions", ["created_by", "status"])

    op.create_table(
        "invention_documents",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True, nullable=False),
        sa.Column("invention_id", postgresql.UUID(as_uuid=False), sa.ForeignKey("inventions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("file_name", sa.String(length=255), nullable=False),
        sa.Column("file_type", invention_document_type, nullable=False, server_default="other"),
        sa.Column("content_type", sa.String(length=120), nullable=True),
        sa.Column("storage_url", sa.String(length=1024), nullable=True),
        sa.Column("extracted_text", sa.Text(), nullable=True),
        sa.Column("uploaded_by", postgresql.UUID(as_uuid=False), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_invention_documents_invention_id", "invention_documents", ["invention_id"])
    op.create_index("ix_invention_documents_uploaded_by", "invention_documents", ["uploaded_by"])

    op.create_table(
        "invention_analysis",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True, nullable=False),
        sa.Column("invention_id", postgresql.UUID(as_uuid=False), sa.ForeignKey("inventions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("technical_summary", sa.Text(), nullable=True),
        sa.Column("innovation_summary", sa.Text(), nullable=True),
        sa.Column("key_components", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="[]"),
        sa.Column("technical_domains", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="[]"),
        sa.Column("differentiators", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="[]"),
        sa.Column("workflows", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="[]"),
        sa.Column("technical_architecture", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("innovation_highlights", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="[]"),
        sa.Column("confidence_score", sa.Float(), nullable=False, server_default="0"),
        sa.Column("model_name", sa.String(length=120), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_invention_analysis_invention_id", "invention_analysis", ["invention_id"])


def downgrade() -> None:
    op.drop_index("ix_invention_analysis_invention_id", table_name="invention_analysis")
    op.drop_table("invention_analysis")
    op.drop_index("ix_invention_documents_uploaded_by", table_name="invention_documents")
    op.drop_index("ix_invention_documents_invention_id", table_name="invention_documents")
    op.drop_table("invention_documents")
    op.drop_index("ix_inventions_creator_status", table_name="inventions")
    op.drop_index("ix_inventions_status", table_name="inventions")
    op.drop_index("ix_inventions_created_by", table_name="inventions")
    op.drop_index("ix_inventions_matter_id", table_name="inventions")
    op.drop_index("ix_inventions_workspace_id", table_name="inventions")
    op.drop_table("inventions")
    invention_document_type.drop(op.get_bind(), checkfirst=True)
    invention_status.drop(op.get_bind(), checkfirst=True)
