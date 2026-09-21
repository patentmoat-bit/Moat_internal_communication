"""Row policy and constraints for claim set decisions

Revision ID: 0009_policies_claim_decisions
Revises: c3bfa3e15c2b
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

revision: str = "0009_policies_claim_decisions"
down_revision: str | None = "c3bfa3e15c2b"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None

APP_ROLE = "moat_app"
TABLE = "claim_set_decisions"


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

    op.execute(f"ALTER TABLE {TABLE} ENABLE ROW LEVEL SECURITY")
    op.execute(f"ALTER TABLE {TABLE} FORCE ROW LEVEL SECURITY")
    op.execute(
        f"""
        CREATE POLICY tenant_isolation ON {TABLE}
            USING (tenant_id = app_current_tenant())
            WITH CHECK (tenant_id = app_current_tenant())
        """
    )
    op.execute(
        f"ALTER TABLE {TABLE} ADD CONSTRAINT ck_{TABLE}_outcome_allowed "
        f"CHECK (outcome IN ('approved', 'returned'))"
    )

    op.execute(f"GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO {APP_ROLE}")
    op.execute(f"GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO {APP_ROLE}")
    op.execute(f"REVOKE UPDATE, DELETE ON audit_events FROM {APP_ROLE}")
    op.execute(f"REVOKE INSERT, UPDATE, DELETE ON publications FROM {APP_ROLE}")
    op.execute(f"REVOKE ALL ON alembic_version FROM {APP_ROLE}")
    op.execute(f"GRANT SELECT ON alembic_version TO {APP_ROLE}")


def downgrade() -> None:
    op.execute(f"DROP POLICY IF EXISTS tenant_isolation ON {TABLE}")
    op.execute(f"ALTER TABLE {TABLE} NO FORCE ROW LEVEL SECURITY")
    op.execute(f"ALTER TABLE {TABLE} DISABLE ROW LEVEL SECURITY")
    op.execute(f"ALTER TABLE {TABLE} DROP CONSTRAINT IF EXISTS ck_{TABLE}_outcome_allowed")
