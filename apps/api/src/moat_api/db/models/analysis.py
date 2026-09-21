from __future__ import annotations

import uuid
from datetime import date, datetime

from sqlalchemy import (
    Date,
    DateTime,
    Float,
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

ANALYSIS_STATUSES = ("queued", "running", "complete", "failed", "insufficient_evidence")


class AnalysisRun(Base, PrimaryKeyMixin, TenantMixin, TimestampMixin):
    """One retrieval and analysis pass over a specific invention revision.

    The provenance columns are NOT NULL on purpose. Any figure this system
    shows a user has to be able to say which corpus, retrieval configuration,
    model and prompt produced it, or it cannot be defended later.
    """

    __tablename__ = "analysis_runs"
    __table_args__ = (
        UniqueConstraint("tenant_id", "id", name="uq_analysis_runs_tenant_id_id"),
        ForeignKeyConstraint(
            ["tenant_id", "invention_id"],
            ["inventions.tenant_id", "inventions.id"],
            ondelete="CASCADE",
            name="fk_analysis_runs_invention",
        ),
        Index("ix_analysis_runs_invention_started", "tenant_id", "invention_id", "started_at"),
    )

    invention_id: Mapped[uuid.UUID] = mapped_column(PgUUID(as_uuid=True), nullable=False)
    invention_revision: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(32), server_default="queued", nullable=False)

    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()"), nullable=False
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    corpus_revision: Mapped[str] = mapped_column(String(64), nullable=False)
    retrieval_version: Mapped[str] = mapped_column(String(64), nullable=False)
    model_version: Mapped[str] = mapped_column(String(64), nullable=False)
    prompt_version: Mapped[str] = mapped_column(String(64), nullable=False)

    failure_category: Mapped[str | None] = mapped_column(String(64), nullable=True)

    concepts: Mapped[list[AnalysisConcept]] = relationship(
        back_populates="run", cascade="all, delete-orphan"
    )
    evidence: Mapped[list[EvidenceLink]] = relationship(
        back_populates="run", cascade="all, delete-orphan"
    )


class AnalysisConcept(Base, PrimaryKeyMixin, TenantMixin, TimestampMixin):
    """A concept extracted from the disclosure, and how many retrieved
    passages mention it. A count of zero is a place to look, not a finding."""

    __tablename__ = "analysis_concepts"
    __table_args__ = (
        ForeignKeyConstraint(
            ["tenant_id", "run_id"],
            ["analysis_runs.tenant_id", "analysis_runs.id"],
            ondelete="CASCADE",
            name="fk_analysis_concepts_run",
        ),
    )

    run_id: Mapped[uuid.UUID] = mapped_column(PgUUID(as_uuid=True), nullable=False)
    label: Mapped[str] = mapped_column(String(300), nullable=False)
    matches: Mapped[int] = mapped_column(Integer, server_default=text("0"), nullable=False)
    position: Mapped[int] = mapped_column(Integer, server_default=text("0"), nullable=False)

    run: Mapped[AnalysisRun] = relationship(back_populates="concepts")


class EvidenceLink(Base, PrimaryKeyMixin, TenantMixin, TimestampMixin):
    """A retrieved passage, kept with the run that surfaced it."""

    __tablename__ = "evidence_links"
    __table_args__ = (
        ForeignKeyConstraint(
            ["tenant_id", "run_id"],
            ["analysis_runs.tenant_id", "analysis_runs.id"],
            ondelete="CASCADE",
            name="fk_evidence_links_run",
        ),
        Index("ix_evidence_links_run_score", "tenant_id", "run_id", "retrieval_score"),
    )

    run_id: Mapped[uuid.UUID] = mapped_column(PgUUID(as_uuid=True), nullable=False)

    publication_id: Mapped[str] = mapped_column(String(64), nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    applicant: Mapped[str] = mapped_column(String(300), server_default="", nullable=False)
    jurisdiction: Mapped[str] = mapped_column(String(8), nullable=False)
    kind_code: Mapped[str] = mapped_column(String(8), server_default="", nullable=False)
    published_on: Mapped[date | None] = mapped_column(Date, nullable=True)

    passage: Mapped[str] = mapped_column(Text, nullable=False)
    # Retrieval rank, not a patentability measure. Named to make that hard to
    # misread at the call site.
    retrieval_score: Mapped[float] = mapped_column(Float, nullable=False)
    matched_concepts: Mapped[list[str]] = mapped_column(
        ARRAY(String(300)), server_default=text("'{}'::varchar[]"), nullable=False
    )

    run: Mapped[AnalysisRun] = relationship(back_populates="evidence")
