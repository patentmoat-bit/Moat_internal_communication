"""Outbox dispatcher entrypoint.

    uv run python -m moat_api.workers.dispatcher

Separate from the API so it scales and fails on its own: a dispatcher that
falls behind must show up as backlog age, not as API latency.
"""

from __future__ import annotations

import asyncio
import contextlib
import logging
import signal

import structlog

from moat_api.core.config import get_settings
from moat_api.services import outbox

log = structlog.get_logger(__name__)


def main() -> None:
    settings = get_settings()
    logging.basicConfig(level=settings.log_level.upper())

    async def run() -> None:
        stop = asyncio.Event()
        loop = asyncio.get_running_loop()
        for sig in (signal.SIGINT, signal.SIGTERM):
            with contextlib.suppress(NotImplementedError):
                loop.add_signal_handler(sig, stop.set)
        await outbox.run_forever(stop)

    asyncio.run(run())


if __name__ == "__main__":
    main()
