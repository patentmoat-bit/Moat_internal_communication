"""Row policies and constraints for drawings

Revision ID: 0011_policies_drawings
Revises: b49840ab2569
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

revision: str = "0011_policies_drawings"
down_revision: str | None = "b49840ab2569"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None

APP_ROLE = "moat_app"
NEW_TABLES = ("drawings", "drawing_versions", "drawing_reviews")

STATUS_CONSTRAINTS = {
    "drawings": ("status", ("requested", "in_progress", "submitted", "approved", "rework")),
    "drawing_reviews": ("outcome", ("approved", "rework")),
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
        raise RuntimeError("Unaccounted tenant tables: " + ", ".join(sorted(missing)))

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

    # FIG. 0 does not exist, and figures are referenced by number throughout
    # the specification.
    op.execute(
        "ALTER TABLE drawings ADD CONSTRAINT ck_drawings_figure_positive "
        "CHECK (figure_number >= 1)"
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
    op.execute("ALTER TABLE drawings DROP CONSTRAINT IF EXISTS ck_drawings_figure_positive")
