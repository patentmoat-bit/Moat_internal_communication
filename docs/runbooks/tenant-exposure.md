# Suspected cross-tenant exposure

**Severity: highest.** Nothing else in this system outranks it.

## Why

An unfiled invention disclosure is a trade secret whose entire value is that
nobody outside the company has seen it. A public disclosure destroys
patentability under §102 in the United States and absolute novelty in Europe.

A cross-tenant leak here is therefore not a privacy incident. It is the
destruction of a customer's patent rights, and it is not recoverable by
apologising, patching, or deleting the data afterwards.

## Immediate

1. **Preserve evidence before changing anything.** Audit events are
   append-only for the application role but can be exported:
   ```sql
   SELECT * FROM audit_events
   WHERE created_at > now() - interval '7 days'
   ORDER BY created_at;
   ```
2. **Establish scope from the audit trail, not from assumption.** Which actor,
   which tenant, which resources, which requests. Every audit row carries the
   request id.
3. **Revoke the sessions involved.** Takes effect on the next request:
   ```sql
   UPDATE app_sessions SET revoked_at = now()
   WHERE user_id = :suspect AND revoked_at IS NULL;
   ```
4. **Do not delete the exposed data.** It is evidence, and deleting it does not
   un-disclose anything.

## Verify whether isolation actually failed

Most reports are not leaks. Check the layer that cannot lie:

```bash
cd apps/api && uv run pytest tests/test_tenant_isolation.py -v
```

Then confirm the live database directly:

```sql
-- Every tenant-owned table must have a policy AND force it
SELECT relname, relrowsecurity, relforcerowsecurity
FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relkind = 'r'
  AND relname IN (SELECT table_name FROM information_schema.columns
                  WHERE column_name = 'tenant_id' AND table_schema = 'public');

-- The application role must not be able to bypass it
SELECT rolname, rolbypassrls FROM pg_roles WHERE rolname = 'moat_app';
```

Expected: `relforcerowsecurity` true for all except the three documented
exceptions (`app_sessions`, `outbox_events`, `consumer_receipts`), and
`rolbypassrls` false.

## The likely causes, in order

1. **A query that ran without tenant context**, in a code path using
   `unscoped_session()` where it should use `tenant_session()`. The row policy
   returns nothing rather than everything, so this usually presents as missing
   data — not as a leak.
2. **A connection reused across tenants with session-scoped context.** If
   anything ever uses `SET` instead of `SET LOCAL`, PgBouncer transaction
   pooling will hand that setting to the next tenant's request. Search for it:
   ```bash
   grep -rn "set_config" apps/api/src --include=*.py | grep -v "true)"
   ```
   Every call must pass `true` (transaction-local) as the third argument.
3. **A search result served from a stale ACL projection.** Private-corpus
   results are re-authorised against PostgreSQL before any passage is returned;
   confirm that path was not bypassed.
4. **A cache key missing its tenant component.** Keys must include tenant,
   actor scope, permission revision and corpus revision.

## After

- Write the specific failing case into `tests/test_tenant_isolation.py` before
  fixing it, so it can never regress silently.
- Notify affected customers with the actual scope from the audit trail. Under
  most IP engagement terms this is contractually required, and the damage is
  already done — understating it only adds a second problem.
