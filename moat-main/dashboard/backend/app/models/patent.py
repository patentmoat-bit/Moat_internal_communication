from datetime import datetime, timezone

from sqlalchemy import String, Date, Text, Integer, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.core.security import generate_uuid


class Patent(Base):
    __tablename__ = "patents"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, default=generate_uuid
    )
    patent_number: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(1024), nullable=False)
    abstract: Mapped[str] = mapped_column(Text, nullable=True)
    claims: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    inventors: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    assignee: Mapped[str | None] = mapped_column(String(512), nullable=True)
    filing_date: Mapped[datetime | None] = mapped_column(Date, nullable=True)
    publication_date: Mapped[datetime | None] = mapped_column(Date, nullable=True)
    status: Mapped[str | None] = mapped_column(String(64), nullable=True)
    cpc_classifications: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    ipc_classifications: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    citations: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    patent_metadata: Mapped[dict | None] = mapped_column("metadata", JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    saved_by = relationship("SavedPatent", back_populates="patent", cascade="all, delete-orphan")
    collections = relationship("CollectionPatent", back_populates="patent", cascade="all, delete-orphan")


class SavedPatent(Base):
    __tablename__ = "saved_patents"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, default=generate_uuid
    )
    patent_number: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    patent_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False), ForeignKey("patents.id", ondelete="SET NULL"), nullable=True, index=True
    )
    collection_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False), ForeignKey("collections.id", ondelete="CASCADE"), nullable=True, index=True
    )
    saved_by: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    saved_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    user = relationship("User", back_populates="saved_patents")
    patent = relationship("Patent", back_populates="saved_by")
    collection = relationship("Collection", back_populates="saved_patents")
