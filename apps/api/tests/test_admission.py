"""Admission control.

These assert the behaviour the SLOs depend on: capacity is refused BEFORE work
is accepted, and once 202 is returned the job is durable. Getting this wrong
means the API promises work it cannot perform.
"""

from __future__ import annotations

import pytest

from moat_api.services import jobs


@pytest.fixture(autouse=True)
def small_caps(monkeypatch):
    """Shrink the caps so the boundary is reachable in a test.

    Testing the real caps would need 20 queued jobs and a stopped worker; the
    logic under test is the same either way.
    """
    monkeypatch.setattr(
        jobs, "caps_for", lambda kind: jobs.Caps(running=1, pending=2)
    )


async def _submit(session, principal, key: str):
    return await jobs.submit(
        session,
        principal,
        kind="analysis",
        idempotency_key=key,
        subject_type="invention",
        payload={"revision": 1},
    )


async def test_accepts_up_to_the_pending_cap(session, principal):
    for index in range(2):
        job, created = await _submit(session, principal, f"analysis:{index}")
        assert created is True
        assert job.status == "queued"


async def test_refuses_past_the_cap_before_accepting(session, principal):
    for index in range(2):
        await _submit(session, principal, f"analysis:{index}")

    with pytest.raises(jobs.AdmissionRefused) as refused:
        await _submit(session, principal, "analysis:overflow")

    # The caller gets the numbers, so a 429 can say something useful rather
    # than just "try later".
    assert refused.value.pending == 2
    assert refused.value.retry_after > 0


async def test_no_job_row_is_created_when_refused(session, principal):
    from sqlalchemy import func, select

    from moat_api.db.models import Job

    for index in range(2):
        await _submit(session, principal, f"analysis:{index}")
    with pytest.raises(jobs.AdmissionRefused):
        await _submit(session, principal, "analysis:overflow")

    # Refusal must leave nothing behind. A job row for work that was never
    # accepted would sit queued forever and count against the next request.
    count = (
        await session.execute(
            select(func.count()).select_from(Job).where(Job.tenant_id == principal.tenant_id)
        )
    ).scalar_one()
    assert count == 2


async def test_idempotency_key_does_not_consume_capacity(session, principal):
    first, created_first = await _submit(session, principal, "analysis:same")
    second, created_second = await _submit(session, principal, "analysis:same")

    assert created_first is True
    assert created_second is False
    assert first.id == second.id

    # A repeated request must not count twice, or a client retrying on a flaky
    # network would exhaust its own quota.
    third, created_third = await _submit(session, principal, "analysis:other")
    assert created_third is True


async def test_each_accepted_job_emits_exactly_one_outbox_event(session, principal):
    from sqlalchemy import func, select

    from moat_api.db.models import OutboxEvent

    job, _ = await _submit(session, principal, "analysis:one")
    await _submit(session, principal, "analysis:one")  # duplicate

    events = (
        await session.execute(
            select(func.count())
            .select_from(OutboxEvent)
            .where(OutboxEvent.aggregate_id == job.id)
        )
    ).scalar_one()
    assert events == 1


async def test_outbox_event_carries_no_payload_content(session, principal):
    from sqlalchemy import select

    from moat_api.db.models import OutboxEvent

    job, _ = await _submit(session, principal, "analysis:ids-only")
    event = (
        await session.execute(
            select(OutboxEvent).where(OutboxEvent.aggregate_id == job.id)
        )
    ).scalar_one()

    # Workflow history must carry ids and references only -- never file bytes,
    # patent text or model output (design doc §8).
    serialised = str(event.payload)
    assert len(serialised) < 500
    assert event.workflow_id.startswith("analysis-")


async def test_failed_job_can_be_resubmitted_through_the_same_key(session, principal):
    job, created = await _submit(session, principal, "analysis:retry")
    assert created is True

    await jobs.mark_failed(session, job.id, "search_unavailable", "Retrieval was down.")
    await session.flush()

    retried, created_again = await _submit(session, principal, "analysis:retry")

    # Asking again after a permanent failure is a retry request, not a
    # duplicate. Returning the dead job would strand the work forever.
    assert created_again is True
    assert retried.id == job.id
    assert retried.status == "queued"
    assert retried.failure_category is None
