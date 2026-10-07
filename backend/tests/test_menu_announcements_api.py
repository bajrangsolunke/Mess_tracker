from tests.factories import create_member, create_plan, login, register_owner


async def setup(client):
    h, _ = await register_owner(client)
    plan = await create_plan(client, h)
    m = await create_member(client, h, plan["id"], phone="9000000011", name="Rahul")
    ch, _ = await login(client, "9000000011", m["temp_password"])
    return h, ch


async def test_menu_put_and_get_range(client):
    h, ch = await setup(client)
    r = await client.put(
        "/api/v1/menus",
        json={
            "date": "2026-10-07",
            "meal_type": "lunch",
            "items": ["Dal", "Rice", "Chapati", "Bhaji"],
        },
        headers=h,
    )
    assert r.status_code == 200, r.text
    assert r.json()["items"] == ["Dal", "Rice", "Chapati", "Bhaji"]
    r = await client.put(
        "/api/v1/menus",
        json={"date": "2026-10-07", "meal_type": "lunch", "items": ["Khichdi"]},
        headers=h,
    )
    assert r.json()["items"] == ["Khichdi"]  # overwrite
    r = await client.get(
        "/api/v1/menus?from=2026-10-06&to=2026-10-08", headers=ch
    )  # customer can read
    assert r.status_code == 200
    assert len(r.json()) == 1 and r.json()[0]["date"] == "2026-10-07"


async def test_menu_copy_previous_day(client):
    h, ch = await setup(client)
    await client.put(
        "/api/v1/menus",
        json={"date": "2026-10-07", "meal_type": "dinner", "items": ["Paneer", "Rice"]},
        headers=h,
    )
    r = await client.post("/api/v1/menus/copy?from=2026-10-07&to=2026-10-08", headers=h)
    assert r.status_code == 200 and r.json()["copied"] == 1
    r = await client.get("/api/v1/menus?from=2026-10-08&to=2026-10-08", headers=h)
    assert r.json()[0]["items"] == ["Paneer", "Rice"] and r.json()[0]["meal_type"] == "dinner"


async def test_menu_empty_items_deletes(client):
    h, ch = await setup(client)
    await client.put(
        "/api/v1/menus",
        json={"date": "2026-10-07", "meal_type": "lunch", "items": ["Dal"]},
        headers=h,
    )
    r = await client.put(
        "/api/v1/menus", json={"date": "2026-10-07", "meal_type": "lunch", "items": []}, headers=h
    )
    assert r.status_code == 200
    r = await client.get("/api/v1/menus?from=2026-10-07&to=2026-10-07", headers=h)
    assert r.json() == []


async def test_customer_cannot_edit_menu(client):
    h, ch = await setup(client)
    r = await client.put(
        "/api/v1/menus",
        json={"date": "2026-10-07", "meal_type": "lunch", "items": ["X"]},
        headers=ch,
    )
    assert r.status_code == 403


async def test_announcement_notifies_all_members(client):
    h, ch = await setup(client)
    r = await client.post(
        "/api/v1/announcements",
        json={"title": "Mess closed Sunday", "body": "Diwali holiday on 24 Oct."},
        headers=h,
    )
    assert r.status_code == 201, r.text
    r = await client.get("/api/v1/announcements", headers=ch)
    assert r.status_code == 200 and r.json()[0]["title"] == "Mess closed Sunday"
    r = await client.get("/api/v1/notifications", headers=ch)
    assert r.json()["unread"] == 1 and r.json()["items"][0]["type"] == "announcement"


async def test_announcement_delete(client):
    h, ch = await setup(client)
    r = await client.post("/api/v1/announcements", json={"title": "Test", "body": None}, headers=h)
    aid = r.json()["id"]
    r = await client.delete(f"/api/v1/announcements/{aid}", headers=h)
    assert r.status_code == 204
    r = await client.get("/api/v1/announcements", headers=h)
    assert r.json() == []
