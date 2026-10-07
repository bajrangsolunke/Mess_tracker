from tests.factories import create_member, create_plan, login, register_owner


async def setup(client):
    h, _ = await register_owner(client)
    plan = await create_plan(client, h)
    a = await create_member(client, h, plan["id"], phone="9000000011", name="Rahul")
    b = await create_member(
        client, h, plan["id"], phone="9000000012", name="Amit", member_type="tiffin", company="TCS"
    )
    await client.put(
        "/api/v1/attendance",
        json={
            "date": "2026-10-07",
            "meal_type": "lunch",
            "items": [
                {"member_id": a["member"]["id"], "status": "present"},
                {"member_id": b["member"]["id"], "status": "present"},
            ],
        },
        headers=h,
    )
    await client.put(
        "/api/v1/attendance",
        json={
            "date": "2026-10-07",
            "meal_type": "dinner",
            "items": [{"member_id": a["member"]["id"], "status": "absent"}],
        },
        headers=h,
    )
    await client.put(
        "/api/v1/attendance",
        json={
            "date": "2026-10-06",
            "meal_type": "lunch",
            "items": [{"member_id": a["member"]["id"], "status": "present"}],
        },
        headers=h,
    )
    await client.post("/api/v1/bills/generate?month=2026-10", headers=h)
    r = await client.get("/api/v1/bills?month=2026-10", headers=h)
    bill = next(x for x in r.json()["items"] if x["member"]["id"] == a["member"]["id"])
    await client.post(
        f"/api/v1/bills/{bill['id']}/payments",
        json={"amount": "2500", "method": "upi", "paid_on": "2026-10-05"},
        headers=h,
    )
    await client.put(
        "/api/v1/menus",
        json={"date": "2026-10-07", "meal_type": "lunch", "items": ["Dal", "Rice"]},
        headers=h,
    )
    return h, a, b


async def test_owner_dashboard(client):
    h, a, b = await setup(client)
    r = await client.get("/api/v1/dashboard/owner?date=2026-10-07", headers=h)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["active_members"] == 2
    assert d["tiffin_members"] == 1
    assert d["lunch"] == {"expected": 2, "present": 2, "absent": 0, "unmarked": 0, "on_leave": 0}
    assert (
        d["dinner"]["present"] == 0 and d["dinner"]["absent"] == 1 and d["dinner"]["unmarked"] == 1
    )
    assert d["payments"] == {
        "billed": "5000.00",
        "collected": "2500.00",
        "pending": "2500.00",
        "members": 2,
        "paid": 1,
    }
    assert d["menu"]["lunch"] == ["Dal", "Rice"] and d["menu"]["dinner"] == []
    assert d["late_leaves"] == 0
    assert d["meals_served_month"] == 3


async def test_customer_dashboard(client):
    h, a, b = await setup(client)
    ch, _ = await login(client, "9000000011", a["temp_password"])
    r = await client.get("/api/v1/dashboard/me?date=2026-10-07", headers=ch)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["member"]["name"] == "Rahul"
    assert d["meals_this_month"] == 2
    assert d["bill"]["status"] == "paid"
    assert d["menu"]["lunch"] == ["Dal", "Rice"]
    assert d["upcoming_leaves"] == []
    assert d["unread_notifications"] == 0


async def test_reports(client):
    h, a, b = await setup(client)
    r = await client.get("/api/v1/reports/meals?month=2026-10", headers=h)
    assert r.status_code == 200, r.text
    days = {x["date"]: x for x in r.json()["days"]}
    assert days["2026-10-07"]["lunch"] == 2 and days["2026-10-07"]["dinner"] == 0
    assert days["2026-10-06"]["lunch"] == 1
    assert r.json()["totals"] == {"lunch": 3, "dinner": 0, "total": 3, "tiffin": 1}
    r = await client.get("/api/v1/reports/payments?month=2026-10", headers=h)
    assert r.json()["by_method"] == {"cash": "0.00", "upi": "2500.00", "bank": "0.00"}
    assert r.json()["totals"]["collected"] == "2500.00"
    r = await client.get("/api/v1/reports/attendance?month=2026-10", headers=h)
    row = next(x for x in r.json() if x["member"]["name"] == "Rahul")
    assert row["total_present"] == 2
    r = await client.get("/api/v1/reports/payments?month=2026-10", headers=h)
    assert r.json()["months"][-1]["month"] == "2026-10-01"
