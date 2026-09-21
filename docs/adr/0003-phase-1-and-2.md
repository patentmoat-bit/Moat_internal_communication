# ADR 0003 — Phase 1 complete, Phase 2 built but unmeasured

Date: 2026-09-11
Status: Accepted · Phase 1 implemented and verified · Phase 2 artifacts built, exit criteria not met

## Phase 1 — one complete product path

Design doc §13 requires: *login, tenant permissions, IDF editor, upload,
job/outbox, OCR, OpenSearch, analysis evidence, legal decision, notification*,
with the exit criterion *a researcher submits one IDF and counsel reviews its
exact revision; negative access tests pass*.

All delivered and exercised by `npm test` (15 unit + 62 end-to-end).

### Decisions worth recording

**Retrieval is hybrid, and says so.** OpenSearch with BM25 plus 256-dimension
static embeddings (`model2vec`, `potion-base-8M`), combined through a
normalisation pipeline. Static embeddings rather than a transformer: inference
is a lookup and an average, so it runs in-process on CPU with no model server
to operate. Quality is below a full transformer, which is exactly why it is
combined with BM25 rather than trusted alone.

When embeddings are unavailable the system degrades to BM25 and records
`retrieval_version: opensearch-bm25@1.0` on every affected run, so a result
can always be interpreted correctly later.

**Indices are versioned behind an alias.** Each build gets its own name
carrying corpus revision, retrieval version and a build stamp. Cutover is one
atomic alias action; the previous build is retained for rollback and pruned
after two generations. Reindexing had to be repeatable — the first
implementation collided on a unique name, which would have made recovery from
a bad build impossible.

**Analysis is a job, not a request.** `POST /analyses` returns `202` with a
durable job. Retrieval that is fast against 20 fixture documents will not be
fast against 120 million with a reranking budget, and the contract that
survives that change is the one worth adopting now.

**Uploads quarantine first.** Server-generated keys under a per-tenant
quarantine prefix; declared type, size and extension validated at reservation;
magic bytes verified before the whole file is read; checksum compared to what
actually landed. Files move to the readable prefix only after extraction
succeeds, and a file that cannot be read is deleted rather than retained.

**OCR is reported, not faked.** Native text extraction only. Pages with no text
layer are counted and surfaced as "N pages need OCR". Returning a scanned page
as empty text would make a prior-art search silently miss the document.

**Events replay from a durable cursor.** SSE carries notifications and job
progress. The browser sends back the timestamp it last saw; everything after it
is replayed from PostgreSQL. A dropped connection or a restarted replica loses
nothing because the row is the record and delivery is only a hint.

### Bugs found by building it

- An activity that crashed mid-flight left its document stuck in `extracting`
  forever, which reads to a user as "still working" rather than "this failed".
  Terminal failure now releases the subject.
- A failed job blocked its own retry through the idempotency key. Asking again
  after a permanent failure is a retry request, not a duplicate.
- The membership row policy correctly broke login until the auth path declared
  the acting user first — the policy was right, the caller was wrong.

## Phase 2 — built, not measured

Design doc §13 requires *HA deployment, bounded admission, autoscaling,
monitoring, backup/restore, operator runbooks*, with the exit criterion *pilot
load/SLO and failure/restore tests pass on declared hardware*.

**Every artifact is built. The exit criterion is not met, and cannot be met on
a laptop.** Capacity is a measurement, not a configuration value.

### Built and verified locally

| Deliverable | State |
| --- | --- |
| Bounded admission control | Per-tenant caps reserved atomically with the job; 429 before acceptance. 7 tests. |
| Monitoring | 11 Prometheus metrics, 7 SLO alerts, 9-panel Grafana dashboard. Verified: stopping OpenSearch moved `MoatSearchDegraded` to pending. |
| Backup/restore | `npm run test:restore` — 15 checks including that RLS policies and grants survive a restore. |
| Honest degradation | Verified: with OpenSearch stopped, readiness stays true and disclosures stay readable. |
| Runbooks | Six, written for whoever is on call, each with an explicit "do not". |
| Helm chart | 37 manifests render and validate. |
| Load profile | Locust, realistic mix. Ran; found a real bug (below). |

### Built, not verifiable here

HA topology (3-zone CloudNativePG, OpenSearch quorum, SeaweedFS replication),
HPA and KEDA autoscaling, Gateway API routing and rate limits, NetworkPolicy
enforcement, the deployment images. These are declared in the chart and cannot
be exercised without a cluster.

### What the load test found

The login throttle was keyed on `(IP, email)`. Under the load profile every
simulated user shares one source address — the same shape as an office behind
a NAT gateway — and legitimate users locked each other out. Split into a tight
per-account budget and a loose per-address one.

This is the argument for load testing as a correctness exercise, not only a
capacity one.

### Local numbers, which are not capacity

45 seconds, 60 users, single machine, everything co-resident, 20-document
corpus: reads p95 ~94 ms, writes p95 ~66 ms, login p95 ~510 ms (argon2, by
design). **These say nothing about production.** They mean the paths work under
concurrency.

## Before Phase 2 can be called complete

1. Deploy to a real three-zone cluster on declared hardware.
2. Sustained (50 req/s, 10m) and burst (200 req/s, 5m) profiles against a
   representative corpus, not 20 fixtures.
3. Failure drills: kill a primary, a zone, a worker pool, OpenSearch.
4. A regional restore exercise measured against the RPO/RTO targets.
5. Replace every replica floor and ceiling in `values.yaml` with a measured
   number.

## Known gaps

- Login throttling is in-process — correct for one replica, useless across
  several. Must move to Valkey before the API is scaled out.
- OIDC is implemented and enforced for production start-up, but no Keycloak
  realm has been imported, so the flow is untested.
- Temporal workflow versioning is not configured. Long-running workflows will
  need it before a worker upgrade that changes activity signatures.
- Antivirus scanning of quarantined files is a declared state with no scanner
  wired.
- Valkey is deployed but used for nothing yet.
