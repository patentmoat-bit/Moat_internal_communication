from __future__ import annotations

import asyncio
import contextlib
import socket
import uuid
from datetime import UTC, datetime, timedelta

import structlog
from sqlalchemy import select, text, update
from sqlalchemy.ext.asyncio import AsyncSession

from moat_api.core.config import get_settings
from moat_api.db.models import OutboxEvent
from moat_api.db.session import unscoped_session

log = structlog.get_logger(__name__)
settings = get_settings()

BATCH = 20
LEASE_SECONDS = 60
IDLE_SLEEP = 1.0
MAX_ATTEMPTS = 8

WORKER_ID = f"{socket.gethostname()}:{uuid.uuid4().hex[:8]}"


async def claim(session: AsyncSession, limit: int = BATCH) -> list[OutboxEvent]:
    """Take a short lease on undelivered events, in commit order.

    FOR UPDATE SKIP LOCKED lets several dispatcher replicas work the same table
    without blocking each other: each skips rows another has locked rather than
    queueing behind them. The lease covers the window between claiming a row
    and committing its delivery, so a dispatcher that dies mid-flight releases
    its rows when the lease expires rather than stranding them forever.
    """
    now = datetime.now(UTC)
    rows = list(
        (
            await session.execute(
                select(OutboxEvent)
                .where(
                    OutboxEvent.delivered_at.is_(None),
                    OutboxEvent.attempts < MAX_ATTEMPTS,
                    (OutboxEvent.claimed_until.is_(None)) | (OutboxEvent.claimed_until < now),
                )
                .order_by(OutboxEvent.id)
                .limit(limit)
                .with_for_update(skip_locked=True)
            )
        ).scalars()
    )
    if rows:
        await session.execute(
            update(OutboxEvent)
            .where(OutboxEvent.id.in_([row.id for row in rows]))
            .values(
                claimed_until=now + timedelta(seconds=LEASE_SECONDS),
                claimed_by=WORKER_ID,
            )
        )
    return rows


async def deliver(event: OutboxEvent) -> None:
    """Start the workflow this event describes.

    Uses the event's deterministic workflow id, so a redelivery after a crash
    reuses the existing workflow instead of starting a second one. Temporal
    answers "already started" for a duplicate, which is success here, not an
    error.
    """
    from temporalio.client import Client
    from temporalio.service import RPCError

    client = await Client.connect(
        settings.temporal_address, namespace=settings.temporal_namespace
    )
    try:
        await client.start_workflow(
            event.event_type,
            event.payload,
            id=event.workflow_id,
            task_queue=event.task_queue,
        )
    except Exception as error:  # noqa: BLE001
        # An already-running workflow with this id means a previous delivery
        # succeeded and this is a duplicate. That is the designed outcome.
        message = str(error).lower()
        if "already started" in message or "workflowexecutionalreadystarted" in message:
            log.info("outbox.duplicate_delivery", workflow_id=event.workflow_id)
            return
        if isinstance(error, RPCError):
            raise
        raise


async def drain_once() -> int:
    """One dispatcher pass. Returns how many events were delivered."""
    delivered = 0
    async with unscoped_session() as session:
        events = await claim(session)
        if not events:
            return 0

        for event in events:
            try:
                await deliver(event)
            except Exception as error:  # noqa: BLE001 -- one bad event must not stall the rest
                await session.execute(
                    update(OutboxEvent)
                    .where(OutboxEvent.id == event.id)
                    .values(
                        attempts=OutboxEvent.attempts + 1,
                        last_error=str(error)[:2000],
                        claimed_until=None,
                    )
                )
                log.warning(
                    "outbox.delivery_failed",
                    event_id=event.id,
                    workflow_id=event.workflow_id,
                    error=str(error)[:200],
                )
                continue

            # Marked delivered only AFTER the workflow start returns. A crash
            # before this point causes redelivery, which the deterministic
            # workflow id makes safe (design doc §7).
            await session.execute(
                update(OutboxEvent)
                .where(OutboxEvent.id == event.id)
                .values(delivered_at=datetime.now(UTC), claimed_until=None)
            )
            delivered += 1

    return delivered


async def run_forever(stop: asyncio.Event) -> None:
    """Dispatcher loop. Runs beside the API in development; a separate
    deployment in production so it scales and fails independently."""
    log.info("outbox.dispatcher_started", worker=WORKER_ID)
    while not stop.is_set():
        try:
            count = await drain_once()
        except Exception as error:  # noqa: BLE001 -- the loop must survive anything
            log.error("outbox.pass_failed", error=str(error)[:300])
            count = 0
        if count == 0:
            with contextlib.suppress(TimeoutError, asyncio.TimeoutError):
                await asyncio.wait_for(stop.wait(), timeout=IDLE_SLEEP)
    log.info("outbox.dispatcher_stopped", worker=WORKER_ID)


async def pending_depth(session: AsyncSession) -> tuple[int, float]:
    """Undelivered count and age of the oldest, in seconds.

    Exported to Prometheus: backlog age is the signal that says whether the
    dispatcher is keeping up, and it is what KEDA scales on (design doc §9).
    """
    row = (
        await session.execute(
            text(
                """
                SELECT count(*),
                       COALESCE(EXTRACT(EPOCH FROM (now() - MIN(created_at))), 0)
                FROM outbox_events
                WHERE delivered_at IS NULL AND attempts < :max_attempts
                """
            ),
            {"max_attempts": MAX_ATTEMPTS},
        )
    ).one()
    return int(row[0]), float(row[1])
