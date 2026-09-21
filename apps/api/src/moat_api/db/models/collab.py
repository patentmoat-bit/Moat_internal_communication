from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column

from moat_api.db.base import Base, PrimaryKeyMixin, TenantMixin, TimestampMixin


class Comment(Base, PrimaryKeyMixin, TenantMixin, TimestampMixin):
    __tablename__ = "comments"
    __table_args__ = (
        Index("ix_comments_target", "tenant_id", "target_type", "target_id", "created_at"),
    )

    target_type: Mapped[str] = mapped_column(String(32), nullable=False)
    target_id: Mapped[uuid.UUID] = mapped_column(PgUUID(as_uuid=True), nullable=False)
    # Anchors are pinned to a revision: text that moved is shown as unresolved
    # rather than silently re-anchored to different words.
    anchor_revision: Mapped[int | None] = mapped_column(nullable=True)
    anchor_text: Mapped[str] = mapped_column(Text, server_default="", nullable=False)

    author_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("comments.id", ondelete="CASCADE"), nullable=True
    )
    body: Mapped[str] = mapped_column(Text, nullable=False)
    is_resolved: Mapped[bool] = mapped_column(Boolean, server_default=text("false"), nullable=False)


class Notification(Base, PrimaryKeyMixin, TenantMixin, TimestampMixin):
    """Persisted before any realtime delivery is attempted.

    Delivery is a hint; the row is the record. A dropped websocket must never
    lose a notification, and delivery is never treated as acknowledgement.
    """

    __tablename__ = "notifications"
    __table_args__ = (
        Index("ix_notifications_recipient", "tenant_id", "user_id", "read_at", "created_at"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    kind: Mapped[str] = mapped_column(String(48), nullable=False)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    body: Mapped[str] = mapped_column(Text, server_default="", nullable=False)
    target_type: Mapped[str] = mapped_column(String(32), server_default="", nullable=False)
    target_id: Mapped[uuid.UUID | None] = mapped_column(PgUUID(as_uuid=True), nullable=True)
    action_url: Mapped[str] = mapped_column(String(500), server_default="", nullable=False)
    priority: Mapped[str] = mapped_column(String(16), server_default="medium", nullable=False)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    payload: Mapped[dict] = mapped_column(JSONB, server_default=text("'{}'::jsonb"), nullable=False)
