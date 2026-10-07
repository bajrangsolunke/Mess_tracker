import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from app.core.config import settings
from app.db.base import Base
from app.db.session import get_session
from app.main import app

# Tests opt in to automatic absent marking explicitly (see test_auto_absent_api.py).
settings.auto_close_meals = False

TEST_DB_URL = settings.database_url.rsplit("/", 1)[0] + "/mess_test"


def _admin_url() -> str:
    return settings.database_url.rsplit("/", 1)[0] + "/postgres"


async def _ensure_test_db() -> None:
    engine = create_async_engine(_admin_url(), isolation_level="AUTOCOMMIT")
    async with engine.connect() as conn:
        exists = await conn.execute(text("select 1 from pg_database where datname = 'mess_test'"))
        if exists.scalar() is None:
            await conn.execute(text("create database mess_test"))
    await engine.dispose()


@pytest.fixture(scope="session")
async def engine():
    await _ensure_test_db()
    engine = create_async_engine(TEST_DB_URL)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest.fixture
async def db(engine):
    """A session wrapped in an outer transaction that is rolled back after each test."""
    async with engine.connect() as conn:
        trans = await conn.begin()
        session = AsyncSession(
            bind=conn, expire_on_commit=False, join_transaction_mode="create_savepoint"
        )
        try:
            yield session
        finally:
            await session.close()
            await trans.rollback()


@pytest.fixture
async def client(db):
    async def _override():
        yield db

    app.dependency_overrides[get_session] = _override
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()
