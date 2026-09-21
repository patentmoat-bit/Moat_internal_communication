# Search unavailable

**Alert:** `MoatSearchDegraded` — `moat_dependency_up{dependency="opensearch"} == 0`

## What it means

Prior-art retrieval cannot run. The API returns `503 search_unavailable` for
analysis requests, and stored runs are marked `failed` with
`failure_category = search_unavailable`.

## What it does NOT mean

**It does not mean no prior art was found.** This distinction is the whole
point. A user who reads "no results" and files on that basis has made a
decision on evidence that was never gathered. The API is built to never
conflate the two, and neither should you when communicating about the incident.

The product is degraded, not down. Drafting, review, matters, decisions and
document reading all still work. **Do not** declare a full outage.

## Confirm

```bash
kubectl exec deploy/moat-api -- curl -s localhost:8000/api/ready | jq '.dependencies'
kubectl get pods -l app.kubernetes.io/name=opensearch
kubectl exec sts/moat-opensearch-0 -- curl -s localhost:9200/_cluster/health | jq
```

Check in order:

1. **Cluster status red or yellow?** Yellow with replicas unassigned is
   survivable; red means a primary shard is missing.
2. **Disk watermarks.** `_cat/allocation?v`. OpenSearch stops allocating at
   85% and goes read-only at 95%, and this is by far the most common cause.
3. **Is the alias present?**
   ```bash
   kubectl exec sts/moat-opensearch-0 -- curl -s localhost:9200/_cat/aliases/moat-publications?v
   ```
   A missing alias after an index rebuild means the cutover failed partway.

## Act

**Disk pressure:** expand the volume, or delete a superseded index. Previous
index versions are retained for rollback and are the safe thing to remove:

```bash
kubectl exec sts/moat-opensearch-0 -- curl -s localhost:9200/_cat/indices/moat-publications-*?v
# check index_manifests for which one is state='active' before deleting anything
kubectl exec deploy/moat-api -- python -c "
import asyncio
from moat_api.db.session import unscoped_session
from moat_api.services.search import indexer
async def main():
    async with unscoped_session() as s:
        m = await indexer.active_manifest(s)
        print(m.index_name if m else 'no active manifest')
asyncio.run(main())"
```

**Alias missing or pointing at a bad index:** repoint it. The manifests table
records every build, so rollback is picking the previous `superseded` row.

**Cluster red:** if shards cannot recover, rebuild the index. The corpus lives
in PostgreSQL, so the index is derived data and losing it costs time, not data:

```bash
kubectl create job --from=cronjob/moat-reindex moat-reindex-manual
```

## Do not

- **Do not** point the alias at a half-built index to make the alert stop. A
  partial index returns fewer results while looking entirely healthy, which is
  the failure mode this whole system is designed to prevent.
- **Do not** disable the readiness dependency check. It is non-essential by
  design, so it is already not removing pods from rotation.
- **Do not** re-run failed analyses in bulk before search is healthy. They will
  fail again and consume the tenant's admission budget.
