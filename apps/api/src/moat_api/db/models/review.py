from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column

from moat_api.db.base import Base, PrimaryKeyMixin, TenantMixin, TimestampMixin

DECISION_OUTCOMES = ("approved", "returned", "rejected")


class Submission(Base, PrimaryKeyMixin, TenantMixin, TimestampMixin):
    """A request for review of one exact revision."""

    __tablename__ = "submissions"
    __table_args__ = (
        # One open submission per revision. A second submit of the same
        # revision is a no-op rather than a duplicate review queue entry.
        UniqueConstraint(
            "tenant_id", "invention_id", "revision", name="uq_submissions_invention_revision"
        ),
        UniqueConstraint("tenant_id", "id", name="uq_submissions_tenant_id_id"),
        ForeignKeyConstraint(
            ["tenant_id", "invention_id"],
            ["inventions.tenant_id", "inventions.id"],
            ondelete="CASCADE",
            name="fk_submissions_invention",
        ),
        Index("ix_submissions_tenant_state", "tenant_id", "state", "created_at"),
    )

    invention_id: Mapped[uuid.UUID] = mapped_column(PgUUID(as_uuid=True), nullable=False)
    revision: Mapped[int] = mapped_column(Integer, nullable=False)
    state: Mapped[str] = mapped_column(String(32), server_default="open", nullable=False)

    submitted_by_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    assigned_to_id: Mapped[uuid.UUID | None] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    note: Mapped[str] = mapped_column(Text, server_default="", nullable=False)


class Decision(Base, PrimaryKeyMixin, TenantMixin, TimestampMixin):
    """A reviewer's position on one revision.

    `revision` is stored on the decision itself, not read through the invention,
    so that a later edit cannot silently re-point an approval at text nobody
    reviewed. The API marks a decision superseded when the invention has moved
    past the revision recorded here.
    """

    __tablename__ = "decisions"
    __table_args__ = (
        ForeignKeyConstraint(
            ["tenant_id", "submission_id"],
            ["submissions.tenant_id", "submissions.id"],
            ondelete="CASCADE",
            name="fk_decisions_submission",
        ),
        ForeignKeyConstraint(
            ["tenant_id", "invention_id"],
            ["inventions.tenant_id", "inventions.id"],
            ondelete="CASCADE",
            name="fk_decisions_invention",
        ),
        Index("ix_decisions_invention", "tenant_id", "invention_id", "decided_at"),
    )

    submission_id: Mapped[uuid.UUID] = mapped_column(PgUUID(as_uuid=True), nullable=False)
    invention_id: Mapped[uuid.UUID] = mapped_column(PgUUID(as_uuid=True), nullable=False)
    revision: Mapped[int] = mapped_column(Integer, nullable=False)

    reviewer_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    outcome: Mapped[str] = mapped_column(String(32), nullable=False)
    rationale: Mapped[str] = mapped_column(Text, nullable=False)
    decided_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()"), nullable=False
    )
