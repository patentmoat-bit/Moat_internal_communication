from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    BigInteger,
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
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from moat_api.db.base import Base, PrimaryKeyMixin, TenantMixin, TimestampMixin

UPLOAD_STATES = ("reserved", "uploaded", "verified", "rejected", "expired")
OBJECT_STATES = ("quarantined", "scanning", "extracting", "ready", "rejected")


class UploadSession(Base, PrimaryKeyMixin, TenantMixin, TimestampMixin):
    """A reserved, bounded upload slot.

    The object key is generated server-side and lands in a quarantine prefix.
    A client never chooses where its bytes go, and never gets a URL that can
    reach anything but its own reserved key.
    """

    __tablename__ = "upload_sessions"
    __table_args__ = (
        UniqueConstraint("tenant_id", "id", name="uq_upload_sessions_tenant_id_id"),
        UniqueConstraint("object_key", name="uq_upload_sessions_object_key"),
        Index("ix_upload_sessions_expiry", "tenant_id", "state", "expires_at"),
    )

    filename: Mapped[str] = mapped_column(String(300), nullable=False)
    content_type: Mapped[str] = mapped_column(String(120), nullable=False)
    # What the client said it would send. Checked against what actually landed.
    declared_size: Mapped[int] = mapped_column(BigInteger, nullable=False)

    object_key: Mapped[str] = mapped_column(String(500), nullable=False)
    state: Mapped[str] = mapped_column(String(16), server_default="reserved", nullable=False)

    actual_size: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    sha256: Mapped[str] = mapped_column(String(64), server_default="", nullable=False)
    rejection_reason: Mapped[str] = mapped_column(String(200), server_default="", nullable=False)

    created_by_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    invention_id: Mapped[uuid.UUID | None] = mapped_column(PgUUID(as_uuid=True), nullable=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class SourceObject(Base, PrimaryKeyMixin, TenantMixin, TimestampMixin):
    """A stored file, after its upload was verified.

    Stays quarantined until MIME validation and scanning pass. PostgreSQL holds
    the hash, ownership and state; the bytes live in object storage (§6).
    """

    __tablename__ = "source_objects"
    __table_args__ = (
        UniqueConstraint("tenant_id", "id", name="uq_source_objects_tenant_id_id"),
        # The same file uploaded twice is stored once per tenant.
        UniqueConstraint("tenant_id", "sha256", name="uq_source_objects_tenant_sha256"),
        ForeignKeyConstraint(
            ["tenant_id", "invention_id"],
            ["inventions.tenant_id", "inventions.id"],
            ondelete="CASCADE",
            name="fk_source_objects_invention",
        ),
        Index("ix_source_objects_invention", "tenant_id", "invention_id", "created_at"),
    )

    invention_id: Mapped[uuid.UUID | None] = mapped_column(PgUUID(as_uuid=True), nullable=True)
    upload_session_id: Mapped[uuid.UUID | None] = mapped_column(PgUUID(as_uuid=True), nullable=True)

    filename: Mapped[str] = mapped_column(String(300), nullable=False)
    content_type: Mapped[str] = mapped_column(String(120), nullable=False)
    object_key: Mapped[str] = mapped_column(String(500), nullable=False)
    size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    sha256: Mapped[str] = mapped_column(String(64), nullable=False)

    state: Mapped[str] = mapped_column(String(16), server_default="quarantined", nullable=False)
    rejection_reason: Mapped[str] = mapped_column(String(300), server_default="", nullable=False)

    page_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # Pages with no text layer. Non-zero means OCR is required to read them,
    # which the UI states rather than quietly returning partial text.
    pages_needing_ocr: Mapped[int | None] = mapped_column(Integer, nullable=True)

    uploaded_by_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    artifacts: Mapped[list[ExtractionArtifact]] = relationship(
        back_populates="source_object", cascade="all, delete-orphan"
    )


class ExtractionArtifact(Base, PrimaryKeyMixin, TenantMixin, TimestampMixin):
    """Output of extraction: text, per-page text, or a rendered preview.

    Content-addressed by sha256 so a retried activity that produces identical
    output is a no-op rather than a duplicate.
    """

    __tablename__ = "extraction_artifacts"
    __table_args__ = (
        ForeignKeyConstraint(
            ["tenant_id", "source_object_id"],
            ["source_objects.tenant_id", "source_objects.id"],
            ondelete="CASCADE",
            name="fk_extraction_artifacts_source",
        ),
        UniqueConstraint(
            "tenant_id", "source_object_id", "kind", "page_number",
            name="uq_extraction_artifacts_unique",
        ),
    )

    source_object_id: Mapped[uuid.UUID] = mapped_column(PgUUID(as_uuid=True), nullable=False)
    kind: Mapped[str] = mapped_column(String(32), nullable=False)
    page_number: Mapped[int] = mapped_column(Integer, server_default=text("0"), nullable=False)
    object_key: Mapped[str] = mapped_column(String(500), server_default="", nullable=False)
    # Short extractions are kept inline; long ones live in object storage and
    # this stays empty.
    inline_text: Mapped[str] = mapped_column(Text, server_default="", nullable=False)
    size_bytes: Mapped[int] = mapped_column(BigInteger, server_default=text("0"), nullable=False)
    sha256: Mapped[str] = mapped_column(String(64), server_default="", nullable=False)
    extractor: Mapped[str] = mapped_column(String(64), server_default="", nullable=False)
    detail: Mapped[dict] = mapped_column(JSONB, server_default=text("'{}'::jsonb"), nullable=False)

    source_object: Mapped[SourceObject] = relationship(back_populates="artifacts")


class IndexManifest(Base, PrimaryKeyMixin, TimestampMixin):
    """A built search index, and what went into it.

    Not tenant-owned: the public corpus index is shared. Versioned names behind
    an alias mean a rebuild is a cutover, not an outage, and a bad build can be
    rolled back by pointing the alias at the previous manifest (§8).
    """

    __tablename__ = "index_manifests"
    __table_args__ = (UniqueConstraint("index_name", name="uq_index_manifests_name"),)

    index_name: Mapped[str] = mapped_column(String(120), nullable=False)
    alias: Mapped[str] = mapped_column(String(120), nullable=False)
    corpus_revision: Mapped[str] = mapped_column(String(64), nullable=False)
    retrieval_version: Mapped[str] = mapped_column(String(64), nullable=False)
    embedding_model: Mapped[str] = mapped_column(String(120), server_default="", nullable=False)
    embedding_dimensions: Mapped[int] = mapped_column(
        Integer, server_default=text("0"), nullable=False
    )
    document_count: Mapped[int] = mapped_column(Integer, server_default=text("0"), nullable=False)
    state: Mapped[str] = mapped_column(String(16), server_default="building", nullable=False)
    activated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    detail: Mapped[dict] = mapped_column(JSONB, server_default=text("'{}'::jsonb"), nullable=False)
