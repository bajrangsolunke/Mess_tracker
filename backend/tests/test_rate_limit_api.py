"""Password / setup-code guessing is slowed down: 5 wrong per phone, 20 per IP, 15 minutes."""

from sqlalchemy import text

from app.core.config import settings
from tests.factories import create_member, create_plan, register_owner

PHONE, GOOD = "9876543210", "owner123"


async def attempt(client, password, phone=PHONE):
    return await client.post("/api/v1/auth/login", json={"phone": phone, "password": password})


async def test_five_wrong_passwords_lock_the_number(client, db):
    await register_owner(client)
    for i in range(5):
        assert (await attempt(client, f"wrong{i}")).status_code == 401
    r = await attempt(client, "wrong5")
    assert r.status_code == 429 and r.json()["code"] == "TOO_MANY_ATTEMPTS"
    assert int(r.headers["retry-after"]) > 0 and r.json()["retry_after"] > 0
    # even the right password waits, so guessing cannot continue
    assert (await attempt(client, GOOD)).status_code == 429
    # 15 minutes later it works again
    await db.execute(text("UPDATE failed_attempts SET created_at = now() - interval '16 minutes'"))
    assert (await attempt(client, GOOD)).status_code == 200


async def test_correct_login_resets_the_count(client):
    await register_owner(client)
    for i in range(4):
        await attempt(client, f"wrong{i}")
    assert (await attempt(client, GOOD)).status_code == 200
    for i in range(4):
        assert (await attempt(client, f"again{i}")).status_code == 401
    assert (await attempt(client, GOOD)).status_code == 200


async def test_one_address_trying_many_numbers_is_stopped(client):
    for i in range(20):
        await attempt(client, "x" * 6, phone=f"98000000{i:02d}")
    r = await attempt(client, "x" * 6, phone="9811111111")
    assert r.status_code == 429


async def test_setup_code_guessing_is_limited(client):
    body = {
        "mess_name": "Test Mess",
        "owner_name": "O",
        "phone": "9800000001",
        "password": "secret12",
        "language": "mr",
    }
    for i in range(5):
        r = await client.post(
            "/api/v1/auth/register-owner", json={**body, "invite_code": f"wrong-guess-{i}"}
        )
        assert r.status_code == 403
    r = await client.post(
        "/api/v1/auth/register-owner", json={**body, "invite_code": settings.owner_invite_code}
    )
    assert r.status_code == 429


async def test_current_password_guessing_is_limited(client):
    h, _ = await register_owner(client)
    for i in range(5):
        r = await client.patch(
            "/api/v1/auth/me",
            json={"current_password": f"bad{i}xx", "new_password": "newpass1"},
            headers=h,
        )
        assert r.status_code == 400
    r = await client.patch(
        "/api/v1/auth/me", json={"current_password": GOOD, "new_password": "newpass1"}, headers=h
    )
    assert r.status_code == 429


async def test_temporary_passwords_are_8_digits(client):
    h, _ = await register_owner(client)
    plan = await create_plan(client, h)
    m = await create_member(client, h, plan["id"])
    assert len(m["temp_password"]) == 8 and m["temp_password"].isdigit()


async def test_api_security_headers(client):
    r = await client.get("/api/v1/members")
    assert r.headers["x-content-type-options"] == "nosniff"
    assert r.headers["x-frame-options"] == "DENY"
    assert r.headers["cache-control"] == "no-store"
