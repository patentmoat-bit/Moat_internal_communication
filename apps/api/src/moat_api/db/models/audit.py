from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, Index, String, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column

from moat_api.db.base import Base, PrimaryKeyMixin, TenantMixin, TimestampMixin


class AuditEvent(Base, PrimaryKeyMixin, TenantMixin, TimestampMixin):
    """Append-only record of who did what.

    The application role is granted INSERT and SELECT only -- no UPDATE or
    DELETE -- so ordinary application code cannot rewrite history. That is not
    the same as immutable: a privileged operator still can, which is why the
    design calls for signed export to a separately controlled store.
    """

    __tablename__ = "audit_events"
    __table_args__ = (
        Index("ix_audit_events_tenant_time", "tenant_id", "created_at"),
        Index("ix_audit_events_resource", "tenant_id", "resource_type", "resource_id"),
    )

    actor_id: Mapped[uuid.UUID | None] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    action: Mapped[str] = mapped_column(String(96), nullable=False)
    resource_type: Mapped[str] = mapped_column(String(48), server_default="", nullable=False)
    resource_id: Mapped[uuid.UUID | None] = mapped_column(PgUUID(as_uuid=True), nullable=True)
    request_id: Mapped[str] = mapped_column(String(64), server_default="", nullable=False)
    detail: Mapped[dict] = mapped_column(JSONB, server_default=text("'{}'::jsonb"), nullable=False)
