"""Several owners (e.g. brothers) each with their own login; logins work on many phones."""

from tests.factories import login, register_owner


async def add_owner(client, h, phone="9222222222", name="Suresh"):
    r = await client.post("/api/v1/owners", json={"name": name, "phone": phone}, headers=h)
    assert r.status_code == 201, r.text
    return r.json()


async def test_brother_gets_full_owner_access(client):
    h, _ = await register_owner(client)
    created = await add_owner(client, h)
    bh, body = await login(client, "9222222222", created["temp_password"])
    assert body["user"]["role"] == "owner" and body["user"]["must_change_password"] is True
    for path in ("/api/v1/members", "/api/v1/ledger?from=2026-10-01", "/api/v1/staff"):
        assert (await client.get(path, headers=bh)).status_code == 200, path
    r = await client.get("/api/v1/owners", headers=bh)
    assert [(o["name"], o["is_me"]) for o in r.json()] == [("Owner", False), ("Suresh", True)]


async def test_block_brother_but_not_yourself(client):
    h, me = await register_owner(client)
    created = await add_owner(client, h)
    bh, _ = await login(client, "9222222222", created["temp_password"])
    r = await client.patch(
        f"/api/v1/owners/{me['user']['id']}", json={"is_active": False}, headers=h
    )
    assert r.status_code == 422 and r.json()["code"] == "CANNOT_BLOCK_SELF"
    r = await client.patch(
        f"/api/v1/owners/{created['owner']['id']}", json={"is_active": False}, headers=h
    )
    assert r.json()["is_active"] is False
    assert (await client.get("/api/v1/members", headers=bh)).status_code == 401


async def test_owners_are_per_mess_and_owner_only(client):
    h, _ = await register_owner(client)
    h2, _ = await register_owner(client, phone="9876500000", mess_name="Other")
    created = await add_owner(client, h)
    r = await client.patch(
        f"/api/v1/owners/{created['owner']['id']}", json={"is_active": False}, headers=h2
    )
    assert r.status_code == 404
    r = await client.post(
        "/api/v1/staff",
        json={"name": "Ganesh", "phone": "9111111111", "monthly_salary": "9000"},
        headers=h,
    )
    sh, _ = await login(client, "9111111111", r.json()["temp_password"])
    assert (await client.get("/api/v1/owners", headers=sh)).status_code == 403
    r = await client.post("/api/v1/owners", json={"name": "X", "phone": "9111111111"}, headers=h)
    assert r.status_code == 409 and r.json()["code"] == "DUPLICATE_PHONE"


async def test_same_login_on_two_phones(client):
    await register_owner(client)
    a, _ = await login(client, "9876543210", "owner123")
    b, _ = await login(client, "9876543210", "owner123")
    assert (await client.get("/api/v1/auth/me", headers=a)).status_code == 200
    assert (await client.get("/api/v1/auth/me", headers=b)).status_code == 200
