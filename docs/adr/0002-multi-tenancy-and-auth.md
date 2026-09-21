# ADR 0002 — Multi-tenancy, authentication and authorisation

Date: 2026-09-11
Status: Accepted · Implemented

## Context

MOAT holds unfiled invention disclosures. An unfiled disclosure is a trade
secret whose value is destroyed by disclosure, so a cross-tenant leak is not a
privacy incident — it is the destruction of a customer's patent rights. That
sets the bar for how tenant isolation is built.

## Decisions

### 1. Isolation is enforced twice, independently

The API resolves the caller's membership and never trusts a client-supplied
tenant id. *Separately*, PostgreSQL row policies filter every tenant-owned
table against a transaction-local `app.tenant_id`.

Either layer alone is a single point of failure. A forgotten `WHERE tenant_id`
in one query is an ordinary mistake; with the row policy it returns nothing
instead of another customer's disclosure.

Consequences:

- The application connects as `moat_app`, a **non-owner** role **without
  BYPASSRLS**. Migrations run as `moat_owner`. The app cannot alter schema.
- `FORCE ROW LEVEL SECURITY` is on, so the owner is filtered too. Code that
  accidentally connects as owner does not silently bypass isolation.
- Tenant context uses `SET LOCAL`, not `SET`. PgBouncer in transaction mode
  hands the same server connection to another tenant's request as soon as the
  transaction ends; a session-scoped setting would leak across that boundary.
- With no tenant context set, tenant-owned tables return **zero rows**. Verified:
  12 tenant-owned tables exist; the app role reads 0 disclosures without context
  while 6 are present.
- A migration-time guard fails the build if a table gains `tenant_id` without a
  matching policy.

### 2. Two exceptions, both deliberate

`app_sessions` carries `tenant_id` but has no policy: a session is looked up by
the hash of an opaque token *before* any identity is known, so no predicate can
apply. Protected by a random unique token, lookup by exact hash only, and no
column that discloses another tenant's data.

`memberships` gets a different policy — visible within their tenant **or** to
the user they belong to — because login must read membership to discover which
tenants someone may act in, before a tenant is chosen. This is why the auth code
calls `set_actor()` before every membership query.

### 3. Sessions are server-side and revocable

An opaque token in an HttpOnly, SameSite=Lax cookie; only its SHA-256 hash is
stored, so a database disclosure hands over no usable sessions. Each session
pins the membership revision it was issued with, so a role change takes effect
on the **next request** rather than whenever the session happens to expire.

Switching workspace mints a new session and revokes the old one, so a token is
only ever valid for the tenant it was issued for.

### 4. Permissions, not job titles

Multiple roles per membership. Notably, `admin` does **not** hold
`decision.create`: platform administration is not legal authority. Verified by
test — an admin attempting to approve a disclosure gets 403.

### 5. Development auth mode

`MOAT_AUTH_MODE=dev` authenticates against argon2 hashes in the database so the
stack runs without an identity provider configured. `Settings.validate_for_env`
**refuses to start** if that mode, an insecure cookie flag, a development
secret, or an http origin is present when `MOAT_ENV=production`. Keycloak OIDC
is the production path.

## Verification

`npm run test:smoke` — 38 checks covering cross-tenant reads, permission
boundaries, stale-revision decisions, optimistic concurrency, notification
delivery and workspace switching. All passing.

## Known gaps

- Login throttling is in-process, so it is correct for one replica and useless
  across several. Move to Valkey before scaling the API out.
- Notifications poll on a 60s timer. The design calls for SSE replayed from a
  durable cursor; the notification row is already the record, so no delivery is
  lost by the placeholder.
- OIDC is configured but not exercised — no Keycloak realm has been imported.
- Prior-art retrieval is lexical (PostgreSQL full-text) only. Honest, explainable,
  and labelled as such: every run records `modelVersion: "none (lexical retrieval only)"`.
