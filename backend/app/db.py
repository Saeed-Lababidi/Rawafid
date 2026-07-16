from collections.abc import AsyncGenerator
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import StaticPool

from app.config import get_settings


class Base(DeclarativeBase):
    pass


# libpq query params that asyncpg's connect() does not accept as kwargs.
_LIBPQ_ONLY_PARAMS = {"sslmode", "channel_binding", "sslrootcert", "sslcert", "sslkey", "options"}


def _normalize_db_url(url: str) -> str:
    """Coerce a managed-Postgres URL into an asyncpg-compatible one.

    Neon hands out `postgresql://…?sslmode=require&channel_binding=require`. A bare
    `postgresql://`/`postgres://` scheme makes SQLAlchemy load its default *sync*
    driver (psycopg2, not installed) instead of asyncpg — force `+asyncpg`. asyncpg's
    connect() also rejects libpq query params like sslmode; strip them (TLS is supplied
    via connect_args ssl=require in _engine_kwargs).
    """
    if url.startswith("sqlite"):
        return url
    if url.startswith("postgres://"):
        url = "postgresql+asyncpg://" + url[len("postgres://") :]
    elif url.startswith("postgresql://"):
        url = "postgresql+asyncpg://" + url[len("postgresql://") :]
    parts = urlsplit(url)
    if parts.query:
        kept = [
            (k, v)
            for k, v in parse_qsl(parts.query, keep_blank_values=True)
            if k.lower() not in _LIBPQ_ONLY_PARAMS
        ]
        url = urlunsplit(parts._replace(query=urlencode(kept)))
    return url


def _engine_kwargs(url: str) -> dict:
    if url.startswith("sqlite"):
        # In-memory SQLite (tests) needs a single shared connection.
        return {"connect_args": {"check_same_thread": False}, "poolclass": StaticPool}
    # Neon (and most managed Postgres) require TLS; asyncpg's connect() takes
    # `ssl`, not the `sslmode` query param — supply ssl=require here (the param
    # itself is stripped from the URL by _normalize_db_url).
    return {"pool_pre_ping": True, "connect_args": {"ssl": "require"}}


_settings = get_settings()
_db_url = _normalize_db_url(_settings.database_url)
engine = create_async_engine(_db_url, **_engine_kwargs(_db_url))
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
