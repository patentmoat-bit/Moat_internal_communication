# ⚠️ This migration directory is NOT linked to the live Supabase project

**Do not add new migrations here.** All new migrations go in
`moat-main/dashboard/frontend/supabase/migrations/` — that is the directory
actually linked (via `supabase link`) to the live project and pushed with
`supabase db push`.

## Why this directory exists

This repo accumulated two separate `supabase/migrations` directories at some
point in its history — this one, and the linked one under
`dashboard/frontend/`. Only the frontend one is actually applied to the live
database. Some tables `CREATE TABLE`d only in *this* directory do exist live
(likely applied once, manually, before the split occurred, or copied over);
others do not. Several files in the linked directory
(e.g. `20260826120000_fix_overly_permissive_rls.sql`) already document and
work around specific cases of this drift.

## What this means in practice

- **Never assume a table exists live just because it has a `CREATE TABLE`
  here.** Verify against the live schema first (e.g. via the Supabase REST
  API's OpenAPI root endpoint, or `supabase db pull` against the linked
  project) before writing code or migrations that depend on it.
- **Never assume the live schema matches this directory's history for tables
  that DO exist live** — several tables were altered live (columns added, RLS
  enabled) with no corresponding tracked migration anywhere, in either
  directory. Treat both directories as a *lossy* record of the live schema,
  not a source of truth.
- If you need to add a table, column, or policy going forward: write the
  migration in `dashboard/frontend/supabase/migrations/`, verify against the
  live schema before assuming any dependency already exists, and use
  `IF NOT EXISTS`/`IF EXISTS` guards so it's safe to run even if the live
  state has already drifted from both directories.

## Resolving this properly (not done here)

A full consolidation — diffing this directory against the frontend directory
and the actual live schema, then producing one clean, accurate migration
history — is real, valuable work, but it's higher-risk than documenting the
problem: doing it wrong could mask or conflict with schema drift already
identified and worked around in the linked directory. If/when someone does
this, start from the live schema (source of truth) and work backward, not
from either migration directory forward.
