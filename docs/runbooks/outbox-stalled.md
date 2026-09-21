# Outbox stalled

**Alert:** `MoatOutboxStalled` — `moat_outbox_oldest_seconds > 300`

## What it means

Work was accepted and committed, but is not being dispatched. This is a page,
not a ticket: the product looks healthy while nothing actually happens. Users
see jobs sitting in `queued` forever.

## Confirm

```bash
kubectl logs deploy/moat-dispatcher --tail=100
kubectl exec deploy/moat-api -- psql "$MOAT_MIGRATION_DSN" -c "
  SELECT event_type, count(*), min(created_at), max(attempts), max(left(last_error, 120))
  FROM outbox_events WHERE delivered_at IS NULL GROUP BY event_type;"
```

Three shapes, three causes:

| Symptom | Cause |
| --- | --- |
| `attempts` climbing, `last_error` mentions Temporal | Temporal unreachable |
| `attempts` at 0, dispatcher logs quiet | Dispatcher not running or not claiming |
| `claimed_until` in the future, no progress | A dispatcher died holding leases |

## Act

**Temporal unreachable:** fix that first; the outbox is doing the right thing
by holding. Events are retried with backoff to `MAX_ATTEMPTS = 8`.

```bash
kubectl get pods -l app.kubernetes.io/name=temporal
kubectl exec deploy/moat-api -- temporal operator cluster health --address $MOAT_TEMPORAL_ADDRESS
```

**Dispatcher not running:**

```bash
kubectl get deploy moat-dispatcher
kubectl rollout restart deploy/moat-dispatcher
```

**Stale leases from a dead dispatcher:** leases expire on their own after 60
seconds. If you are certain no dispatcher is running, you can clear them:

```sql
UPDATE outbox_events SET claimed_until = NULL
WHERE delivered_at IS NULL AND claimed_until < now();
```

**Exhausted events** (`attempts >= 8`) are skipped permanently. Once the cause
is fixed, reset them deliberately:

```sql
UPDATE outbox_events SET attempts = 0, last_error = ''
WHERE delivered_at IS NULL AND attempts >= 8 AND created_at > now() - interval '24 hours';
```

## Why redelivery is safe

Every event carries a deterministic `workflow_id`. Temporal answers "already
started" for a duplicate, which the dispatcher treats as success. An event
delivered twice starts one workflow.

## Do not

- **Do not** delete undelivered events to clear the alert. Each one represents
  a committed domain change whose follow-up work has not happened — deleting it
  strands that work permanently with no record that it was lost.
- **Do not** run more than a handful of dispatcher replicas. `FOR UPDATE SKIP
  LOCKED` makes concurrency safe, but claim contention rises and throughput
  does not.
