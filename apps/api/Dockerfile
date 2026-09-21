# syntax=docker/dockerfile:1.7
# Build: docker build -f apps/api/Dockerfile -t moat-api .   (context = repo root)

FROM python:3.12-slim-bookworm AS base
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

# ---------------------------------------------------------------- builder --
FROM base AS builder
COPY --from=ghcr.io/astral-sh/uv:0.11 /uv /usr/local/bin/uv
WORKDIR /build

# Dependencies resolve from the lockfile before application code is copied, so
# a source change does not invalidate the dependency layer.
COPY apps/api/pyproject.toml apps/api/uv.lock ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-install-project --no-dev

COPY apps/api/src ./src
COPY apps/api/alembic ./alembic
COPY apps/api/alembic.ini ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev

# ---------------------------------------------------------------- runtime --
FROM base AS runtime

# Runs as a non-root user with no writable application directory: a process
# that cannot modify its own code cannot be persistently backdoored by one.
RUN groupadd --system --gid 10001 moat \
    && useradd --system --uid 10001 --gid moat --no-create-home moat

WORKDIR /app
COPY --from=builder --chown=root:root /build /app
ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONPATH=/app/src

USER 10001:10001
EXPOSE 8000

# Liveness only -- readiness is checked by the orchestrator against /api/ready,
# which knows the difference between "this process is wedged" and "a dependency
# is down".
HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=3 \
    CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/api/health', timeout=2).status==200 else 1)"

# No --reload, no --workers: one process per container, replicas are the unit
# of scale so the orchestrator can see and schedule them.
CMD ["uvicorn", "moat_api.main:app", "--host", "0.0.0.0", "--port", "8000", \
     "--proxy-headers", "--forwarded-allow-ips", "*", "--no-server-header"]
