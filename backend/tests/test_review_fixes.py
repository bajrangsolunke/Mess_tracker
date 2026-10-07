"""Regression tests from the Phase 0/1 whole-branch review."""

import asyncio

import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.core.config import Settings
from app.core.errors import ApiError
from app.core.phone import normalize_phone
from app.core.security import hash_password, hash_token, new_refresh_token
from app.models import Language, Organization, RefreshToken, User, UserRole
from app.services.auth import rotate_refresh
from tests.test_auth_api import REGISTER, register

# --- Finding 1: validation errors must be 422, never 500 ---------------------


async def test_bad_phone_on_login_is_422(client):
    r = await client.post("/api/v1/auth/login", json={"phone": "123", "password": "x"})
    assert r.status_code == 422
    body = r.json()
    assert body["code"] == "VALIDATION_ERROR"
    assert body["errors"][0]["loc"] == ["body", "phone"]


async def test_bad_phone_on_register_is_422(client):
    r = await register(client, phone="abc")
    assert r.status_code == 422
    assert r.json()["code"] == "VALIDATION_ERROR"


# --- Finding 3: bcrypt 72-byte limit --------------------------------------------


async def test_long_multibyte_password_is_422_not_500(client):
    r = await register(client, password="पासवर्ड" * 5)  # 35 chars, >72 bytes
    assert r.status_code == 422
    assert r.json()["code"] == "VALIDATION_ERROR"


# --- Finding 4: phone normalization hardening ----------------------------------


@pytest.mark.parametrize("raw", ["९८७६५४३२१०", "0000000000", "1234567890", "", "abcdefghij"])
def test_normalize_phone_rejects_invalid(raw):
    with pytest.raises(ValueError):
        normalize_phone(raw)


def test_normalize_phone_strips_0091():
    assert normalize_phone("0091 98765 43210") == "9876543210"


# --- Finding 2: refresh rotation must be atomic under concurrency ---------------


async def test_concurrent_refresh_only_one_wins(engine):
    """Two sessions rotate the same refresh token; the second must get 401 even when
    the first has not yet committed when it starts (row lock / atomic update)."""
    maker = async_sessionmaker(engine, expire_on_commit=False)
    raw, hashed = new_refresh_token()
    async with maker() as setup:
        org = Organization(name="Race Org", default_language=Language.en)
        setup.add(org)
        await setup.flush()
        user = User(
            organization_id=org.id,
            phone="9111111111",
            name="R",
            password_hash=hash_password("x"),
            role=UserRole.owner,
        )
        setup.add(user)
        await setup.flush()
        from datetime import UTC, datetime, timedelta

        setup.add(
            RefreshToken(
                user_id=user.id,
                token_hash=hashed,
                expires_at=datetime.now(UTC) + timedelta(days=1),
            )
        )
        await setup.commit()
        org_id = org.id

    try:
        a: AsyncSession = maker()
        b: AsyncSession = maker()
        await rotate_refresh(a, raw)  # A holds the row, uncommitted

        async def b_rotate():
            try:
                await rotate_refresh(b, raw)
                return "ok"
            except ApiError as e:
                return e.code

        task = asyncio.create_task(b_rotate())
        await asyncio.sleep(0.2)
        await a.commit()
        result = await asyncio.wait_for(task, timeout=5)
        await b.rollback()
        await a.close()
        await b.close()
        assert result == "INVALID_REFRESH"
    finally:
        async with maker() as cleanup:
            from sqlalchemy import delete

            await cleanup.execute(delete(Organization).where(Organization.id == org_id))
            await cleanup.commit()


# --- Finding 6: logout must work without a valid access token -----------------


async def test_logout_without_access_token_revokes_refresh(client):
    tokens = (await register(client)).json()
    r = await client.post("/api/v1/auth/logout", json={"refresh_token": tokens["refresh_token"]})
    assert r.status_code == 204
    r = await client.post("/api/v1/auth/refresh", json={"refresh_token": tokens["refresh_token"]})
    assert r.status_code == 401


# --- Finding 8: insecure defaults refused in production -------------------------


def test_production_rejects_default_secrets():
    with pytest.raises(ValueError):
        Settings(env="production", _env_file=None)
    with pytest.raises(ValueError):
        Settings(env="production", jwt_secret="x" * 40, owner_invite_code="letmein", _env_file=None)
    ok = Settings(
        env="production", jwt_secret="x" * 40, owner_invite_code="s3cret-invite", _env_file=None
    )
    assert ok.env == "production"


# --- Finding 9: Render-style postgres:// URL is rewritten for asyncpg ------------


def test_database_url_rewritten_for_asyncpg():
    s = Settings(database_url="postgres://u:p@host/db", _env_file=None)
    assert s.database_url == "postgresql+asyncpg://u:p@host/db"
    s = Settings(database_url="postgresql://u:p@host/db", _env_file=None)
    assert s.database_url == "postgresql+asyncpg://u:p@host/db"


# --- Finding 10: unknown phone still 401, inactive user 401 after password check -


async def test_inactive_user_login_401(client, db):
    tokens = (await register(client)).json()
    user = await db.get(User, tokens["user"]["id"])
    user.is_active = False
    await db.flush()
    r = await client.post(
        "/api/v1/auth/login", json={"phone": REGISTER["phone"], "password": REGISTER["password"]}
    )
    assert r.status_code == 401
    assert r.json()["code"] == "INVALID_CREDENTIALS"


def test_hash_token_is_stable():
    assert hash_token("a") == hash_token("a")


# --- Deploy: Neon connection strings and production docs ------------------------


def test_neon_url_sslmode_converted_for_asyncpg():
    s = Settings(
        database_url="postgresql://u:p@ep-x.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
        _env_file=None,
    )
    assert (
        s.database_url
        == "postgresql+asyncpg://u:p@ep-x.ap-southeast-1.aws.neon.tech/neondb?ssl=require"
    )


def test_plain_url_untouched():
    s = Settings(database_url="postgresql+asyncpg://mess:mess@localhost:5434/mess", _env_file=None)
    assert s.database_url == "postgresql+asyncpg://mess:mess@localhost:5434/mess"


def test_docs_hidden_in_production():
    from app.main import create_app

    prod = Settings(
        env="production", jwt_secret="x" * 40, owner_invite_code="s3cret-invite", _env_file=None
    )
    assert create_app(prod).docs_url is None and create_app(prod).openapi_url is None
    assert create_app(Settings(_env_file=None)).docs_url == "/docs"
