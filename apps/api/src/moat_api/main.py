from __future__ import annotations

import asyncio
import contextlib
import uuid
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from starlette.exceptions import HTTPException as StarletteHTTPException

from moat_api.api.v1 import (
    ai,
    analyses,
    auth,
    decisions,
    drafts,
    drawings,
    events,
    inventions,
    jobs,
    notifications,
    search,
    uploads,
    users,
    websocket,
)
from moat_api.core import telemetry
from moat_api.core.config import get_settings
from moat_api.core.errors import (
    http_exception_handler,
    unhandled_exception_handler,
    validation_exception_handler,
)
from moat_api.db.session import engine
from moat_api.services import health
from moat_api.services.search import client as search_client

settings = get_settings()
telemetry.configure_logging()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    try:
        async with engine.connect() as connection:
            await connection.execute(text("SELECT 1"))
    except Exception as exc:
        if settings.is_production:
            raise
        import logging
        logging.getLogger("moat_api").warning("Database offline; running in standalone development mode (%s)", exc)

    stop = asyncio.Event()
    gauges = asyncio.create_task(health.gauge_refresh_loop(stop))
    try:
        yield
    finally:
        stop.set()
        gauges.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await gauges
        with contextlib.suppress(Exception):
            await search_client.close()
        with contextlib.suppress(Exception):
            await engine.dispose()


app = FastAPI(
    title="MOAT API",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/api/docs" if not settings.is_production else None,
    redoc_url=None,
    openapi_url="/api/openapi.json" if not settings.is_production else None,
)

# Credentialed CORS must name an exact origin -- a wildcard is rejected by the
# browser when cookies are involved, and would be wrong here anyway.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.web_origin],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["content-type", "accept", "x-request-id"],
    max_age=600,
)


app.middleware("http")(telemetry.metrics_middleware)
telemetry.instrument(app)


@app.middleware("http")
async def request_context(request: Request, call_next):
    """One correlation id per request, echoed back so a user can quote it."""
    request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers["x-request-id"] = request_id
    # Defence in depth for a JSON API that should never be framed or sniffed.
    response.headers["x-content-type-options"] = "nosniff"
    response.headers["x-frame-options"] = "DENY"
    response.headers["referrer-policy"] = "same-origin"
    return response


app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)

for module in (
    ai,
    analyses,
    auth,
    decisions,
    drafts,
    drawings,
    events,
    inventions,
    jobs,
    notifications,
    search,
    uploads,
    users,
    websocket,
):
    app.include_router(module.router, prefix="/api/v1")


@app.get("/api/health", tags=["ops"])
async def liveness() -> dict[str, str]:
    """Liveness: is this process alive.

    Deliberately checks nothing external. A liveness probe that fails when a
    dependency is down gets the pod killed and restarted, which fixes nothing
    and removes capacity exactly when it is needed.
    """
    return {"status": "ok", "env": settings.env}


@app.get("/api/ready", tags=["ops"])
async def readiness(response: Response) -> dict[str, object]:
    """Readiness: should this replica receive traffic.

    Fails only on essential dependencies. A replica with search down still
    serves drafting and review correctly, and pulling it from rotation would
    turn a degraded feature into a full outage.
    """
    ready, states = await health.readiness()
    if not ready:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    return {
        "ready": ready,
        "dependencies": [
            {
                "name": state.name,
                "up": state.up,
                "essential": state.essential,
                "detail": state.detail,
            }
            for state in states
        ],
    }


@app.get("/api/metrics", tags=["ops"], include_in_schema=False)
async def metrics() -> Response:
    """Prometheus scrape endpoint. Never exposed publicly by the gateway."""
    return telemetry.metrics_response()
