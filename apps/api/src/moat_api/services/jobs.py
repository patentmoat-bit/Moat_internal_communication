from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from moat_api.auth.sessions import Principal
from moat_api.core.config import get_settings
from moat_api.db.models import Job, OutboxEvent

settings = get_settings()

LIVE_STATES = ("queued", "running")

# Each queue is a separate deployment with its own scaling, so a 500-page OCR
# backlog cannot delay an interactive analysis (design doc §9).
TASK_QUEUES = {
    "analysis": "moat-ai-interactive",
    "extraction": "moat-ocr",
    "indexing": "moat-index",
    "export": "moat-export",
}


class AdmissionRefused(Exception):
    """Capacity for this tenant and kind is exhausted.

    Refused BEFORE the job is accepted. Once the API has returned 202 the work
    must reach a terminal state, so the decision to say no has to happen first.
    """

    def __init__(self, message: str, running: int, pending: int, retry_after: int = 30) -> None:
        super().__init__(message)
        self.running = running
        self.pending = pending
        self.retry_after = retry_after


@dataclass(frozen=True, slots=True)
class Caps:
    running: int
    pending: int


def caps_for(kind: str) -> Caps:
    if kind == "analysis":
        return Caps(settings.max_running_analyses, settings.max_pending_analyses)
    if kind == "extraction":
        return Caps(settings.max_running_extractions, settings.max_pending_documents)
    return Caps(4, 100)


async def _reserve(session: AsyncSession, tenant_id: uuid.UUID, kind: str) -> None:
    """Take the tenant's slot atomically with the job insert.

    A transaction-scoped advisory lock keyed on tenant+kind serialises the
    count-then-insert, so two simultaneous requests cannot both read "one
    running, room for two" and both start. Counting without the lock is a
    check-then-act race that shows up exactly under the load the cap exists
    to control.
    """
    caps = caps_for(kind)
    await session.execute(
        text("SELECT pg_advisory_xact_lock(hashtext(:key))"),
        {"key": f"admission:{tenant_id}:{kind}"},
    )

    counts = (
        await session.execute(
            select(Job.status, func.count())
            .where(Job.tenant_id == tenant_id, Job.kind == kind, Job.status.in_(LIVE_STATES))
            .group_by(Job.status)
        )
    ).all()
    tally = dict(counts)
    running = tally.get("running", 0)
    pending = tally.get("queued", 0)

    if running >= caps.running and pending >= caps.pending:
        raise AdmissionRefused(
            f"This workspace already has {running} {kind} jobs running and "
            f"{pending} waiting. Try again shortly.",
            running,
            pending,
        )
    if pending >= caps.pending:
        raise AdmissionRefused(
            f"This workspace already has {pending} {kind} jobs waiting, "
            f"the configured limit.",
            running,
            pending,
        )


async def submit(
    session: AsyncSession,
    principal: Principal,
    *,
    kind: str,
    idempotency_key: str,
    subject_type: str = "",
    subject_id: uuid.UUID | None = None,
    payload: dict | None = None,
    detail: str = "",
) -> tuple[Job, bool]:
    """Accept work durably. Returns the job and whether it was newly created.

    Domain change, job row and outbox event all commit together. That is what
    makes 202 honest: the job cannot exist for work that rolled back, and
    committed work cannot fail to be dispatched because a broker was down.
    """
    existing = (
        await session.execute(
            select(Job).where(
                Job.tenant_id == principal.tenant_id, Job.idempotency_key == idempotency_key
            )
        )
    ).scalar_one_or_none()
    if existing is not None and existing.status != "failed":
        # A retried request returns the original job rather than starting a
        # second one. Safe retries are the whole point of the key.
        return existing, False

    await _reserve(session, principal.tenant_id, kind)

    if existing is not None:
        # The key maps to a job that failed. Asking again is a retry request,
        # not a duplicate: reset the row and dispatch it afresh. The workflow
        # id carries the attempt number so Temporal sees a new execution
        # rather than refusing an id its history already closed.
        existing.status = "queued"
        existing.failure_category = None
        existing.detail = detail or existing.detail
        existing.progress = 0
        existing.result = {}
        existing.started_at = None
        existing.finished_at = None
        existing.workflow_id = f"{kind}-{existing.id}-{existing.attempt_count + 1}"
        session.add(
            OutboxEvent(
                tenant_id=principal.tenant_id,
                event_type=f"job.{kind}.requested",
                aggregate_type="job",
                aggregate_id=existing.id,
                workflow_id=existing.workflow_id,
                task_queue=TASK_QUEUES.get(kind, "moat-workflow"),
                payload={
                    "job_id": str(existing.id),
                    "tenant_id": str(principal.tenant_id),
                    "kind": kind,
                    **(payload or {}),
                },
            )
        )
        await session.flush()
        return existing, True

    job = Job(
        tenant_id=principal.tenant_id,
        kind=kind,
        status="queued",
        idempotency_key=idempotency_key,
        requested_by_id=principal.user_id,
        subject_type=subject_type,
        subject_id=subject_id,
        payload=payload or {},
        detail=detail,
    )
    session.add(job)
    await session.flush()

    # Deterministic workflow id: a redelivered event starts the same workflow
    # rather than a duplicate one.
    job.workflow_id = f"{kind}-{job.id}-1"

    session.add(
        OutboxEvent(
            tenant_id=principal.tenant_id,
            event_type=f"job.{kind}.requested",
            aggregate_type="job",
            aggregate_id=job.id,
            workflow_id=job.workflow_id,
            task_queue=TASK_QUEUES.get(kind, "moat-workflow"),
            payload={
                "job_id": str(job.id),
                "tenant_id": str(principal.tenant_id),
                "kind": kind,
                # Ids and references only. File bytes, patent text and model
                # output never enter workflow history (design doc §8).
                **(payload or {}),
            },
        )
    )
    await session.flush()
    return job, True


async def mark_running(session: AsyncSession, job_id: uuid.UUID, worker: str) -> None:
    job = (await session.execute(select(Job).where(Job.id == job_id))).scalar_one()
    job.status = "running"
    job.started_at = job.started_at or datetime.now(UTC)
    job.attempt_count += 1
    job.detail = f"running on {worker}"[:300]


async def mark_succeeded(
    session: AsyncSession, job_id: uuid.UUID, result: dict, detail: str = ""
) -> None:
    job = (await session.execute(select(Job).where(Job.id == job_id))).scalar_one()
    job.status = "succeeded"
    job.progress = 100
    job.result = result
    job.detail = detail[:300]
    job.finished_at = datetime.now(UTC)


async def mark_failed(
    session: AsyncSession, job_id: uuid.UUID, category: str, detail: str
) -> None:
    from moat_api.db.models import FailedJob

    job = (await session.execute(select(Job).where(Job.id == job_id))).scalar_one()
    job.status = "failed"
    job.failure_category = category
    job.detail = detail[:300]
    job.finished_at = datetime.now(UTC)

    # Temporal has no dead-letter queue, so exhausted work lands here where an
    # operator can actually see and retry it (design doc §9).
    session.add(
        FailedJob(
            tenant_id=job.tenant_id,
            job_id=job.id,
            kind=job.kind,
            failure_category=category,
            detail=detail,
            attempts=job.attempt_count,
        )
    )
