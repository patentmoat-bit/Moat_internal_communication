"""Row policies and grants for the execution and upload tables

Revision ID: 0005_policies_execution
Revises: 1f6ac15a80b8
Create Date: 2026-09-11

Extends the two-layer isolation from 0002 to every table added for jobs,
uploads and extraction, and re-asserts the drift guard against the live schema
so the next tenant-owned table cannot ship without a policy either.
"""
from __future__ import annotations

from collections.abc import Sequence

from alembic import op

from moat_api.db.models import (
    TENANT_OWNED_TABLES,
    UNPOLICIED_TENANT_TABLES,
    USER_SCOPED_TABLES,
)

revision: str = "0005_policies_execution"
down_revision: str | None = "1f6ac15a80b8"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None

APP_ROLE = "moat_app"

# Added by the previous migration in this pair; 0002 already covered the rest.
NEW_POLICIED_TABLES = (
    "jobs",
    "job_attempts",
    "failed_jobs",
    "upload_sessions",
    "source_objects",
    "extraction_artifacts",
)

STATUS_CONSTRAINTS = {
    "jobs": ("status", ("queued", "running", "succeeded", "failed", "cancelled")),
    "upload_sessions": ("state", ("reserved", "uploaded", "verified", "rejected", "expired")),
    "source_objects": (
        "state",
        ("quarantined", "scanning", "extracting", "ready", "rejected"),
    ),
    "index_manifests": ("state", ("building", "active", "superseded", "failed")),
}


def upgrade() -> None:
    conn = op.get_bind()

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
            "Tables carry tenant_id but are not accounted for in "
            "moat_api.db.models: " + ", ".join(sorted(missing))
        )

    for table in NEW_POLICIED_TABLES:
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
        op.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY")
        op.execute(
            f"""
            CREATE POLICY tenant_isolation ON {table}
                USING (tenant_id = app_current_tenant())
                WITH CHECK (tenant_id = app_current_tenant())
            """
        )

    for table, (column, allowed) in STATUS_CONSTRAINTS.items():
        values = ", ".join(f"'{value}'" for value in allowed)
        op.execute(
            f"ALTER TABLE {table} ADD CONSTRAINT ck_{table}_{column}_allowed "
            f"CHECK ({column} IN ({values}))"
        )

    # Newly created tables need the same least-privilege grants as the rest.
    op.execute(f"GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO {APP_ROLE}")
    op.execute(f"GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO {APP_ROLE}")
    op.execute(f"REVOKE UPDATE, DELETE ON audit_events FROM {APP_ROLE}")
    op.execute(f"REVOKE ALL ON alembic_version FROM {APP_ROLE}")
    op.execute(f"GRANT SELECT ON alembic_version TO {APP_ROLE}")

    # The corpus and its manifests are written by import jobs under separate
    # credentials, never by a request handler.
    op.execute(f"REVOKE INSERT, UPDATE, DELETE ON publications FROM {APP_ROLE}")


def downgrade() -> None:
    for table in NEW_POLICIED_TABLES:
        op.execute(f"DROP POLICY IF EXISTS tenant_isolation ON {table}")
        op.execute(f"ALTER TABLE {table} NO FORCE ROW LEVEL SECURITY")
        op.execute(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY")
    for table, (column, _) in STATUS_CONSTRAINTS.items():
        op.execute(f"ALTER TABLE {table} DROP CONSTRAINT IF EXISTS ck_{table}_{column}_allowed")
