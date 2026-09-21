from __future__ import annotations

import uuid
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from moat_api.core.config import get_settings

settings = get_settings()

# NullPool is deliberate: PgBouncer owns pooling (design doc §9). A second
# pool in the application would multiply server connections past the budget.
engine = create_async_engine(
    settings.database_dsn,
    echo=False,
    pool_pre_ping=True,
    # Server-side prepared statements break under PgBouncer transaction mode.
    connect_args={"prepare_threshold": None},
)

SessionFactory = async_sessionmaker(engine, expire_on_commit=False, autoflush=False)


@asynccontextmanager
async def tenant_session(
    tenant_id: uuid.UUID | None,
    user_id: uuid.UUID | None = None,
) -> AsyncIterator[AsyncSession]:
    """A transaction with the tenant context Postgres row policies read.

    `SET LOCAL` is required rather than `SET`: PgBouncer in transaction mode
    hands the same server connection to a different tenant's request as soon as
    this transaction ends, and a session-scoped setting would leak across that
    boundary. Transaction-scoped settings are discarded at COMMIT or ROLLBACK.

    Passing tenant_id=None leaves no tenant context set, so tenant-owned tables
    return nothing. That is the safe default, not an error: unauthenticated
    requests must not see rows.
    """
    async with SessionFactory() as session, session.begin():
        await session.execute(
            text("SELECT set_config('app.tenant_id', :tenant, true)"),
            {"tenant": str(tenant_id) if tenant_id else ""},
        )
        await session.execute(
            text("SELECT set_config('app.user_id', :actor, true)"),
            {"actor": str(user_id) if user_id else ""},
        )
        yield session


@asynccontextmanager
async def unscoped_session() -> AsyncIterator[AsyncSession]:
    """For rows that are not tenant-owned: sessions, users, tenant lookup.

    Used by authentication, which must resolve who is calling before any tenant
    context exists. Never use it to reach tenant-owned tables.
    """
    async with SessionFactory() as session, session.begin():
        yield session
