from __future__ import annotations

import logging
import time
from collections.abc import Awaitable, Callable

import structlog
from fastapi import FastAPI, Request, Response
from prometheus_client import (
    CONTENT_TYPE_LATEST,
    CollectorRegistry,
    Counter,
    Gauge,
    Histogram,
    generate_latest,
)

from moat_api.core.config import get_settings

settings = get_settings()

# Own registry rather than the global default: it keeps library-registered
# collectors out, so what /metrics exposes is exactly what is declared here.
REGISTRY = CollectorRegistry()

# Buckets chosen around the SLOs in design doc §11 (p95 < 500 ms for CRUD,
# < 2 s for search) so the histogram has resolution where the target sits.
LATENCY_BUCKETS = (0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.0, 5.0, 10.0, 30.0)

http_requests = Counter(
    "moat_http_requests_total",
    "HTTP requests, by route and outcome.",
    ["method", "route", "status"],
    registry=REGISTRY,
)

http_latency = Histogram(
    "moat_http_request_seconds",
    "HTTP request latency at the application.",
    ["method", "route"],
    buckets=LATENCY_BUCKETS,
    registry=REGISTRY,
)

http_in_flight = Gauge(
    "moat_http_in_flight",
    "Requests currently being served.",
    registry=REGISTRY,
)

# Overload rejections are tracked separately from errors. A 429 from admission
# control is the system working; a 503 counts against availability. Reporting
# them together hides which is happening (design doc §11).
admission_rejections = Counter(
    "moat_admission_rejections_total",
    "Requests refused before acceptance, by kind and reason.",
    ["kind", "reason"],
    registry=REGISTRY,
)

# The demand signal KEDA scales workers on. Published by the application
# because only it knows what is pending per queue (design doc §9).
jobs_pending = Gauge(
    "moat_jobs_pending",
    "Jobs queued but not started, by kind.",
    ["kind"],
    registry=REGISTRY,
)

jobs_running = Gauge(
    "moat_jobs_running",
    "Jobs currently executing, by kind.",
    ["kind"],
    registry=REGISTRY,
)

jobs_oldest_age = Gauge(
    "moat_jobs_oldest_pending_seconds",
    "Age of the oldest queued job, by kind. Backlog age, not depth, is what "
    "says whether workers are keeping up.",
    ["kind"],
    registry=REGISTRY,
)

outbox_pending = Gauge(
    "moat_outbox_pending",
    "Undelivered outbox events.",
    registry=REGISTRY,
)

outbox_oldest_age = Gauge(
    "moat_outbox_oldest_seconds",
    "Age of the oldest undelivered outbox event.",
    registry=REGISTRY,
)

dependency_up = Gauge(
    "moat_dependency_up",
    "Whether a dependency answered its last check (1) or not (0).",
    ["dependency"],
    registry=REGISTRY,
)

search_queries = Counter(
    "moat_search_queries_total",
    "Retrieval queries, by outcome and retrieval version.",
    ["outcome", "retrieval_version"],
    registry=REGISTRY,
)


def configure_logging() -> None:
    """Structured logs with the request id attached.

    Patent text, credentials and prompts must never reach ordinary logs
    (design doc §10), so nothing here logs request or response bodies.
    """
    logging.basicConfig(
        format="%(message)s",
        level=getattr(logging, settings.log_level.upper(), logging.INFO),
    )
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso", utc=True),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.dev.ConsoleRenderer()
            if settings.env == "development"
            else structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(
            getattr(logging, settings.log_level.upper(), logging.INFO)
        ),
        cache_logger_on_first_use=True,
    )


def route_of(request: Request) -> str:
    """The route template, not the concrete path.

    `/inventions/{id}` rather than `/inventions/01a08f...`: per-id labels would
    make cardinality grow without bound and eventually take Prometheus down.
    """
    route = request.scope.get("route")
    return getattr(route, "path", request.url.path)


async def metrics_middleware(
    request: Request, call_next: Callable[[Request], Awaitable[Response]]
) -> Response:
    http_in_flight.inc()
    started = time.perf_counter()
    status_code = 500
    try:
        response = await call_next(request)
        status_code = response.status_code
        return response
    finally:
        elapsed = time.perf_counter() - started
        route = route_of(request)
        http_in_flight.dec()
        http_latency.labels(request.method, route).observe(elapsed)
        http_requests.labels(request.method, route, str(status_code)).inc()


def metrics_response() -> Response:
    return Response(generate_latest(REGISTRY), media_type=CONTENT_TYPE_LATEST)


def instrument(app: FastAPI) -> None:
    """Attach OpenTelemetry tracing when an endpoint is configured.

    Off by default: an exporter pointed at nothing adds latency and noise. The
    Prometheus metrics above are always on because they cost nothing to
    collect and are what the SLOs are measured from.
    """
    if not settings.otel_enabled or not settings.otel_endpoint:
        return

    from opentelemetry import trace
    from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
    from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
    from opentelemetry.sdk.resources import Resource
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import BatchSpanProcessor

    provider = TracerProvider(
        resource=Resource.create(
            {"service.name": "moat-api", "deployment.environment": settings.env}
        )
    )
    provider.add_span_processor(
        BatchSpanProcessor(OTLPSpanExporter(endpoint=settings.otel_endpoint, insecure=True))
    )
    trace.set_tracer_provider(provider)
    FastAPIInstrumentor.instrument_app(
        app,
        # Health and metrics are scraped constantly and would swamp the trace
        # volume with nothing worth looking at.
        excluded_urls="/api/health,/api/metrics",
    )
