# This is the linked migration directory

This directory is linked (via `supabase link`) to the live Supabase project
and is the one actually applied with `supabase db push`. **All new migrations
go here.**

A second, unlinked migration directory also exists at
`moat-main/dashboard/supabase/migrations/` — see the README there for why it
exists and why you should not add new migrations to it. Several files in
*this* directory (e.g. `20260826120000_fix_overly_permissive_rls.sql`)
already document specific cases of schema drift discovered between that
orphaned directory, this one, and the actual live database.

**Before assuming any table/column/policy exists live, verify it directly**
(e.g. via the Supabase REST API's OpenAPI root endpoint) rather than trusting
either migration directory — the live schema has drifted from both in ways
that are only partially documented so far.
