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
from sqlalchemy.orm import Mapped, mapped_column, relationship

from moat_api.db.base import Base, PrimaryKeyMixin, TenantMixin, TimestampMixin

# A figure moves through these. "rework" is a first-class state rather than a
# flavour of rejection: the design team is expected to iterate, and treating
# revision as failure would make the history unreadable.
DRAWING_STATUSES = ("requested", "in_progress", "submitted", "approved", "rework")
DRAWING_REVIEW_OUTCOMES = ("approved", "rework")


class Drawing(Base, PrimaryKeyMixin, TenantMixin, TimestampMixin):
    """One figure in a patent specification.

    The slot is created by the drafter, who knows what needs illustrating, and
    filled by the design team, who can draw. Keeping them separate is the
    point: a figure number is referenced throughout the specification long
    before anyone has drawn it.
    """

    __tablename__ = "drawings"
    __table_args__ = (
        UniqueConstraint("tenant_id", "id", name="uq_drawings_tenant_id_id"),
        # FIG. numbers are unique within a specification and are referenced by
        # the detailed description, so two figures cannot share one.
        UniqueConstraint(
            "tenant_id", "document_id", "figure_number", name="uq_drawings_figure"
        ),
        ForeignKeyConstraint(
            ["tenant_id", "document_id"],
            ["documents.tenant_id", "documents.id"],
            ondelete="CASCADE",
            name="fk_drawings_document",
        ),
        Index("ix_drawings_queue", "tenant_id", "status", "updated_at"),
        Index("ix_drawings_assignee", "tenant_id", "assigned_to_id", "status"),
    )

    document_id: Mapped[uuid.UUID] = mapped_column(PgUUID(as_uuid=True), nullable=False)
    figure_number: Mapped[int] = mapped_column(Integer, nullable=False)

    # The line that appears in "Brief description of the drawings".
    caption: Mapped[str] = mapped_column(String(500), server_default="", nullable=False)
    # What the drafter needs shown, in their words.
    brief: Mapped[str] = mapped_column(Text, server_default="", nullable=False)

    status: Mapped[str] = mapped_column(String(16), server_default="requested", nullable=False)
    current_version: Mapped[int] = mapped_column(Integer, server_default=text("0"), nullable=False)

    requested_by_id: Mapped[uuid.UUID | None] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    assigned_to_id: Mapped[uuid.UUID | None] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    versions: Mapped[list[DrawingVersion]] = relationship(
        back_populates="drawing", cascade="all, delete-orphan"
    )


class DrawingVersion(Base, PrimaryKeyMixin, TenantMixin, TimestampMixin):
    """One uploaded rendition of a figure.

    Kept rather than overwritten: a drawing that was reviewed has to remain
    retrievable, because the review refers to what was actually seen.
    """

    __tablename__ = "drawing_versions"
    __table_args__ = (
        UniqueConstraint(
            "tenant_id", "drawing_id", "version", name="uq_drawing_versions_version"
        ),
        ForeignKeyConstraint(
            ["tenant_id", "drawing_id"],
            ["drawings.tenant_id", "drawings.id"],
            ondelete="CASCADE",
            name="fk_drawing_versions_drawing",
        ),
        # The image itself lives in object storage like any other upload, so it
        # goes through the same quarantine and verification path.
        ForeignKeyConstraint(
            ["tenant_id", "source_object_id"],
            ["source_objects.tenant_id", "source_objects.id"],
            ondelete="SET NULL",
            name="fk_drawing_versions_object",
        ),
    )

    drawing_id: Mapped[uuid.UUID] = mapped_column(PgUUID(as_uuid=True), nullable=False)
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    source_object_id: Mapped[uuid.UUID | None] = mapped_column(
        PgUUID(as_uuid=True), nullable=True
    )
    notes: Mapped[str] = mapped_column(Text, server_default="", nullable=False)
    uploaded_by_id: Mapped[uuid.UUID | None] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    drawing: Mapped[Drawing] = relationship(back_populates="versions")


class DrawingReview(Base, PrimaryKeyMixin, TenantMixin, TimestampMixin):
    """The drafter's response to one uploaded version.

    Recorded against the version, not the drawing: "approved" has to mean
    "approved this image", or a later upload would inherit an acceptance
    nobody gave.
    """

    __tablename__ = "drawing_reviews"
    __table_args__ = (
        UniqueConstraint(
            "tenant_id", "drawing_version_id", name="uq_drawing_reviews_version"
        ),
        ForeignKeyConstraint(
            ["tenant_id", "drawing_id"],
            ["drawings.tenant_id", "drawings.id"],
            ondelete="CASCADE",
            name="fk_drawing_reviews_drawing",
        ),
        Index("ix_drawing_reviews_drawing", "tenant_id", "drawing_id", "created_at"),
    )

    drawing_id: Mapped[uuid.UUID] = mapped_column(PgUUID(as_uuid=True), nullable=False)
    drawing_version_id: Mapped[uuid.UUID] = mapped_column(PgUUID(as_uuid=True), nullable=False)
    version: Mapped[int] = mapped_column(Integer, nullable=False)

    reviewer_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    outcome: Mapped[str] = mapped_column(String(16), nullable=False)
    notes: Mapped[str] = mapped_column(Text, server_default="", nullable=False)
