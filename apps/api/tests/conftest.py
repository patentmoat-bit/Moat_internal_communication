from __future__ import annotations

import uuid

import pytest
import pytest_asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from moat_api.auth.sessions import Principal
from moat_api.core.config import get_settings

settings = get_settings()


@pytest_asyncio.fixture
async def engine():
    # Tests connect as the owner so they can create and clean their own
    # fixtures. Row policies still apply (FORCE is on), so a test that forgets
    # tenant context fails the same way production code would.
    engine = create_async_engine(settings.migration_dsn)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture
async def tenant(engine):
    """A throwaway tenant, removed afterwards."""
    factory = async_sessionmaker(engine, expire_on_commit=False)
    tenant_id = uuid.uuid4()
    user_id = uuid.uuid4()

    async with factory() as session, session.begin():
        await session.execute(
            text(
                "INSERT INTO tenants (id, slug, name, is_active) "
                "VALUES (:id, :slug, :name, true)"
            ),
            {"id": tenant_id, "slug": f"t{tenant_id.hex[:10]}", "name": "Test Tenant"},
        )
        await session.execute(
            text(
                "INSERT INTO users (id, email, name, is_active) "
                "VALUES (:id, :email, 'Test User', true)"
            ),
            {"id": user_id, "email": f"{user_id.hex[:12]}@test.example"},
        )

    yield tenant_id, user_id

    async with factory() as session, session.begin():
        await session.execute(
            text("SELECT set_config('app.tenant_id', :t, true)"), {"t": str(tenant_id)}
        )
        await session.execute(text("DELETE FROM jobs WHERE tenant_id = :t"), {"t": tenant_id})
        await session.execute(
            text("DELETE FROM outbox_events WHERE tenant_id = :t"), {"t": tenant_id}
        )
        await session.execute(text("DELETE FROM users WHERE id = :u"), {"u": user_id})
        await session.execute(text("DELETE FROM tenants WHERE id = :t"), {"t": tenant_id})


@pytest.fixture
def principal(tenant) -> Principal:
    tenant_id, user_id = tenant
    return Principal(
        user_id=user_id,
        user_name="Test User",
        user_email="test@test.example",
        tenant_id=tenant_id,
        tenant_slug="test",
        tenant_name="Test Tenant",
        membership_id=uuid.uuid4(),
        membership_revision=1,
        roles=frozenset({"researcher"}),
        permissions=frozenset(),
        session_id=uuid.uuid4(),
    )


@pytest_asyncio.fixture
async def session(engine, tenant):
    """A tenant-scoped transaction, rolled back after the test."""
    tenant_id, user_id = tenant
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as session:
        await session.execute(
            text("SELECT set_config('app.tenant_id', :t, true)"), {"t": str(tenant_id)}
        )
        await session.execute(
            text("SELECT set_config('app.user_id', :u, true)"), {"u": str(user_id)}
        )
        yield session
        await session.rollback()
