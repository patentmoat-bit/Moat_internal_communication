"""Row-level security, least-privilege grants and status constraints

Revision ID: 0002_tenant_isolation
Revises: 1b7250160424
Create Date: 2026-09-11

Tenant isolation is enforced in two independent places (design doc §5):

  1. The API resolves the caller's membership and never trusts a client-supplied
     tenant id.
  2. Postgres row policies filter every tenant-owned table against the
     transaction-local `app.tenant_id`.

Either alone is a single point of failure. The policies below are the second
layer, and the reason the application connects as a non-owner role that does
not hold BYPASSRLS.
"""
from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "0002_tenant_isolation"
down_revision: str | None = "1b7250160424"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None

APP_ROLE = "moat_app"

TENANT_OWNED_TABLES = (
    "inventions",
    "invention_versions",
    "invention_contributors",
    "analysis_runs",
    "analysis_concepts",
    "evidence_links",
    "submissions",
    "decisions",
    "comments",
    "notifications",
    "audit_events",
)

# Carries tenant_id, but a plain tenant policy would deadlock authentication:
# resolving a session yields the user, and only then can membership be read to
# discover which tenants that user may act in. So membership rows are visible
# either within their tenant OR to the user they belong to.
USER_SCOPED_TABLES = ("memberships",)

# The one deliberate exception. A session is looked up by the hash of an opaque
# bearer token before any identity is known, so no policy predicate can apply.
# It is protected instead by: a unique random token, only ever queried by exact
# hash, and no column that discloses another tenant's data.
UNPOLICIED_TENANT_TABLES = ("app_sessions",)

STATUS_CONSTRAINTS = {
    "inventions": (
        "status",
        ("draft", "submitted", "in_review", "approved", "returned", "filed"),
    ),
    "analysis_runs": (
        "status",
        ("queued", "running", "complete", "failed", "insufficient_evidence"),
    ),
    "decisions": ("outcome", ("approved", "returned", "rejected")),
    "submissions": ("state", ("open", "decided", "withdrawn")),
    "notifications": ("priority", ("low", "medium", "high", "urgent")),
}


def upgrade() -> None:
    conn = op.get_bind()

    # Guard against drift: a new table with tenant_id that nobody added to the
    # list above would otherwise ship with no policy at all.
    rows = conn.exec_driver_sql(
        """
        SELECT table_name FROM information_schema.columns
        WHERE table_schema = 'public' AND column_name = 'tenant_id'
        """
    ).fetchall()
    found = {row[0] for row in rows}
    accounted = set(TENANT_OWNED_TABLES) | set(USER_SCOPED_TABLES) | set(UNPOLICIED_TENANT_TABLES)
    missing = found - accounted
    if missing:
        raise RuntimeError(
            "Tables carry tenant_id but have no row policy: " + ", ".join(sorted(missing))
        )

    # A stable reader for the transaction-local tenant. NULLIF matters: an
    # unset setting reads as the empty string, and ''::uuid raises instead of
    # filtering. Returning NULL makes every comparison false, so a request with
    # no tenant context sees no rows -- the safe default.
    op.execute(
        """
        CREATE OR REPLACE FUNCTION app_current_tenant() RETURNS uuid
        LANGUAGE sql STABLE AS $$
            SELECT NULLIF(current_setting('app.tenant_id', true), '')::uuid
        $$
        """
    )
    op.execute(
        """
        CREATE OR REPLACE FUNCTION app_current_user() RETURNS uuid
        LANGUAGE sql STABLE AS $$
            SELECT NULLIF(current_setting('app.user_id', true), '')::uuid
        $$
        """
    )

    for table in TENANT_OWNED_TABLES:
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
        # FORCE applies the policy to the table owner as well. Without it, any
        # code that happens to connect as moat_owner silently bypasses
        # isolation, which is exactly the failure this layer exists to catch.
        op.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY")
        op.execute(
            f"""
            CREATE POLICY tenant_isolation ON {table}
                USING (tenant_id = app_current_tenant())
                WITH CHECK (tenant_id = app_current_tenant())
            """
        )

    for table in USER_SCOPED_TABLES:
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
        op.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY")
        op.execute(
            f"""
            CREATE POLICY tenant_or_own_membership ON {table}
                USING (
                    tenant_id = app_current_tenant()
                    OR user_id = app_current_user()
                )
                WITH CHECK (tenant_id = app_current_tenant())
            """
        )

    for table, (column, allowed) in STATUS_CONSTRAINTS.items():
        values = ", ".join(f"'{value}'" for value in allowed)
        op.execute(
            f"ALTER TABLE {table} ADD CONSTRAINT ck_{table}_{column}_allowed "
            f"CHECK ({column} IN ({values}))"
        )

    # Least privilege. The application role gets DML only; it can never alter
    # schema, and migrations are the only path that can.
    op.execute(f"GRANT USAGE ON SCHEMA public TO {APP_ROLE}")
    op.execute(f"GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO {APP_ROLE}")
    op.execute(f"GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO {APP_ROLE}")
    op.execute(f"GRANT EXECUTE ON FUNCTION app_current_tenant() TO {APP_ROLE}")
    op.execute(f"GRANT EXECUTE ON FUNCTION app_current_user() TO {APP_ROLE}")

    # Audit history is append-only from the application's side. This does not
    # make it immutable against a privileged operator -- signed export to a
    # separately controlled store is what covers that (design doc §6).
    op.execute(f"REVOKE UPDATE, DELETE ON audit_events FROM {APP_ROLE}")

    # Schema is never the application's to change, including migration state.
    op.execute(f"REVOKE ALL ON alembic_version FROM {APP_ROLE}")
    op.execute(f"GRANT SELECT ON alembic_version TO {APP_ROLE}")


def downgrade() -> None:
    for table in USER_SCOPED_TABLES:
        op.execute(f"DROP POLICY IF EXISTS tenant_or_own_membership ON {table}")
        op.execute(f"ALTER TABLE {table} NO FORCE ROW LEVEL SECURITY")
        op.execute(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY")

    for table in TENANT_OWNED_TABLES:
        op.execute(f"DROP POLICY IF EXISTS tenant_isolation ON {table}")
        op.execute(f"ALTER TABLE {table} NO FORCE ROW LEVEL SECURITY")
        op.execute(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY")

    for table, (column, _) in STATUS_CONSTRAINTS.items():
        op.execute(f"ALTER TABLE {table} DROP CONSTRAINT IF EXISTS ck_{table}_{column}_allowed")

    op.execute("DROP FUNCTION IF EXISTS app_current_tenant()")
    op.execute("DROP FUNCTION IF EXISTS app_current_user()")
