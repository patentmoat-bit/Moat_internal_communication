# Load profiles

## What these measure

They exercise the real request mix against a real stack and surface
correctness failures that only appear under concurrency — revision conflicts,
admission refusals, pool exhaustion, index contention.

They do **not** establish capacity. A number measured on a laptop with one
PostgreSQL instance and one OpenSearch node says nothing about the production
topology. Design doc §13 phase 2 requires these to pass *on declared
hardware* before any capacity claim is made.

## Acceptance profile (design doc §11)

| Run | Users | Spawn rate | Duration | Target |
| --- | --- | --- | --- | --- |
| Sustained | 200 | 10/s | 10m | 50 req/s, p95 < 500ms CRUD |
| Burst | 800 | 100/s | 5m | 200 req/s, no 503s |
| Soak | 150 | 5/s | 4h | No leak in pool waits or memory |
| Ingestion | separate | — | — | Independent of the interactive budget |

## Reading the results

- **429 is success.** Per-tenant admission caps refusing work is the system
  behaving correctly. `moat_admission_rejections_total` should rise under the
  burst profile.
- **503 is failure.** It counts against the availability SLO.
- **409 on PUT is success.** Two users editing one disclosure is exactly the
  optimistic-concurrency case the revision model exists to handle.
- Watch `moat_jobs_oldest_pending_seconds`, not just queue depth. A short
  queue that is not draining is the failure mode depth alone never shows.
- Watch PgBouncer `cl_waiting`. Client wait time rising while CPU is flat
  means the connection budget is the constraint, not the application.

## Before trusting a run

Seed a realistic corpus first. Twenty fixture publications make retrieval
trivially fast and the result meaningless — the search figures only mean
something against a corpus of representative size.
