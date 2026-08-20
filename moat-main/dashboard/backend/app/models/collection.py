from datetime import datetime, timezone

from sqlalchemy import String, Text, ForeignKey, DateTime, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import PrimaryKeyConstraint

from app.database import Base
from app.core.security import generate_uuid


class Collection(Base):
    __tablename__ = "collections"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, default=generate_uuid
    )
    workspace_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False), ForeignKey("workspaces.id", ondelete="SET NULL"), nullable=True, index=True
    )
    user_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    workspace = relationship("Workspace", back_populates="collections")
    user = relationship("User", back_populates="collections")
    patents = relationship("CollectionPatent", back_populates="collection", cascade="all, delete-orphan")
    saved_patents = relationship("SavedPatent", back_populates="collection", cascade="all, delete-orphan")


class CollectionPatent(Base):
    __tablename__ = "collection_patents"

    collection_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("collections.id", ondelete="CASCADE"), nullable=False
    )
    patent_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("patents.id", ondelete="CASCADE"), nullable=False
    )
    added_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    __table_args__ = (
        PrimaryKeyConstraint("collection_id", "patent_id"),
    )

    collection = relationship("Collection", back_populates="patents")
    patent = relationship("Patent", back_populates="collections")
