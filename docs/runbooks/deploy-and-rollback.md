# Deploy and rollback

## How a deploy works

1. CI builds one image per component, produces an SBOM, scans it, and pushes
   **by digest**. Tags move; digests do not, which is why the chart prefers a
   digest — two replicas of a deployment must never run different code.
2. The same digest is promoted through staging to production. Nothing is
   rebuilt between environments.
3. The Helm `pre-upgrade` hook runs `alembic upgrade head` as the schema owner,
   directly against PostgreSQL. The pooled application DSN cannot create
   schema, and transaction pooling breaks Alembic's advisory lock.
4. Rolling update with `maxUnavailable: 0`: capacity never dips mid-deploy.

## Expand/contract migrations are not optional

During any rolling update, old and new code run against the same schema
simultaneously. A migration that drops or renames a column in the same release
that stops using it will break the replicas that have not rolled yet.

Three releases, not one:

| Release | Migration | Code |
| --- | --- | --- |
| 1 | Add the new column, nullable | Write both, read old |
| 2 | Backfill | Read new |
| 3 | Drop the old column | — |

## Rolling back

```bash
helm rollback moat <revision>
```

**What a rollback does not undo:**

- **Migrations.** Schema changes are forward-only in practice. Rolling the app
  back to code that predates a migration works only if the migration was
  expand-phase (additive). This is the reason for the three-release rule above.
- **Workflow histories.** Long-running Temporal workflows were started by the
  new worker version. Rolling workers back to code whose activity signatures
  differ produces non-deterministic replay errors. Check for in-flight
  workflows first:
  ```bash
  kubectl exec deploy/moat-api -- temporal workflow list \
    --query 'ExecutionStatus="Running"' --address $MOAT_TEMPORAL_ADDRESS
  ```
- **Data written by the new version.**

A web-tier rollback alone is usually safe and is usually enough.

## Verify after deploying

```bash
kubectl exec deploy/moat-api -- curl -s localhost:8000/api/ready | jq
npm run test:smoke          # against staging, never production
kubectl exec deploy/moat-api -- curl -s localhost:8000/api/metrics \
  | grep -E 'moat_http_requests_total.*status="5'
```

Watch for ten minutes: the error-budget alert has a 10-minute window, so a
deploy that breaks something will not page instantly.

## Configuration that fails the deploy on purpose

`Settings.validate_for_env` refuses to start when `MOAT_ENV=production` and any
of these hold:

- `auth_mode` is not `oidc`
- `cookie_secure` is false
- the session secret is still a development value
- `web_origin` is http rather than https
- OIDC issuer or client id is missing

A crash-looping pod after a config change is almost always this, and the log
line names the specific problem. It is deliberate — each of these is invisible
until exploited.
