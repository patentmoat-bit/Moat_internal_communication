"""Row policies, grants and constraints for the drafting tables

Revision ID: 0007_policies_drafting
Revises: revision: str = '0b64c6587118'
Create Date: 2026-09-11
"""
from __future__ import annotations

from collections.abc import Sequence

from alembic import op

from moat_api.db.models import (
    TENANT_OWNED_TABLES,
    UNPOLICIED_TENANT_TABLES,
    USER_SCOPED_TABLES,
)

revision: str = "0007_policies_drafting"
down_revision: str | None = "0b64c6587118"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None

APP_ROLE = "moat_app"

NEW_TABLES = (
    "documents",
    "document_versions",
    "claim_sets",
    "claims",
    "claim_dependencies",
)

STATUS_CONSTRAINTS = {
    "documents": ("status", ("drafting", "in_review", "approved", "filed", "abandoned")),
    "claim_sets": ("status", ("draft", "submitted", "approved", "superseded")),
    "claims": ("kind", ("independent", "dependent")),
}


def upgrade() -> None:
    conn = op.get_bind()

    rows = conn.exec_driver_sql(
        """
        SELECT table_name FROM information_schema.columns
        WHERE table_schema = 'public' AND column_name = 'tenant_id'
        """
    ).fetchall()
    accounted = set(TENANT_OWNED_TABLES) | set(USER_SCOPED_TABLES) | set(UNPOLICIED_TENANT_TABLES)
    missing = {row[0] for row in rows} - accounted
    if missing:
        raise RuntimeError(
            "Tables carry tenant_id but are unaccounted for: " + ", ".join(sorted(missing))
        )

    for table in NEW_TABLES:
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

    # Claim numbering starts at 1. Claim 0 does not exist in any jurisdiction,
    # and a zero would quietly break "depends on a lower-numbered claim".
    op.execute("ALTER TABLE claims ADD CONSTRAINT ck_claims_number_positive CHECK (number >= 1)")

    # A claim cannot depend on itself. The application also rejects longer
    # cycles, but the trivial case is cheap to enforce here and can never be
    # reached by a bug.
    op.execute(
        "ALTER TABLE claim_dependencies ADD CONSTRAINT ck_claim_dependencies_not_self "
        "CHECK (claim_id <> parent_claim_id)"
    )

    op.execute(f"GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO {APP_ROLE}")
    op.execute(f"GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO {APP_ROLE}")
    op.execute(f"REVOKE UPDATE, DELETE ON audit_events FROM {APP_ROLE}")
    op.execute(f"REVOKE INSERT, UPDATE, DELETE ON publications FROM {APP_ROLE}")
    op.execute(f"REVOKE ALL ON alembic_version FROM {APP_ROLE}")
    op.execute(f"GRANT SELECT ON alembic_version TO {APP_ROLE}")


def downgrade() -> None:
    for table in NEW_TABLES:
        op.execute(f"DROP POLICY IF EXISTS tenant_isolation ON {table}")
        op.execute(f"ALTER TABLE {table} NO FORCE ROW LEVEL SECURITY")
        op.execute(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY")
    for table, (column, _) in STATUS_CONSTRAINTS.items():
        op.execute(f"ALTER TABLE {table} DROP CONSTRAINT IF EXISTS ck_{table}_{column}_allowed")
    op.execute("ALTER TABLE claims DROP CONSTRAINT IF EXISTS ck_claims_number_positive")
    op.execute(
        "ALTER TABLE claim_dependencies DROP CONSTRAINT IF EXISTS ck_claim_dependencies_not_self"
    )
