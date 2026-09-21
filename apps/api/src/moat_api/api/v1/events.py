from __future__ import annotations

import asyncio
import json
from collections.abc import AsyncIterator
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy import select

from moat_api.auth.deps import CurrentPrincipal, require
from moat_api.auth.permissions import Permission
from moat_api.db.models import Job, Notification
from moat_api.db.session import tenant_session

router = APIRouter(tags=["events"])

# How often the database is checked for anything new. This is the latency
# bound on notification visibility, and it is set well inside the 5 second
# SLO in design doc §11. A Valkey pub/sub wake-up would make it immediate;
# it is an optimisation, not a correctness requirement, because the row in
# PostgreSQL is the record and the cursor replay below is what guarantees
# nothing is lost.
POLL_SECONDS = 2.0

# Proxies and load balancers drop idle connections. A comment frame keeps the
# stream alive without being delivered to the application as an event.
HEARTBEAT_SECONDS = 15.0

MAX_STREAM_SECONDS = 900.0


def _frame(event: str, data: dict, event_id: str | None = None) -> str:
    lines = []
    if event_id:
        lines.append(f"id: {event_id}")
    lines.append(f"event: {event}")
    lines.append(f"data: {json.dumps(data, default=str)}")
    return "\n".join(lines) + "\n\n"


async def _stream(
    request: Request, principal, since: datetime
) -> AsyncIterator[str]:
    cursor = since
    started = datetime.now(UTC)
    last_beat = started

    # Tell the client how far back this stream is replaying from, so a
    # reconnect that lands on a different replica is still explainable.
    yield _frame("open", {"since": cursor.isoformat(), "poll_seconds": POLL_SECONDS})

    while True:
        if await request.is_disconnected():
            return
        now = datetime.now(UTC)
        # Streams are capped so that a deploy can drain connections rather than
        # waiting on clients that would otherwise hold on indefinitely.
        if (now - started).total_seconds() > MAX_STREAM_SECONDS:
            yield _frame("reconnect", {"reason": "stream_age", "since": cursor.isoformat()})
            return

        async with tenant_session(principal.tenant_id, principal.user_id) as session:
            # Replayed from the database by cursor, never from an in-memory
            # buffer: a dropped connection or a restarted replica loses
            # nothing, because the row is the record (design doc §8).
            rows = list(
                (
                    await session.execute(
                        select(Notification)
                        .where(
                            Notification.user_id == principal.user_id,
                            Notification.created_at > cursor,
                        )
                        .order_by(Notification.created_at)
                        .limit(50)
                    )
                ).scalars()
            )

            jobs = list(
                (
                    await session.execute(
                        select(Job)
                        .where(Job.requested_by_id == principal.user_id, Job.updated_at > cursor)
                        .order_by(Job.updated_at)
                        .limit(50)
                    )
                ).scalars()
            )

        for row in rows:
            cursor = max(cursor, row.created_at)
            yield _frame(
                "notification",
                {
                    "id": str(row.id),
                    "kind": row.kind,
                    "title": row.title,
                    "body": row.body,
                    "actionUrl": row.action_url,
                    "priority": row.priority,
                    "createdAt": row.created_at.isoformat(),
                },
                event_id=str(row.id),
            )

        for job in jobs:
            cursor = max(cursor, job.updated_at)
            yield _frame(
                "job",
                {
                    "id": str(job.id),
                    "kind": job.kind,
                    "status": job.status,
                    "progress": job.progress,
                    "detail": job.detail,
                    "subjectId": str(job.subject_id) if job.subject_id else None,
                    "failureCategory": job.failure_category,
                },
                event_id=str(job.id),
            )

        if (now - last_beat).total_seconds() >= HEARTBEAT_SECONDS:
            last_beat = now
            yield ": heartbeat\n\n"

        await asyncio.sleep(POLL_SECONDS)


@router.get("/events")
async def events(
    request: Request,
    principal: CurrentPrincipal,
    _: object = Depends(require(Permission.NOTIFICATION_READ)),
    since: str | None = Query(default=None, description="ISO timestamp to replay from"),
) -> StreamingResponse:
    """Authorised event stream with a reconnect cursor.

    The client sends back the timestamp it last saw; everything after it is
    replayed from PostgreSQL. That is what makes a missed event impossible
    rather than merely unlikely.
    """
    try:
        cursor = (
            datetime.fromisoformat(since).astimezone(UTC)
            if since
            else datetime.now(UTC)
        )
    except ValueError:
        cursor = datetime.now(UTC)

    return StreamingResponse(
        _stream(request, principal, cursor),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-store",
            # Tells nginx-class proxies not to buffer, which would otherwise
            # hold every frame until the response completed.
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )
