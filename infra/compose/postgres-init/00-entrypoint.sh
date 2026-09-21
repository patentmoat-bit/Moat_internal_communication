#!/bin/sh
# Passwords arrive as environment variables, so the SQL is run through psql
# with :variables rather than being interpolated into a file on disk.
set -eu

psql -v ON_ERROR_STOP=1 \
  --username "$POSTGRES_USER" \
  --dbname postgres \
  -v moat_owner_password="$MOAT_DB_OWNER_PASSWORD" \
  -v moat_app_password="$MOAT_DB_APP_PASSWORD" \
  -v keycloak_password="$KEYCLOAK_DB_PASSWORD" \
  -f /opt/moat/01-roles-and-databases.sql
