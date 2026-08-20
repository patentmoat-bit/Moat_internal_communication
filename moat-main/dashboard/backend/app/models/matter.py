import enum
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, ForeignKey, Index, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.security import generate_uuid
from app.database import Base


class MatterStatus(str, enum.Enum):
    intake = "intake"
    active = "active"
    searching = "searching"
    analysis = "analysis"
    review = "review"
    blocked = "blocked"
    completed = "completed"
    archived = "archived"


class MatterPriority(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class MatterMemberRole(str, enum.Enum):
    owner = "owner"
    manager = "manager"
    contributor = "contributor"
    viewer = "viewer"


class MatterDocumentType(str, enum.Enum):
    patent = "patent"
    prior_art = "prior_art"
    technical = "technical"
    legal = "legal"
    evidence = "evidence"
    other = "other"


class Matter(Base):
    __tablename__ = "matters"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    workspace_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False), ForeignKey("workspaces.id", ondelete="SET NULL"), nullable=True, index=True
    )
    owner_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    matter_number: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    client_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    technology_area: Mapped[str | None] = mapped_column(String(255), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[MatterStatus] = mapped_column(
        Enum(MatterStatus, name="matter_status"), default=MatterStatus.intake, nullable=False, index=True
    )
    priority: Mapped[MatterPriority] = mapped_column(
        Enum(MatterPriority, name="matter_priority"), default=MatterPriority.medium, nullable=False, index=True
    )
    due_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    tags: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    owner = relationship("User", foreign_keys=[owner_id])
    workspace = relationship("Workspace")
    members = relationship("MatterMember", back_populates="matter", cascade="all, delete-orphan")
    documents = relationship("MatterDocument", back_populates="matter", cascade="all, delete-orphan")
    activity = relationship("MatterActivity", back_populates="matter", cascade="all, delete-orphan")
    status_history = relationship("MatterStatusHistory", back_populates="matter", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_matters_owner_status", "owner_id", "status"),
        Index("ix_matters_workspace_status", "workspace_id", "status"),
    )


class MatterMember(Base):
    __tablename__ = "matter_members"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    matter_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("matters.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    role: Mapped[MatterMemberRole] = mapped_column(
        Enum(MatterMemberRole, name="matter_member_role"), default=MatterMemberRole.viewer, nullable=False
    )
    assigned_by_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    matter = relationship("Matter", back_populates="members")
    user = relationship("User", foreign_keys=[user_id])
    assigned_by = relationship("User", foreign_keys=[assigned_by_id])

    __table_args__ = (UniqueConstraint("matter_id", "user_id", name="uq_matter_member_user"),)


class MatterDocument(Base):
    __tablename__ = "matter_documents"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    matter_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("matters.id", ondelete="CASCADE"), nullable=False, index=True
    )
    uploaded_by_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    document_type: Mapped[MatterDocumentType] = mapped_column(
        Enum(MatterDocumentType, name="matter_document_type"), default=MatterDocumentType.other, nullable=False
    )
    content_type: Mapped[str | None] = mapped_column(String(120), nullable=True)
    size_bytes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    storage_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    matter = relationship("Matter", back_populates="documents")
    uploaded_by = relationship("User")


class MatterActivity(Base):
    __tablename__ = "matter_activity"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    matter_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("matters.id", ondelete="CASCADE"), nullable=False, index=True
    )
    actor_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(100), nullable=False)
    entity_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    message: Mapped[str] = mapped_column(String(512), nullable=False)
    details: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    matter = relationship("Matter", back_populates="activity")
    actor = relationship("User")

    __table_args__ = (Index("ix_matter_activity_matter_created", "matter_id", "created_at"),)


class MatterStatusHistory(Base):
    __tablename__ = "matter_status_history"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    matter_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("matters.id", ondelete="CASCADE"), nullable=False, index=True
    )
    from_status: Mapped[MatterStatus | None] = mapped_column(Enum(MatterStatus, name="matter_status"), nullable=True)
    to_status: Mapped[MatterStatus] = mapped_column(Enum(MatterStatus, name="matter_status"), nullable=False)
    changed_by_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    matter = relationship("Matter", back_populates="status_history")
    changed_by = relationship("User")
