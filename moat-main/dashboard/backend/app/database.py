from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession, AsyncEngine
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import JSON
from sqlalchemy.types import TypeDecorator
from sqlalchemy.dialects.postgresql import JSONB as PG_JSONB
from typing import AsyncGenerator

from app.config import settings


class DialectCompatibleJSON(TypeDecorator):
    impl = JSON
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == 'postgresql':
            return dialect.type_descriptor(PG_JSONB())
        else:
            return dialect.type_descriptor(JSON())


JSONB = DialectCompatibleJSON


if settings.DATABASE_URL.startswith("sqlite"):
    engine: AsyncEngine = create_async_engine(
        settings.DATABASE_URL,
        echo=False,
    )
else:
    engine: AsyncEngine = create_async_engine(
        settings.DATABASE_URL,
        echo=False,
        pool_size=20,
        max_overflow=10,
    )

async_session_factory: async_sessionmaker[AsyncSession] = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

AsyncSessionLocal = async_session_factory


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db() -> None:
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception as e:
        import logging
        logging.warning(f"Failed to initialize database: {e}")
