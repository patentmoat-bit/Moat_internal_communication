from __future__ import annotations

import uuid

from sqlalchemy import (
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from moat_api.db.base import Base, PrimaryKeyMixin, TenantMixin, TimestampMixin

INVENTION_STATUSES = ("draft", "submitted", "in_review", "approved", "returned", "filed")


class Invention(Base, PrimaryKeyMixin, TenantMixin, TimestampMixin):
    """An invention disclosure.

    Holds only the pointer to the current revision; the content of every
    revision lives in invention_versions and is never edited in place, so a
    review decision can always name the exact text it was made against.
    """

    __tablename__ = "inventions"
    __table_args__ = (
        UniqueConstraint("tenant_id", "ref", name="uq_inventions_tenant_ref"),
        UniqueConstraint("tenant_id", "id", name="uq_inventions_tenant_id_id"),
        # Access path for the list view: tenant first, then filter and sort.
        Index("ix_inventions_tenant_status_updated", "tenant_id", "status", "updated_at", "id"),
    )

    ref: Mapped[str] = mapped_column(String(64), nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    summary: Mapped[str] = mapped_column(Text, server_default="", nullable=False)
    status: Mapped[str] = mapped_column(String(32), server_default="draft", nullable=False)
    current_revision: Mapped[int] = mapped_column(Integer, server_default=text("1"), nullable=False)
    classifications: Mapped[list[str]] = mapped_column(
        ARRAY(String(32)), server_default=text("'{}'::varchar[]"), nullable=False
    )
    created_by_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )

    versions: Mapped[list[InventionVersion]] = relationship(
        back_populates="invention", cascade="all, delete-orphan"
    )
    contributors: Mapped[list[InventionContributor]] = relationship(
        back_populates="invention", cascade="all, delete-orphan"
    )


class InventionVersion(Base, PrimaryKeyMixin, TenantMixin, TimestampMixin):
    """Immutable snapshot of a disclosure at one revision."""

    __tablename__ = "invention_versions"
    __table_args__ = (
        UniqueConstraint(
            "tenant_id", "invention_id", "revision", name="uq_invention_versions_revision"
        ),
        # Composite foreign key: a bare invention_id would let a row point at
        # another tenant's invention. The tenant must match on both sides.
        ForeignKeyConstraint(
            ["tenant_id", "invention_id"],
            ["inventions.tenant_id", "inventions.id"],
            ondelete="CASCADE",
            name="fk_invention_versions_invention",
        ),
    )

    invention_id: Mapped[uuid.UUID] = mapped_column(PgUUID(as_uuid=True), nullable=False)
    revision: Mapped[int] = mapped_column(Integer, nullable=False)

    title: Mapped[str] = mapped_column(String(500), nullable=False)
    summary: Mapped[str] = mapped_column(Text, server_default="", nullable=False)
    problem: Mapped[str] = mapped_column(Text, server_default="", nullable=False)
    description: Mapped[str] = mapped_column(Text, server_default="", nullable=False)
    classifications: Mapped[list[str]] = mapped_column(
        ARRAY(String(32)), server_default=text("'{}'::varchar[]"), nullable=False
    )

    authored_by_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )

    invention: Mapped[Invention] = relationship(back_populates="versions")


class InventionContributor(Base, PrimaryKeyMixin, TenantMixin, TimestampMixin):
    """A named inventor or contributor. Inventorship is legally significant,
    so contributors are recorded explicitly rather than inferred from edits."""

    __tablename__ = "invention_contributors"
    __table_args__ = (
        UniqueConstraint(
            "tenant_id", "invention_id", "user_id", name="uq_invention_contributors_unique"
        ),
        ForeignKeyConstraint(
            ["tenant_id", "invention_id"],
            ["inventions.tenant_id", "inventions.id"],
            ondelete="CASCADE",
            name="fk_invention_contributors_invention",
        ),
    )

    invention_id: Mapped[uuid.UUID] = mapped_column(PgUUID(as_uuid=True), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    contribution: Mapped[str] = mapped_column(String(200), server_default="", nullable=False)

    invention: Mapped[Invention] = relationship(back_populates="contributors")
