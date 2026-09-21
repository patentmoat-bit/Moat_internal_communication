#!/usr/bin/env bash
# Backup and restore drill.
#
# Design doc §10 requires isolated restores to be exercised monthly, because a
# backup that has never been restored is a hypothesis, not a recovery plan.
#
# This drill uses pg_dump/pg_restore against the local Compose stack. Production
# uses CloudNativePG with continuous WAL archiving -- the mechanism differs, but
# the questions this asks are the same ones the production drill must answer:
#
#   1. Does the dump complete?
#   2. Does it restore into an empty database?
#   3. Do the row-level security POLICIES survive? (A restore that loses them
#      silently disables tenant isolation -- the worst possible outcome, because
#      the application keeps working.)
#   4. Do the grants survive? (An application role that comes back with UPDATE
#      on audit_events has lost its append-only guarantee.)
#   5. Does the data match?
#
# Usage: ./scripts/restore-drill.sh

set -euo pipefail

CONTAINER="${MOAT_PG_CONTAINER:-moat-postgres-1}"
SOURCE_DB="${MOAT_DB:-moat}"
DRILL_DB="moat_restore_drill_$(date +%s)"
SUPERUSER="${POSTGRES_SUPERUSER:-postgres}"
DUMP_PATH="/tmp/${DRILL_DB}.dump"

pass=0
fail=0

check() {
  if [ "$2" = "$3" ]; then
    printf "  PASS  %-52s %s\n" "$1" "$2"
    pass=$((pass + 1))
  else
    printf "  FAIL  %-52s got %s, expected %s\n" "$1" "$2" "$3"
    fail=$((fail + 1))
  fi
}

psql_source() { docker exec "$CONTAINER" psql -U "$SUPERUSER" -d "$SOURCE_DB" -tAc "$1"; }
psql_drill()  { docker exec "$CONTAINER" psql -U "$SUPERUSER" -d "$DRILL_DB"  -tAc "$1"; }

cleanup() {
  docker exec "$CONTAINER" psql -U "$SUPERUSER" -d postgres -q \
    -c "DROP DATABASE IF EXISTS ${DRILL_DB}" >/dev/null 2>&1 || true
  docker exec "$CONTAINER" rm -f "$DUMP_PATH" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "Restore drill  source=${SOURCE_DB}  target=${DRILL_DB}"
echo

echo "1. Capture"
started=$(date +%s)
docker exec "$CONTAINER" pg_dump -U "$SUPERUSER" -d "$SOURCE_DB" -Fc -f "$DUMP_PATH"
dump_size=$(docker exec "$CONTAINER" stat -c %s "$DUMP_PATH")
echo "   dump: ${dump_size} bytes in $(( $(date +%s) - started ))s"

echo
echo "2. Restore into an empty database"
docker exec "$CONTAINER" psql -U "$SUPERUSER" -d postgres -q -c "CREATE DATABASE ${DRILL_DB}"
restore_started=$(date +%s)
# Roles are cluster-wide and already exist; --no-owner avoids failing on them
# while still restoring the grants that matter.
docker exec "$CONTAINER" pg_restore -U "$SUPERUSER" -d "$DRILL_DB" --no-owner "$DUMP_PATH" \
  >/dev/null 2>&1 || true
echo "   restored in $(( $(date +%s) - restore_started ))s"

echo
echo "3. Structure survived"
check "tables" \
  "$(psql_drill "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'")" \
  "$(psql_source "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'")"

# The critical one. A restore that loses policies leaves the application
# running normally with tenant isolation silently gone.
check "row-level security policies" \
  "$(psql_drill "SELECT count(*) FROM pg_policies WHERE schemaname='public'")" \
  "$(psql_source "SELECT count(*) FROM pg_policies WHERE schemaname='public'")"

check "tables with FORCE row security" \
  "$(psql_drill "SELECT count(*) FROM pg_class WHERE relnamespace='public'::regnamespace AND relforcerowsecurity")" \
  "$(psql_source "SELECT count(*) FROM pg_class WHERE relnamespace='public'::regnamespace AND relforcerowsecurity")"

check "indexes" \
  "$(psql_drill "SELECT count(*) FROM pg_indexes WHERE schemaname='public'")" \
  "$(psql_source "SELECT count(*) FROM pg_indexes WHERE schemaname='public'")"

check "foreign key constraints" \
  "$(psql_drill "SELECT count(*) FROM information_schema.table_constraints WHERE constraint_schema='public' AND constraint_type='FOREIGN KEY'")" \
  "$(psql_source "SELECT count(*) FROM information_schema.table_constraints WHERE constraint_schema='public' AND constraint_type='FOREIGN KEY'")"

echo
echo "4. Least privilege survived"
check "audit_events is still append-only for moat_app" \
  "$(psql_drill "SELECT count(*) FROM information_schema.table_privileges WHERE grantee='moat_app' AND table_name='audit_events' AND privilege_type IN ('UPDATE','DELETE')")" \
  "0"

check "publications still read-only for moat_app" \
  "$(psql_drill "SELECT count(*) FROM information_schema.table_privileges WHERE grantee='moat_app' AND table_name='publications' AND privilege_type<>'SELECT'")" \
  "0"

echo
echo "5. Data survived"
for table in tenants users memberships inventions invention_versions publications audit_events; do
  check "rows in ${table}" "$(psql_drill "SELECT count(*) FROM ${table}")" \
                           "$(psql_source "SELECT count(*) FROM ${table}")"
done

echo
echo "6. Isolation still enforced on the restored copy"
# Proves the restored database defaults to denying, not to exposing everything.
check "no tenant context returns no disclosures" \
  "$(docker exec "$CONTAINER" psql -U moat_app -d "$DRILL_DB" -tAc "SELECT count(*) FROM inventions" 2>/dev/null || echo error)" \
  "0"

echo
echo "==============================================="
printf "  %d passed, %d failed\n" "$pass" "$fail"
echo "==============================================="
[ "$fail" -eq 0 ]
