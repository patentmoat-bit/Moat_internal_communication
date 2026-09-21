# Runbooks

Written for whoever is on call at 3am, not for whoever wrote the system.

Each one states what the alert means, what it does **not** mean, how to confirm,
what to do, and what not to do. The "do not" sections are as important as the
rest: most of the ways to make an incident worse look like progress.

| Runbook | Alert |
| --- | --- |
| [Search unavailable](./search-unavailable.md) | `MoatSearchDegraded` |
| [Outbox stalled](./outbox-stalled.md) | `MoatOutboxStalled` |
| [Job backlog not draining](./job-backlog.md) | `MoatJobBacklogStale` |
| [Database failover and restore](./database.md) | `MoatEssentialDependencyDown` |
| [Deploy and rollback](./deploy-and-rollback.md) | — |
| [Suspected cross-tenant exposure](./tenant-exposure.md) | — (highest severity) |

## Before anything else

1. **Note the request id.** Every API response carries `x-request-id`, and it
   propagates through the gateway, the outbox, workers and retrieval. It is the
   fastest way from "a user complained" to the actual failure.
2. **Check what is actually degraded**, not what is down:
   ```bash
   kubectl exec deploy/moat-api -- curl -s localhost:8000/api/ready | jq
   ```
   Only `postgres` is essential. The rest degrade the product honestly.
3. **Do not restart pods to see if it helps.** Liveness deliberately checks
   nothing external, so a restart fixes only a wedged process — and removes
   capacity from a system already under stress.

## What the user sees during each failure

Worth knowing before you decide how urgent something is.

| Failure | User experience |
| --- | --- |
| Search down | Prior-art search says unavailable. Drafting, review, matters all work. |
| Workers down | Analyses and uploads stay queued. Nothing is lost; nothing completes. |
| Dispatcher down | Same as workers down — accepted work never starts. |
| Object store down | New uploads fail. Existing documents and their extracted text still readable. |
| Temporal down | New jobs queue in the outbox up to its cap, then admission refuses with 429. |
| PostgreSQL down | Everything fails. No edit or approval is falsely acknowledged. |
| Identity down | Existing sessions keep working to their expiry. New logins fail. |
