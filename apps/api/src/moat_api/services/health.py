from __future__ import annotations

import asyncio
import contextlib
from dataclasses import dataclass

from sqlalchemy import select, text

from moat_api.core import telemetry
from moat_api.db.models import Job
from moat_api.db.session import engine, unscoped_session
from moat_api.services import outbox
from moat_api.services.search import client as search_client

CHECK_TIMEOUT = 3.0


@dataclass(frozen=True, slots=True)
class DependencyState:
    name: str
    up: bool
    # Whether the product is unusable without it. OpenSearch being down
    # degrades the product honestly; PostgreSQL being down does not.
    essential: bool
    detail: str = ""


async def _check(name: str, coro, essential: bool) -> DependencyState:
    try:
        async with asyncio.timeout(CHECK_TIMEOUT):
            await coro
    except Exception as error:  # noqa: BLE001 -- a failed check is data, not a crash
        telemetry.dependency_up.labels(name).set(0)
        return DependencyState(name, False, essential, str(error)[:160])
    telemetry.dependency_up.labels(name).set(1)
    return DependencyState(name, True, essential)


async def _postgres() -> None:
    async with engine.connect() as connection:
        await connection.execute(text("SELECT 1"))


async def _opensearch() -> None:
    if not await search_client.healthy():
        raise RuntimeError("cluster health did not answer")


async def _objects() -> None:
    from moat_api.services import storage

    async with storage.s3() as client:
        await client.head_bucket(Bucket=storage.settings.s3_bucket)


async def readiness() -> tuple[bool, list[DependencyState]]:
    """Readiness for load balancing.

    Only PostgreSQL is essential. A replica with OpenSearch down still serves
    drafting, matters and review correctly -- pulling it from rotation would
    turn a degraded feature into a full outage (design doc §10).
    """
    states = await asyncio.gather(
        _check("postgres", _postgres(), essential=True),
        _check("opensearch", _opensearch(), essential=False),
        _check("objects", _objects(), essential=False),
    )
    ready = all(state.up for state in states if state.essential)
    return ready, list(states)


async def refresh_job_gauges() -> None:
    """Publish the demand signal KEDA scales workers on.

    Computed from the application's own tables because only the application
    knows what "pending" means per kind. A generic broker-depth metric would
    not distinguish an OCR backlog from an interactive one.
    """
    async with unscoped_session() as session:
        rows = (
            await session.execute(
                text(
                    """
                    SELECT kind,
                           status,
                           count(*),
                           COALESCE(EXTRACT(EPOCH FROM (now() - MIN(created_at))), 0)
                    FROM jobs
                    WHERE status IN ('queued', 'running')
                    GROUP BY kind, status
                    """
                )
            )
        ).all()

        seen: set[str] = set()
        for kind, status, count, oldest in rows:
            seen.add(kind)
            if status == "queued":
                telemetry.jobs_pending.labels(kind).set(count)
                telemetry.jobs_oldest_age.labels(kind).set(float(oldest))
            else:
                telemetry.jobs_running.labels(kind).set(count)

        # Kinds with no live jobs must report zero, not go missing. A gauge
        # that disappears reads as "no data" to an alert rule, which is not
        # the same as "nothing pending".
        for kind in ("analysis", "extraction", "indexing", "export"):
            if kind not in seen:
                telemetry.jobs_pending.labels(kind).set(0)
                telemetry.jobs_running.labels(kind).set(0)
                telemetry.jobs_oldest_age.labels(kind).set(0)

        pending, oldest_age = await outbox.pending_depth(session)
        telemetry.outbox_pending.set(pending)
        telemetry.outbox_oldest_age.set(oldest_age)


async def gauge_refresh_loop(stop: asyncio.Event, interval: float = 10.0) -> None:
    """Keep the exported gauges fresh independently of request traffic.

    Dependency gauges are refreshed here rather than only inside the readiness
    handler: if they updated only when something probed, the alert on an
    essential dependency would have no data exactly when nothing could reach
    the service to probe it.
    """
    while not stop.is_set():
        # Metrics collection must never take the API down with it.
        with contextlib.suppress(Exception):
            await refresh_job_gauges()
        with contextlib.suppress(Exception):
            await readiness()
        try:
            async with asyncio.timeout(interval):
                await stop.wait()
        except TimeoutError:
            continue


async def active_job_counts() -> dict[str, int]:
    async with unscoped_session() as session:
        rows = (
            await session.execute(
                select(Job.kind, Job.status).where(Job.status.in_(("queued", "running")))
            )
        ).all()
    counts: dict[str, int] = {}
    for kind, status in rows:
        counts[f"{kind}.{status}"] = counts.get(f"{kind}.{status}", 0) + 1
    return counts
