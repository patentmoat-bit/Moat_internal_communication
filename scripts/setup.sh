#!/usr/bin/env bash
# One-command local setup.
set -euo pipefail
cd "$(dirname "$0")/.."

step() { printf "\n\033[1m==> %s\033[0m\n" "$1"; }

step "Environment files"
cp -n infra/compose/.env.example infra/compose/.env 2>/dev/null || true
cp -n apps/api/.env.example      apps/api/.env      2>/dev/null || true
cp -n apps/web/.env.example      apps/web/.env.local 2>/dev/null || true
echo "    ready"

step "Python dependencies"
(cd apps/api && uv sync --quiet)
echo "    ready"

step "Starting the stack (Postgres, PgBouncer, Valkey, OpenSearch, SeaweedFS, Temporal, Keycloak)"
(cd infra/compose && docker compose --profile full up -d)

step "Waiting for Postgres and OpenSearch"
for _ in $(seq 1 120); do
  pg=$(docker inspect --format '{{.State.Health.Status}}' moat-postgres-1 2>/dev/null || echo none)
  os=$(docker inspect --format '{{.State.Health.Status}}' moat-opensearch-1 2>/dev/null || echo none)
  [ "$pg" = healthy ] && [ "$os" = healthy ] && break
  sleep 2
done
echo "    postgres=$pg opensearch=$os"

step "Migrations"
(cd apps/api && uv run alembic upgrade head)

step "Seed data"
(cd apps/api && uv run python -m moat_api.cli.seed --reset)

step "Search index"
(cd apps/api && uv run python -m moat_api.cli.reindex)

cat <<'DONE'

==> Ready. Four processes, four terminals:

    npm run dev:api            http://127.0.0.1:8000
    npm run dev:dispatcher     outbox -> Temporal
    npm run dev:worker         analysis queue
    npm run dev                http://localhost:3000

    Optional:
    npm run dev:worker:ocr     document extraction queue
    Grafana                    http://localhost:3001  (anonymous viewer)
    Temporal UI                http://localhost:8233

==> Verify:

    npm test                   unit + end-to-end
    npm run test:restore       backup/restore drill
DONE
