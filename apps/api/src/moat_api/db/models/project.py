from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from moat_api.db.base import Base, PrimaryKeyMixin, TenantMixin, TimestampMixin

# 1. Project Status (The overall workflow stage)
PROJECT_STATUSES = (
    "ASSIGNED",
    "ACCEPTED",
    "DRAFTING",
    "SUBMITTED_FOR_REVIEW",
    "REVISION_REQUIRED",
    "APPROVED",
    "COMPLETED",
    "CANCELLED"
)

# 2. Assignment Status (Whether the drafter has accepted the work)
ASSIGNMENT_STATUSES = (
    "PENDING_ACCEPTANCE",
    "ACCEPTED",
    "REJECTED",
    "REVOKED"
)

class ProjectAssignment(Base, PrimaryKeyMixin, TenantMixin, TimestampMixin):
    """Authoritative workflow record linking CEO/Analyst to Drafter, Invention, and Draft."""

    __tablename__ = "project_assignments"
    __table_args__ = (
        UniqueConstraint("tenant_id", "invention_id", name="uq_project_tenant_invention"),
        Index("ix_project_tenant_status", "tenant_id", "project_status"),
        Index("ix_project_drafter", "tenant_id", "drafter_id"),
    )

    invention_id: Mapped[uuid.UUID] = mapped_column(PgUUID(as_uuid=True), ForeignKey("inventions.id", ondelete="CASCADE"), nullable=False)
    
    # Relationships to users
    assigner_id: Mapped[uuid.UUID] = mapped_column(PgUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    drafter_id: Mapped[uuid.UUID] = mapped_column(PgUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    # Status Fields (strictly separating the concerns)
    project_status: Mapped[str] = mapped_column(String(32), default="ASSIGNED", nullable=False)
    assignment_status: Mapped[str] = mapped_column(String(32), default="PENDING_ACCEPTANCE", nullable=False)
    
    # Metadata
    instructions: Mapped[str] = mapped_column(Text, server_default="", nullable=False)
    due_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class ProjectTransitionLog(Base, PrimaryKeyMixin, TenantMixin, TimestampMixin):
    """Immutable log of significant workflow transitions."""

    __tablename__ = "project_transition_logs"
    __table_args__ = (
        Index("ix_transitions_project_id", "tenant_id", "project_assignment_id"),
    )

    project_assignment_id: Mapped[uuid.UUID] = mapped_column(PgUUID(as_uuid=True), ForeignKey("project_assignments.id", ondelete="CASCADE"), nullable=False)
    actor_id: Mapped[uuid.UUID] = mapped_column(PgUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    from_status: Mapped[str] = mapped_column(String(32), nullable=False)
    to_status: Mapped[str] = mapped_column(String(32), nullable=False)
    transition_type: Mapped[str] = mapped_column(String(32), nullable=False) # e.g. "PROJECT_STATUS", "ASSIGNMENT_STATUS", "REVIEW_STATUS"
    reason: Mapped[str] = mapped_column(Text, server_default="", nullable=False)
