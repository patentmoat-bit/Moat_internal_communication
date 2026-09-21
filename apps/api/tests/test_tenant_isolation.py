"""Tenant isolation at the database layer.

The API-level checks live in tests/integration/smoke_flow.py. These go under
the API and assert that PostgreSQL itself refuses cross-tenant access, because
that is the layer that still holds when application code has a bug.

An unfiled disclosure is a trade secret. A cross-tenant leak is not a privacy
incident here -- it is the destruction of a customer's patent rights.
"""

from __future__ import annotations

import uuid

import pytest
from sqlalchemy import text
from sqlalchemy.exc import ProgrammingError
from sqlalchemy.ext.asyncio import async_sessionmaker

from moat_api.db.models import TENANT_OWNED_TABLES, UNPOLICIED_TENANT_TABLES


async def _make_invention(session, tenant_id: uuid.UUID, user_id: uuid.UUID, ref: str) -> uuid.UUID:
    invention_id = uuid.uuid4()
    await session.execute(
        text(
            """
            INSERT INTO inventions
                (id, tenant_id, ref, title, summary, status, current_revision,
                 classifications, created_by_id, created_at, updated_at)
            VALUES (:id, :tenant, :ref, 'Secret mechanism', '', 'draft', 1,
                    '{}'::varchar[], :user, now(), now())
            """
        ),
        {"id": invention_id, "tenant": tenant_id, "ref": ref, "user": user_id},
    )
    return invention_id


async def test_every_tenant_table_has_row_security_enabled(engine):
    """Guards against a new table shipping without a policy."""
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as session:
        rows = (
            await session.execute(
                text(
                    """
                    SELECT relname, relrowsecurity, relforcerowsecurity
                    FROM pg_class
                    WHERE relnamespace = 'public'::regnamespace AND relkind = 'r'
                    """
                )
            )
        ).all()
    state = {name: (enabled, forced) for name, enabled, forced in rows}

    for table in TENANT_OWNED_TABLES:
        enabled, forced = state[table]
        assert enabled, f"{table} has no row-level security"
        # FORCE matters: without it, anything connecting as the table owner
        # silently bypasses isolation.
        assert forced, f"{table} does not FORCE row-level security"


async def test_documented_exceptions_are_still_the_only_exceptions(engine):
    """The unpolicied list must not quietly grow."""
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as session:
        rows = (
            await session.execute(
                text(
                    """
                    SELECT c.relname
                    FROM pg_class c
                    JOIN information_schema.columns i
                      ON i.table_name = c.relname AND i.column_name = 'tenant_id'
                    WHERE c.relnamespace = 'public'::regnamespace
                      AND c.relkind = 'r'
                      AND NOT c.relrowsecurity
                    """
                )
            )
        ).all()
    unprotected = {row[0] for row in rows}
    assert unprotected == set(UNPOLICIED_TENANT_TABLES), (
        "A table carrying tenant_id lost its policy, or gained an undocumented "
        f"exception: {unprotected ^ set(UNPOLICIED_TENANT_TABLES)}"
    )


async def test_application_role_cannot_bypass_row_security(engine):
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as session:
        bypass = (
            await session.execute(
                text("SELECT rolbypassrls FROM pg_roles WHERE rolname = 'moat_app'")
            )
        ).scalar_one()
    assert bypass is False, "The application role can bypass row security"


async def test_no_tenant_context_returns_no_rows(engine, tenant):
    """The safe default: an unauthenticated path sees nothing, not everything."""
    tenant_id, user_id = tenant
    factory = async_sessionmaker(engine, expire_on_commit=False)

    async with factory() as session, session.begin():
        await session.execute(
            text("SELECT set_config('app.tenant_id', :t, true)"), {"t": str(tenant_id)}
        )
        await _make_invention(session, tenant_id, user_id, f"ISO-{uuid.uuid4().hex[:8]}")

    async with factory() as session, session.begin():
        # Deliberately no tenant context set.
        count = (
            await session.execute(text("SELECT count(*) FROM inventions"))
        ).scalar_one()
        assert count == 0

    async with factory() as session, session.begin():
        await session.execute(
            text("SELECT set_config('app.tenant_id', :t, true)"), {"t": str(tenant_id)}
        )
        await session.execute(text("DELETE FROM inventions WHERE tenant_id = :t"), {"t": tenant_id})


async def test_one_tenant_cannot_read_another(engine, tenant):
    tenant_a, user_a = tenant
    tenant_b = uuid.uuid4()
    factory = async_sessionmaker(engine, expire_on_commit=False)

    async with factory() as session, session.begin():
        await session.execute(
            text("INSERT INTO tenants (id, slug, name, is_active) VALUES (:id, :s, 'B', true)"),
            {"id": tenant_b, "s": f"b{tenant_b.hex[:10]}"},
        )
        await session.execute(
            text("SELECT set_config('app.tenant_id', :t, true)"), {"t": str(tenant_a)}
        )
        invention_id = await _make_invention(
            session, tenant_a, user_a, f"ISO-{uuid.uuid4().hex[:8]}"
        )

    async with factory() as session, session.begin():
        await session.execute(
            text("SELECT set_config('app.tenant_id', :t, true)"), {"t": str(tenant_b)}
        )
        # Even naming the exact primary key returns nothing.
        found = (
            await session.execute(
                text("SELECT count(*) FROM inventions WHERE id = :id"), {"id": invention_id}
            )
        ).scalar_one()
        assert found == 0

    async with factory() as session, session.begin():
        await session.execute(
            text("SELECT set_config('app.tenant_id', :t, true)"), {"t": str(tenant_a)}
        )
        await session.execute(text("DELETE FROM inventions WHERE tenant_id = :t"), {"t": tenant_a})
        await session.execute(text("DELETE FROM tenants WHERE id = :t"), {"t": tenant_b})


async def test_cannot_write_a_row_into_another_tenant(engine, tenant):
    """WITH CHECK, not just USING: a forged tenant_id on INSERT is refused."""
    tenant_a, user_a = tenant
    other = uuid.uuid4()
    factory = async_sessionmaker(engine, expire_on_commit=False)

    async with factory() as session, session.begin():
        await session.execute(
            text("SELECT set_config('app.tenant_id', :t, true)"), {"t": str(tenant_a)}
        )
        with pytest.raises(ProgrammingError, match="row-level security"):
            await _make_invention(session, other, user_a, f"ISO-{uuid.uuid4().hex[:8]}")


async def test_audit_events_cannot_be_rewritten_by_the_application(engine):
    """Append-only for the application role. Not immutable against a
    privileged operator -- signed export covers that -- but application code
    cannot rewrite history."""
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as session:
        privileges = {
            row[0]
            for row in (
                await session.execute(
                    text(
                        """
                        SELECT privilege_type FROM information_schema.table_privileges
                        WHERE grantee = 'moat_app' AND table_name = 'audit_events'
                        """
                    )
                )
            ).all()
        }
    assert "INSERT" in privileges
    assert "SELECT" in privileges
    assert "UPDATE" not in privileges
    assert "DELETE" not in privileges


async def test_corpus_is_read_only_for_the_application(engine):
    """Public art is written by import jobs under separate credentials."""
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as session:
        privileges = {
            row[0]
            for row in (
                await session.execute(
                    text(
                        """
                        SELECT privilege_type FROM information_schema.table_privileges
                        WHERE grantee = 'moat_app' AND table_name = 'publications'
                        """
                    )
                )
            ).all()
        }
    assert privileges == {"SELECT"}, privileges
