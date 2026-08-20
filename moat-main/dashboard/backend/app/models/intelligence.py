from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, JSON, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.security import generate_uuid
from app.database import Base, JSONB


class PriorArtResult(Base):
    __tablename__ = "prior_art_results"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    invention_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False), ForeignKey("inventions.id", ondelete="SET NULL"), nullable=True, index=True)
    created_by: Mapped[str | None] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    score: Mapped[float | None] = mapped_column(Float, nullable=True)
    matches: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class NoveltyReport(Base):
    __tablename__ = "novelty_reports"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    invention_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False), ForeignKey("inventions.id", ondelete="SET NULL"), nullable=True, index=True)
    created_by: Mapped[str | None] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    score: Mapped[float | None] = mapped_column(Float, nullable=True)
    findings: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class PatentabilityReport(Base):
    __tablename__ = "patentability_reports"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    invention_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False), ForeignKey("inventions.id", ondelete="SET NULL"), nullable=True, index=True)
    created_by: Mapped[str | None] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    score: Mapped[float | None] = mapped_column(Float, nullable=True)
    evaluation: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class ClaimMapping(Base):
    __tablename__ = "claim_mappings"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    invention_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False), ForeignKey("inventions.id", ondelete="SET NULL"), nullable=True, index=True)
    created_by: Mapped[str | None] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    score: Mapped[float | None] = mapped_column(Float, nullable=True)
    mappings: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class TechnologyCluster(Base):
    __tablename__ = "technology_clusters"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    name: Mapped[str] = mapped_column(String(180), nullable=False)
    technology_domain: Mapped[str | None] = mapped_column(String(160), nullable=True)
    cluster_data: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class CitationGraph(Base):
    __tablename__ = "citation_graphs"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    patent_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False), ForeignKey("patents.id", ondelete="SET NULL"), nullable=True)
    graph: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class LandscapeReport(Base):
    __tablename__ = "landscape_reports"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    invention_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False), ForeignKey("inventions.id", ondelete="SET NULL"), nullable=True, index=True)
    created_by: Mapped[str | None] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    score: Mapped[float | None] = mapped_column(Float, nullable=True)
    landscape: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
