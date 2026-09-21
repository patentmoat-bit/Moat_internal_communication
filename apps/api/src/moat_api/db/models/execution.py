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

JOB_STATUSES = ("queued", "running", "succeeded", "failed", "cancelled")

# Kinds carry their own admission budget, so heavy ingestion can never starve
# interactive analysis (design doc §9).
JOB_KINDS = ("extraction", "analysis", "indexing", "export")


class Job(Base, PrimaryKeyMixin, TenantMixin, TimestampMixin):
    """Durable record of accepted background work.

    A job row is what makes `202 Accepted` honest: once the API returns, the
    work is queryable and reaches succeeded, failed or cancelled regardless of
    what happens to the worker, the queue, or the browser tab that asked.
    """

    __tablename__ = "jobs"
    __table_args__ = (
        UniqueConstraint("tenant_id", "id", name="uq_jobs_tenant_id_id"),
        # Idempotency keys are scoped to tenant and actor, so a retried request
        # returns the original job instead of starting a second one.
        UniqueConstraint("tenant_id", "idempotency_key", name="uq_jobs_tenant_idempotency"),
        # The admission-control counting query: tenant, kind, live states.
        Index("ix_jobs_admission", "tenant_id", "kind", "status"),
        Index("ix_jobs_listing", "tenant_id", "created_at", "id"),
    )

    kind: Mapped[str] = mapped_column(String(32), nullable=False)
    status: Mapped[str] = mapped_column(String(16), server_default="queued", nullable=False)
    idempotency_key: Mapped[str] = mapped_column(String(200), nullable=False)

    requested_by_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    # What the job is about. Deliberately ids and references only -- never file
    # bytes, patent text or model output (design doc §8).
    subject_type: Mapped[str] = mapped_column(String(32), server_default="", nullable=False)
    subject_id: Mapped[uuid.UUID | None] = mapped_column(PgUUID(as_uuid=True), nullable=True)
    payload: Mapped[dict] = mapped_column(JSONB, server_default=text("'{}'::jsonb"), nullable=False)

    progress: Mapped[int] = mapped_column(Integer, server_default=text("0"), nullable=False)
    detail: Mapped[str] = mapped_column(String(300), server_default="", nullable=False)

    # Deterministic workflow id, so a redelivered outbox event starts the same
    # workflow rather than a duplicate one.
    workflow_id: Mapped[str] = mapped_column(String(200), server_default="", nullable=False)
    run_id: Mapped[str] = mapped_column(String(200), server_default="", nullable=False)

    result: Mapped[dict] = mapped_column(JSONB, server_default=text("'{}'::jsonb"), nullable=False)
    failure_category: Mapped[str | None] = mapped_column(String(64), nullable=True)
    attempt_count: Mapped[int] = mapped_column(Integer, server_default=text("0"), nullable=False)

    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    attempts: Mapped[list[JobAttempt]] = relationship(
        back_populates="job", cascade="all, delete-orphan"
    )


class JobAttempt(Base, PrimaryKeyMixin, TenantMixin, TimestampMixin):
    """One execution attempt. Kept separately so a retried job still shows why
    the earlier attempts failed."""

    __tablename__ = "job_attempts"
    __table_args__ = (
        ForeignKeyConstraint(
            ["tenant_id", "job_id"],
            ["jobs.tenant_id", "jobs.id"],
            ondelete="CASCADE",
            name="fk_job_attempts_job",
        ),
        UniqueConstraint("tenant_id", "job_id", "attempt", name="uq_job_attempts_number"),
    )

    job_id: Mapped[uuid.UUID] = mapped_column(PgUUID(as_uuid=True), nullable=False)
    attempt: Mapped[int] = mapped_column(Integer, nullable=False)
    outcome: Mapped[str] = mapped_column(String(16), server_default="running", nullable=False)
    worker: Mapped[str] = mapped_column(String(120), server_default="", nullable=False)
    error: Mapped[str] = mapped_column(Text, server_default="", nullable=False)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    job: Mapped[Job] = relationship(back_populates="attempts")


class OutboxEvent(Base, TenantMixin):
    """Domain events committed in the same transaction as the change itself.

    This is the whole point of the outbox: a job is never started for work that
    did not commit, and a committed change never fails to start its job because
    a broker was unreachable. Delivery can duplicate -- consumers must be safe
    to re-run, which is why workflow ids are deterministic.
    """

    __tablename__ = "outbox_events"
    __table_args__ = (
        # Partial index over undelivered rows only: the dispatcher's hot query
        # stays small no matter how much history accumulates.
        Index(
            "ix_outbox_pending",
            "claimed_until",
            "id",
            postgresql_where=text("delivered_at IS NULL"),
        ),
    )

    # Monotonic, so events dispatch in the order they were committed.
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)

    event_type: Mapped[str] = mapped_column(String(64), nullable=False)
    aggregate_type: Mapped[str] = mapped_column(String(32), nullable=False)
    aggregate_id: Mapped[uuid.UUID | None] = mapped_column(PgUUID(as_uuid=True), nullable=True)
    workflow_id: Mapped[str] = mapped_column(String(200), nullable=False)
    task_queue: Mapped[str] = mapped_column(String(64), nullable=False)
    payload: Mapped[dict] = mapped_column(JSONB, server_default=text("'{}'::jsonb"), nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()"), nullable=False
    )
    # Short lease held by whichever dispatcher replica claimed the row, so two
    # replicas do not both deliver it.
    claimed_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    claimed_by: Mapped[str] = mapped_column(String(120), server_default="", nullable=False)
    delivered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    attempts: Mapped[int] = mapped_column(Integer, server_default=text("0"), nullable=False)
    last_error: Mapped[str] = mapped_column(Text, server_default="", nullable=False)


class ConsumerReceipt(Base, TenantMixin, TimestampMixin):
    """Deduplication ledger for redelivered events.

    Retained beyond the workflow history retention window on purpose: once
    Temporal forgets a workflow, its id stops deduplicating, and this table is
    what still does (design doc §7).
    """

    __tablename__ = "consumer_receipts"
    __table_args__ = (
        UniqueConstraint("consumer", "event_id", name="uq_consumer_receipts_event"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    consumer: Mapped[str] = mapped_column(String(64), nullable=False)
    event_id: Mapped[int] = mapped_column(BigInteger, nullable=False)


class FailedJob(Base, PrimaryKeyMixin, TenantMixin, TimestampMixin):
    """Permanently failed or retry-exhausted work, with an operator action.

    Temporal has no RabbitMQ-style dead-letter queue, so this table is the
    thing an operator actually looks at, and the lineage back to the original
    job is what makes a retry meaningful rather than a guess.
    """

    __tablename__ = "failed_jobs"
    __table_args__ = (
        ForeignKeyConstraint(
            ["tenant_id", "job_id"],
            ["jobs.tenant_id", "jobs.id"],
            ondelete="CASCADE",
            name="fk_failed_jobs_job",
        ),
        Index("ix_failed_jobs_open", "tenant_id", "resolved_at"),
    )

    job_id: Mapped[uuid.UUID] = mapped_column(PgUUID(as_uuid=True), nullable=False)
    kind: Mapped[str] = mapped_column(String(32), nullable=False)
    failure_category: Mapped[str] = mapped_column(String(64), nullable=False)
    detail: Mapped[str] = mapped_column(Text, server_default="", nullable=False)
    attempts: Mapped[int] = mapped_column(Integer, server_default=text("0"), nullable=False)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    resolution: Mapped[str] = mapped_column(String(32), server_default="", nullable=False)
