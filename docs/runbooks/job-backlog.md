# Job backlog not draining

**Alert:** `MoatJobBacklogStale` — `moat_jobs_oldest_pending_seconds > 900`

## What it means

Jobs of some kind have been waiting over fifteen minutes. Note the alert is on
backlog **age**, not depth: a short queue that is not moving is the failure a
depth threshold never notices.

## Confirm

```bash
kubectl exec deploy/moat-api -- curl -s localhost:8000/api/metrics \
  | grep -E 'moat_jobs_(pending|running|oldest)'
kubectl get pods -l app.kubernetes.io/component=worker
kubectl get scaledobject
kubectl get hpa
```

## Diagnose

**Are workers running at all?** A KEDA `ScaledObject` that cannot reach
Prometheus reports no metric, and a missing metric is not zero — scaling stops
where it is.

```bash
kubectl describe scaledobject moat-worker-ocr | tail -30
```

**Are they running but failing?** Check `failed_jobs`, which exists precisely
because Temporal has no dead-letter queue:

```sql
SELECT kind, failure_category, count(*), max(created_at)
FROM failed_jobs WHERE resolved_at IS NULL
GROUP BY kind, failure_category ORDER BY count DESC;
```

**Are they blocked on a dependency?** OCR needs object storage; analysis needs
OpenSearch. A worker that cannot reach its dependency retries within its budget
and then fails — the backlog is a symptom, not the cause.

**Is the arrival rate simply higher than capacity?** From design doc §9:

```
required replicas >= ceil(arrival_rate * mean_service_time
                          / (concurrency_per_worker * target_utilisation))
```

A queue absorbs a burst. It cannot absorb a permanently higher arrival rate
than processing capacity — no amount of scaling fixes that, only more capacity
or a lower admission rate.

## Act

- Dependency down → fix that; the backlog drains on its own.
- Under-scaled → raise `maxReplicas` for that worker, and check the node pool
  has room. HPA and KEDA scale pods; something must provide nodes.
- Poison input → the failing jobs are in `failed_jobs` with lineage. Resolve
  them rather than letting them consume retry budget.

## Do not

- **Do not** raise the per-tenant admission caps to clear a backlog. That
  accepts *more* work into a system already unable to process what it has.
- **Do not** set `minReplicaCount: 0` while debugging. Scale-to-zero needs a
  demand signal proven to be delivered while no replica exists.
