# Database failover and restore

**Alert:** `MoatEssentialDependencyDown` — `moat_dependency_up{dependency="postgres"} == 0`

## What it means

Everything is failing. Mutations are refused; no edit or approval is being
falsely acknowledged. That last part matters — the system fails closed, so
nothing is silently accepted and lost.

## Automatic failover

CloudNativePG promotes a standby without intervention. Expect service back in
around 30 seconds.

```bash
kubectl get cluster moat-postgres
kubectl cnpg status moat-postgres
```

**Writes paused instead of failing over?** That is `dataDurability: required`
with a synchronous standby, and it is deliberate: a committed write must
survive losing the primary. If no healthy standby remains, writes stop rather
than silently weakening durability.

Relaxing it is a decision with a consequence, not a fix:

```bash
# Trades the zero-loss guarantee for availability. Say so in the incident
# channel; committed writes may be lost if the primary is then lost.
kubectl patch cluster moat-postgres --type merge \
  -p '{"spec":{"postgresql_synchronous":{"dataDurability":"preferred"}}}'
```

Restore it once a standby is healthy again.

## Connection exhaustion (looks like an outage, is not)

`FATAL: remaining connection slots are reserved` or PgBouncer `cl_waiting`
climbing while CPU is flat.

```bash
kubectl exec -it moat-pgbouncer-0 -- psql -p 5432 pgbouncer -c "SHOW POOLS;"
```

The budget from design doc §9: `max_connections = 200`, 40 reserved for
operations and migrations, leaving **160 aggregate server connections across
all pooler replicas**. Pools multiply per replica — two replicas at
`default_pool_size: 60` is 120, not 60. Scaling poolers without dividing the
budget is how this breaks.

## Restore

Ordinary deletion and recovery are different problems. Restore only when data
is actually lost or corrupted.

```bash
# Point-in-time recovery into a NEW cluster. Never restore over the live one:
# it destroys the evidence of what went wrong.
kubectl apply -f - <<'YAML'
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: moat-postgres-recovery
spec:
  instances: 1
  bootstrap:
    recovery:
      source: moat-postgres
      recoveryTarget:
        targetTime: "2026-09-11 14:00:00+00"
  externalClusters:
    - name: moat-postgres
      barmanObjectStore:
        destinationPath: s3://moat-backups/postgres
        s3Credentials:
          accessKeyId: { name: moat-object-store, key: backup-access-key }
          secretAccessKey: { name: moat-object-store, key: backup-secret-key }
YAML
```

### Verify before cutting over

A restore is not finished when it completes; it is finished when it is
verified. Run the same checks the drill runs:

```bash
./scripts/restore-drill.sh   # against the recovered cluster
```

The two that matter most:

- **Row-level security policies present and FORCED.** A restore that loses
  policies leaves the application running normally with tenant isolation
  silently gone. This is the worst outcome in the system.
- **`audit_events` still has no UPDATE/DELETE for `moat_app`**, and
  `publications` is still SELECT-only.

### Reconcile after restore

Restoring the database alone leaves the system internally inconsistent with
everything else (design doc §10):

1. **Object storage** may hold files for rows that no longer exist, and rows
   may reference objects that were never written. Reconcile `source_objects`
   against the bucket.
2. **Search index** is derived — rebuild it rather than trusting it.
3. **Workflow state** in Temporal may reference jobs that rolled back. Jobs
   stuck `running` with no worker should be moved to `failed_jobs`.
4. **Outbound deliveries** (email, webhooks) may be re-sent. Receivers without
   deduplication will see duplicates; say so rather than claiming exactly-once.
5. **The DR region stays read-only until the old writer is fenced.** Two
   writers is worse than an outage.

## Targets (objectives, not guarantees)

| Scenario | Target |
| --- | --- |
| Same-region primary failure | Zero loss of synchronously acknowledged commits; service back within 5 minutes |
| Regional disaster | RPO ≤ 15 minutes, essential-service RTO ≤ 4 hours |

These are proposed objectives. They become commitments only after the drills in
design doc §13 phase 2 pass **on the declared production hardware** — a monthly
isolated restore and at least one regional failover exercise.

## Do not

- **Do not** restore over the live cluster.
- **Do not** skip the policy verification because the row counts matched. Data
  can be perfectly intact with isolation gone.
- **Do not** promote a DR region while the original primary may still accept
  writes.
