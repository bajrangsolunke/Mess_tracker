from sqlalchemy import select

from app.core.config import settings
from app.models import Organization, RefreshToken

REGISTER = {
    "mess_name": "Shree Mess",
    "owner_name": "Ramesh",
    "phone": "9876543210",
    "password": "owner123",
    "language": "mr",
    "invite_code": settings.owner_invite_code,
}


async def register(client, **overrides):
    return await client.post("/api/v1/auth/register-owner", json={**REGISTER, **overrides})


async def test_register_owner_creates_org_and_tokens(client, db):
    r = await register(client)
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["access_token"] and body["refresh_token"]
    assert body["user"]["role"] == "owner"
    assert body["user"]["phone"] == "9876543210"
    assert body["user"]["language"] == "mr"
    assert body["organization"]["name"] == "Shree Mess"
    assert body["organization"]["default_language"] == "mr"
    org = (await db.execute(select(Organization))).scalar_one()
    assert org.name == "Shree Mess"


async def test_register_requires_invite(client):
    r = await register(client, invite_code="nope")
    assert r.status_code == 403
    assert r.json()["code"] == "INVALID_INVITE"


async def test_register_duplicate_phone_same_mess_name_is_conflict(client):
    await register(client)
    r = await register(client)
    assert r.status_code == 409
    assert r.json()["code"] == "DUPLICATE_PHONE"


async def test_login_success_and_phone_normalized(client):
    await register(client)
    r = await client.post(
        "/api/v1/auth/login", json={"phone": "+91 98765 43210", "password": "owner123"}
    )
    assert r.status_code == 200, r.text
    assert r.json()["user"]["name"] == "Ramesh"


async def test_login_wrong_password(client):
    await register(client)
    r = await client.post("/api/v1/auth/login", json={"phone": "9876543210", "password": "bad"})
    assert r.status_code == 401
    assert r.json()["code"] == "INVALID_CREDENTIALS"


async def test_login_unknown_phone(client):
    r = await client.post("/api/v1/auth/login", json={"phone": "9000000000", "password": "x"})
    assert r.status_code == 401
    assert r.json()["code"] == "INVALID_CREDENTIALS"


async def test_refresh_rotates_and_old_token_rejected(client, db):
    tokens = (await register(client)).json()
    r = await client.post("/api/v1/auth/refresh", json={"refresh_token": tokens["refresh_token"]})
    assert r.status_code == 200, r.text
    new = r.json()
    assert new["refresh_token"] != tokens["refresh_token"]
    assert new["access_token"]
    again = await client.post(
        "/api/v1/auth/refresh", json={"refresh_token": tokens["refresh_token"]}
    )
    assert again.status_code == 401
    assert again.json()["code"] == "INVALID_REFRESH"
    rows = (await db.execute(select(RefreshToken))).scalars().all()
    assert sum(1 for t in rows if t.revoked_at is None) == 1


async def test_refresh_with_garbage_rejected(client):
    r = await client.post("/api/v1/auth/refresh", json={"refresh_token": "garbage"})
    assert r.status_code == 401
    assert r.json()["code"] == "INVALID_REFRESH"


async def test_logout_revokes_refresh(client):
    tokens = (await register(client)).json()
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}
    r = await client.post(
        "/api/v1/auth/logout", json={"refresh_token": tokens["refresh_token"]}, headers=headers
    )
    assert r.status_code == 204
    r = await client.post("/api/v1/auth/refresh", json={"refresh_token": tokens["refresh_token"]})
    assert r.status_code == 401


async def test_me_requires_token(client):
    r = await client.get("/api/v1/auth/me")
    assert r.status_code == 401
    assert r.json()["code"] == "NOT_AUTHENTICATED"


async def test_me_returns_user_and_org(client):
    tokens = (await register(client)).json()
    r = await client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {tokens['access_token']}"}
    )
    assert r.status_code == 200
    body = r.json()
    assert body["user"]["phone"] == "9876543210"
    assert body["organization"]["name"] == "Shree Mess"
    assert body["member"] is None


async def test_patch_me_changes_language_and_password(client):
    tokens = (await register(client)).json()
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}
    r = await client.patch(
        "/api/v1/auth/me",
        json={"language": "hi", "current_password": "owner123", "new_password": "newpass1"},
        headers=headers,
    )
    assert r.status_code == 200, r.text
    assert r.json()["user"]["language"] == "hi"
    ok = await client.post(
        "/api/v1/auth/login", json={"phone": "9876543210", "password": "newpass1"}
    )
    assert ok.status_code == 200
    bad = await client.post(
        "/api/v1/auth/login", json={"phone": "9876543210", "password": "owner123"}
    )
    assert bad.status_code == 401


async def test_patch_me_wrong_current_password(client):
    tokens = (await register(client)).json()
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}
    r = await client.patch(
        "/api/v1/auth/me",
        json={"current_password": "wrong", "new_password": "newpass1"},
        headers=headers,
    )
    assert r.status_code == 400
    assert r.json()["code"] == "WRONG_PASSWORD"
