"""Workflows: orchestration only.

Workflow code is replayed from history on every worker restart, so it must be
deterministic -- no clocks, no randomness, no IO. Everything real happens in
activities, called with explicit timeouts and retry budgets.
"""

from __future__ import annotations

from datetime import timedelta

from temporalio import workflow
from temporalio.common import RetryPolicy

with workflow.unsafe.imports_passed_through():
    from moat_api.workers import activities

# Bounded retries with backoff and jitter. Unbounded retries on a permanently
# broken input are a hot loop that burns capacity and hides the failure
# (design doc §9).
STANDARD_RETRY = RetryPolicy(
    initial_interval=timedelta(seconds=2),
    backoff_coefficient=2.0,
    maximum_interval=timedelta(minutes=2),
    maximum_attempts=4,
    # A file that is not a PDF will never become one. Retrying that wastes a
    # worker slot and delays work that could succeed.
    non_retryable_error_types=["ExtractionError", "ValueError"],
)


@workflow.defn(name="job.analysis.requested")
class AnalysisWorkflow:
    """Prior-art retrieval for one invention revision."""

    @workflow.run
    async def run(self, payload: dict) -> dict:
        await workflow.execute_activity(
            activities.start_job,
            payload,
            start_to_close_timeout=timedelta(seconds=30),
            retry_policy=STANDARD_RETRY,
        )

        try:
            return await workflow.execute_activity(
                activities.run_analysis,
                payload,
                # Bounds one attempt. Retrieval that hangs must fail and free
                # the slot rather than holding it indefinitely.
                start_to_close_timeout=timedelta(minutes=5),
                # Total budget across all retries, so a persistently failing
                # job cannot occupy a worker forever.
                schedule_to_close_timeout=timedelta(minutes=20),
                retry_policy=STANDARD_RETRY,
            )
        except Exception as error:
            await workflow.execute_activity(
                activities.fail_job,
                {**payload, "category": "analysis_failed", "detail": str(error)[:300]},
                start_to_close_timeout=timedelta(seconds=30),
            )
            raise


@workflow.defn(name="job.extraction.requested")
class ExtractionWorkflow:
    """Verify, extract and release one uploaded document."""

    @workflow.run
    async def run(self, payload: dict) -> dict:
        await workflow.execute_activity(
            activities.start_job,
            payload,
            start_to_close_timeout=timedelta(seconds=30),
            retry_policy=STANDARD_RETRY,
        )

        try:
            return await workflow.execute_activity(
                activities.extract_document,
                payload,
                start_to_close_timeout=timedelta(minutes=10),
                schedule_to_close_timeout=timedelta(minutes=45),
                retry_policy=STANDARD_RETRY,
            )
        except Exception as error:
            await workflow.execute_activity(
                activities.fail_job,
                {**payload, "category": "extraction_failed", "detail": str(error)[:300]},
                start_to_close_timeout=timedelta(seconds=30),
            )
            raise


@workflow.defn(name="job.export.requested")
class ExportWorkflow:
    """Render and store a specification export."""

    @workflow.run
    async def run(self, payload: dict) -> dict:
        await workflow.execute_activity(
            activities.start_job,
            payload,
            start_to_close_timeout=timedelta(seconds=30),
            retry_policy=STANDARD_RETRY,
        )

        try:
            return await workflow.execute_activity(
                activities.export_document,
                payload,
                # Office-suite conversion is slow but bounded. A render that
                # hangs must fail and free the slot.
                start_to_close_timeout=timedelta(minutes=3),
                schedule_to_close_timeout=timedelta(minutes=12),
                retry_policy=STANDARD_RETRY,
            )
        except Exception as error:
            await workflow.execute_activity(
                activities.fail_job,
                {**payload, "category": "export_failed", "detail": str(error)[:300]},
                start_to_close_timeout=timedelta(seconds=30),
            )
            raise


WORKFLOWS = [AnalysisWorkflow, ExtractionWorkflow, ExportWorkflow]

ACTIVITIES = [
    activities.start_job,
    activities.fail_job,
    activities.run_analysis,
    activities.extract_document,
    activities.export_document,
]
