# ADR 0001 — Rebuild baseline

Date: 2026-09-11
Status: Accepted

## Context

The previous application was removed from the working tree (1021 files). The
two planning documents disagreed with the repository: the design document
stated nothing was deployed, while recent commits were Cloudflare and IP
allowlist hardening on a running system.

## Decisions

1. **The previous application is archived, not restored.** It is preserved at
   the git tag `archive/pre-rewrite` (`0b9f97a`) and recoverable at any time.

2. **The stack is the full selection in design document §2.** OpenSearch,
   Temporal, Keycloak, SeaweedFS, Valkey, PgBouncer and Envoy Gateway from the
   start, rather than a reduced stack grown on measured need.

   Recorded trade-off: this is a large operational surface to carry before the
   product has users, and each component is an upgrade and on-call obligation.
   It was chosen deliberately over a slim Postgres-first stack. Revisit if
   operational load displaces product work.

3. **The UI is built first, against typed fixtures.** Component code is written
   against the contracts in `apps/web/src/lib/types.ts`, which mirror design
   document §6 and §7. Fixtures are replaced by the generated OpenAPI client
   without touching components.

4. **Visual direction is document-first and light.** Warm paper ground, a
   single deep teal accent, serif for document voice, structure carried by
   hairlines rather than shadow. Dark theme is a full peer. Rationale: the core
   activity is reading and writing long confidential technical-legal prose.
   The "Obsidian and Cyber-Amber" theme in the blueprint demos well but fights
   sustained reading.

## Consequences for the product surface

The blueprint's novelty percentage is not implemented and will not be. The UI
shows retrieved evidence, which concepts returned no matching passage, and the
provenance of every run — corpus, retrieval, model and prompt version. A
patentability position is recorded as a decision by a named reviewer against an
exact revision, and is marked invalid when that revision changes.

Reason: an inverse-similarity percentage presented as novelty invites an
inventor to publish or open-source on the strength of it, which destroys the
patent right the product exists to protect.
