from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import StaticPool

from app.config import get_settings


class Base(DeclarativeBase):
    pass


def _engine_kwargs(url: str) -> dict:
    if url.startswith("sqlite"):
        # In-memory SQLite (tests) needs a single shared connection.
        return {"connect_args": {"check_same_thread": False}, "poolclass": StaticPool}
    # Neon (and most managed Postgres) require TLS; asyncpg's connect() takes
    # `ssl`, not the `sslmode` query param Neon's connection string uses —
    # strip sslmode/channel_binding from DATABASE_URL at the env-var level and
    # supply ssl=require here instead.
    return {"pool_pre_ping": True, "connect_args": {"ssl": "require"}}


_settings = get_settings()
engine = create_async_engine(_settings.database_url, **_engine_kwargs(_settings.database_url))
SessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as session:
        yield session


async def create_all() -> None:
    from app.domain import models  # noqa: F401  (register mappings)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def drop_all() -> None:
    from app.domain import models  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
