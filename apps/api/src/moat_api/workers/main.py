"""Worker entrypoint.

    uv run python -m moat_api.workers.main --queue moat-ai-interactive

One process per task queue, so each scales on its own demand signal and a
saturated OCR queue cannot delay interactive analysis (design doc §9).
"""

from __future__ import annotations

import argparse
import asyncio
import contextlib
import logging
import signal

import structlog
from temporalio.client import Client
from temporalio.worker import Worker

from moat_api.core.config import get_settings
from moat_api.workers.workflows import ACTIVITIES, WORKFLOWS

log = structlog.get_logger(__name__)
settings = get_settings()

QUEUES = ("moat-ai-interactive", "moat-ocr", "moat-index", "moat-export", "moat-workflow")


async def run(queue: str, concurrency: int) -> None:
    client = await Client.connect(
        settings.temporal_address, namespace=settings.temporal_namespace
    )

    stop = asyncio.Event()
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        # Graceful drain: stop accepting new tasks, let in-flight ones finish.
        # Killing a worker mid-activity is safe (the work retries) but wasteful.
        with contextlib.suppress(NotImplementedError):
            loop.add_signal_handler(sig, stop.set)

    worker = Worker(
        client,
        task_queue=queue,
        workflows=WORKFLOWS,
        activities=ACTIVITIES,
        max_concurrent_activities=concurrency,
        graceful_shutdown_timeout=__import__("datetime").timedelta(seconds=30),
    )

    log.info("worker.started", queue=queue, concurrency=concurrency)
    async with worker:
        await stop.wait()
    log.info("worker.stopped", queue=queue)


def main() -> None:
    logging.basicConfig(level=settings.log_level.upper())
    parser = argparse.ArgumentParser(description="MOAT Temporal worker")
    parser.add_argument("--queue", default="moat-ai-interactive", choices=QUEUES)
    parser.add_argument(
        "--concurrency",
        type=int,
        default=2,
        help="Concurrent activities. Keep low for CPU-bound queues.",
    )
    args = parser.parse_args()
    asyncio.run(run(args.queue, args.concurrency))


if __name__ == "__main__":
    main()
