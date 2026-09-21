# MOAT

Invention disclosure, prior-art evidence and patent matter management.
Multi-tenant, with tenant isolation enforced in PostgreSQL as well as in the API.

- Product scope: [MOAT_MASTER_BLUEPRINT.md](./MOAT_MASTER_BLUEPRINT.md)
- Implementation baseline: [MOAT_SYSTEM_DESIGN.md](./MOAT_SYSTEM_DESIGN.md)
- Decisions: [docs/adr/](./docs/adr/) · Operations: [docs/runbooks/](./docs/runbooks/)

The pre-rewrite application is preserved at the git tag `archive/pre-rewrite`.

## Quick start

```bash
npm run setup     # env files, stack, migrations, seed data, search index
```

Then four processes:

```bash
npm run dev:api          # http://127.0.0.1:8000
npm run dev:dispatcher   # outbox -> Temporal
npm run dev:worker       # analysis queue
npm run dev              # http://localhost:3000
```

Optional: `npm run dev:worker:ocr` for document extraction,
Grafana at `http://localhost:3001`, Temporal UI at `http://localhost:8233`.

Sign in with any seeded account — password `moat-dev-password`:

| Account | Workspace | Roles |
| --- | --- | --- |
| `priya@northwind.example` | Northwind Robotics | researcher |
| `mei@northwind.example` | Northwind Robotics | counsel |
| `viktor@northwind.example` | Northwind Robotics | cto, product |
| `sam@northwind.example` | Northwind Robotics | admin |
| `ines@vantage.example` | Vantage Photonics | researcher |
| `tara@ipcounsel.example` | **both** | counsel |

Sign in as Priya to raise a disclosure, attach a document and search prior art;
as Mei to review and decide; as Tara to switch workspaces and see two entirely
separate sets of disclosures. As Sam, note that an administrator cannot approve
a filing.

## Layout

```
apps/web/            Next.js — nine role workspaces in one app
apps/api/            FastAPI — domain modules, auth, retrieval, workers, migrations
packages/ui/         Design system: tokens + primitives
infra/compose/       Local stack, Prometheus, Grafana
infra/helm/moat/     Kubernetes chart — 37 manifests
docs/adr/            Decision records
docs/runbooks/       Operator runbooks
tests/integration/   End-to-end checks against a running stack
tests/load/          Locust profiles
scripts/             setup, restore drill
```

## Commands

| Command | Does |
| --- | --- |
| `npm test` | Unit + end-to-end (77 checks) |
| `npm run test:restore` | Backup/restore drill (15 checks) |
| `npm run test:load` | Locust load profile |
| `npm run stack:up` / `stack:down` | Full Docker stack |
| `npm run db:migrate` / `db:seed` | Schema / seed data |
| `npm run search:reindex` | Rebuild the index, cut the alias over |
| `npm run helm:lint` | Validate the Kubernetes chart |
| `npm run lint`, `lint:api`, `typecheck` | Static checks |

## Architecture

```
Browser ─► Next.js ─► FastAPI ─► PgBouncer ─► PostgreSQL   (records, RLS)
                          ├──────────────────► OpenSearch   (hybrid retrieval)
                          ├──────────────────► SeaweedFS    (documents)
                          └── outbox ─► dispatcher ─► Temporal ─► workers
```

A change, its audit event and its outbox event commit in one transaction. The
dispatcher leases undelivered events with `FOR UPDATE SKIP LOCKED` and starts a
workflow under a deterministic id, so redelivery after a crash is safe. Workers
set tenant context from the job payload, which means row policies apply to them
exactly as they do to a request.

## Phase status

**Phase 1 — one complete product path: complete.**

| | |
| --- | --- |
| Login, sessions, workspace switching | OIDC-ready, dev password mode for local |
| Tenants, memberships, roles, permissions | 9 roles, 14 permissions, multiple roles per person |
| Tenant isolation | API + PostgreSQL row policies, 17 tables, FORCE enabled |
| Disclosure editor | Create, edit, immutable revisions, optimistic concurrency |
| Upload and extraction | Quarantine, magic bytes, checksum, PDF/DOCX/text, OCR reported |
| Jobs and outbox | Durable 202, idempotency, retry, `failed_jobs` for operators |
| Prior-art retrieval | OpenSearch hybrid BM25 + 256d vectors, versioned indices |
| Review decisions | Against an exact revision, superseded when it changes |
| Notifications | Persisted first, streamed over SSE with a replay cursor |
| Audit trail | Append-only for the application role |

**Phase 2 — production pilot: artifacts built, exit criteria not met.**

Built and verified locally: admission control, Prometheus metrics, SLO alerts,
Grafana dashboard, backup/restore drill, honest degradation, six runbooks, the
Helm chart, load profiles.

Built but not verifiable here: HA topology, autoscaling, Gateway routing,
network policies. These need a cluster.

**Not met:** *"pilot load/SLO and failure/restore tests pass on declared
hardware"*. Capacity is a measurement. Every replica floor and ceiling in
`values.yaml` is a starting point for testing, not a validated number. See
[ADR 0003](./docs/adr/0003-phase-1-and-2.md) for exactly what remains.

**Not started:** phases 3–5 — drafting and claim tools, matter docketing,
landscape analysis, portfolio valuation, corpus expansion. Those workspaces
show their phase in the sidebar and say what they will do rather than 404-ing.

## What this deliberately does not do

There is no novelty percentage. The UI shows retrieved passages, which concepts
returned *no* matching passage, and the provenance of every run — corpus,
retrieval, model and prompt version. A patentability position is recorded as a
decision by a named reviewer against an exact revision, and is marked superseded
the moment that revision changes.

An inverse-similarity score presented as "novelty" invites an inventor to
publish or open-source on the strength of it, destroying the patent right this
product exists to protect.

Relatedly: when search is down, the API returns `503 search_unavailable` rather
than an empty result set. "Search did not run" and "nothing was found" mean
opposite things to someone deciding whether to file.

## Known gaps

Stated plainly here and in [ADR 0003](./docs/adr/0003-phase-1-and-2.md):

- Login throttling is in-process — correct for one replica, useless across
  several. Move to Valkey before scaling the API out.
- OIDC is implemented and enforced at production start-up, but no Keycloak
  realm has been imported, so the flow is untested.
- Temporal workflow versioning is not configured.
- Antivirus scanning of quarantined uploads is a declared state with no scanner.
- Valkey is deployed but not yet used.
