from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, JSON, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.security import generate_uuid
from app.database import Base


class MoatIdea(Base):
    __tablename__ = "moat_ideas"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str | None] = mapped_column(String(120), nullable=True)
    status: Mapped[str] = mapped_column(String(64), default="draft", nullable=False)
    priority: Mapped[str] = mapped_column(String(64), default="medium", nullable=False)
    starred: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    novelty_score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    tags: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    content: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # TipTap JSON or HTML content
    
    created_by: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    creator = relationship("User", foreign_keys=[created_by])
    versions = relationship("MoatIdeaVersion", back_populates="idea", cascade="all, delete-orphan", order_by="desc(MoatIdeaVersion.created_at)")


class MoatIdeaVersion(Base):
    __tablename__ = "moat_idea_versions"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    idea_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("moat_ideas.id", ondelete="CASCADE"), nullable=False, index=True)
    content: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    commit_message: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    idea = relationship("MoatIdea", back_populates="versions")
