import enum
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, Float, ForeignKey, JSON, String, Text, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.security import generate_uuid
from app.database import Base


class InventionStatus(str, enum.Enum):
    draft = "draft"
    ready = "ready"
    analyzing = "analyzing"
    analyzed = "analyzed"
    failed = "failed"
    archived = "archived"


class InventionDocumentType(str, enum.Enum):
    pdf = "pdf"
    patent = "patent"
    technical_document = "technical_document"
    image = "image"
    sketch = "sketch"
    diagram = "diagram"
    other = "other"


class Invention(Base):
    __tablename__ = "inventions"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    workspace_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False), ForeignKey("workspaces.id", ondelete="SET NULL"), nullable=True, index=True)
    matter_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False), ForeignKey("matters.id", ondelete="SET NULL"), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[InventionStatus] = mapped_column(Enum(InventionStatus, name="invention_status"), default=InventionStatus.draft, nullable=False, index=True)
    created_by: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    creator = relationship("User", foreign_keys=[created_by])
    workspace = relationship("Workspace")
    matter = relationship("Matter")
    documents = relationship("InventionDocument", back_populates="invention", cascade="all, delete-orphan")
    analyses = relationship("InventionAnalysis", back_populates="invention", cascade="all, delete-orphan")

    __table_args__ = (Index("ix_inventions_creator_status", "created_by", "status"),)


class InventionDocument(Base):
    __tablename__ = "invention_documents"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    invention_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("inventions.id", ondelete="CASCADE"), nullable=False, index=True)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_type: Mapped[InventionDocumentType] = mapped_column(Enum(InventionDocumentType, name="invention_document_type"), default=InventionDocumentType.other, nullable=False)
    content_type: Mapped[str | None] = mapped_column(String(120), nullable=True)
    storage_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    extracted_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    uploaded_by: Mapped[str | None] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    invention = relationship("Invention", back_populates="documents")
    uploader = relationship("User", foreign_keys=[uploaded_by])


class InventionAnalysis(Base):
    __tablename__ = "invention_analysis"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    invention_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("inventions.id", ondelete="CASCADE"), nullable=False, index=True)
    technical_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    innovation_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    key_components: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    technical_domains: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    differentiators: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    workflows: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    technical_architecture: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    innovation_highlights: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    confidence_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    model_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    invention = relationship("Invention", back_populates="analyses")
