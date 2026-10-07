from tests.factories import create_member, create_plan, login, register_owner


async def client_payload(name="Infosys", veg="60", nonveg="80"):
    return {
        "name": name,
        "contact_name": "HR Desk",
        "phone": "9123456780",
        "address": "Hinjewadi Phase 2",
        "veg_rate": veg,
        "nonveg_rate": nonveg,
    }


async def make_client(c, h, **kw):
    r = await c.post("/api/v1/tiffin-clients", json=await client_payload(**kw), headers=h)
    assert r.status_code == 201, r.text
    return r.json()


async def test_client_crud(client):
    h, _ = await register_owner(client)
    tc = await make_client(client, h)
    assert (
        tc["name"] == "Infosys"
        and tc["veg_rate"] == "60.00"
        and tc["nonveg_rate"] == "80.00"
        and tc["is_active"] is True
    )
    r = await client.patch(
        f"/api/v1/tiffin-clients/{tc['id']}", json={"veg_rate": "65", "is_active": False}, headers=h
    )
    assert (
        r.status_code == 200 and r.json()["veg_rate"] == "65.00" and r.json()["is_active"] is False
    )
    r = await client.get("/api/v1/tiffin-clients", headers=h)
    assert len(r.json()) == 1


async def test_daily_orders_with_veg_nonveg_counts(client):
    h, _ = await register_owner(client)
    a = await make_client(client, h, name="Infosys", veg="60", nonveg="80")
    b = await make_client(client, h, name="TCS", veg="55", nonveg="75")
    r = await client.put(
        "/api/v1/tiffin-orders",
        json={
            "date": "2026-10-07",
            "meal_type": "lunch",
            "items": [
                {"client_id": a["id"], "veg_count": 40, "nonveg_count": 10},
                {"client_id": b["id"], "veg_count": 20, "nonveg_count": 0, "note": "Jain 2"},
            ],
        },
        headers=h,
    )
    assert r.status_code == 200, r.text
    sheet = r.json()
    assert sheet["totals"] == {"veg": 60, "nonveg": 10, "total": 70, "amount": "4300.00"}
    rows = {x["client"]["name"]: x for x in sheet["items"]}
    assert rows["Infosys"]["veg_count"] == 40 and rows["Infosys"]["nonveg_count"] == 10
    assert rows["TCS"]["note"] == "Jain 2"
    # next day a different count, overwrite works
    await client.put(
        "/api/v1/tiffin-orders",
        json={
            "date": "2026-10-08",
            "meal_type": "lunch",
            "items": [{"client_id": a["id"], "veg_count": 35, "nonveg_count": 10}],
        },
        headers=h,
    )
    r = await client.put(
        "/api/v1/tiffin-orders",
        json={
            "date": "2026-10-08",
            "meal_type": "lunch",
            "items": [{"client_id": a["id"], "veg_count": 30, "nonveg_count": 15}],
        },
        headers=h,
    )
    assert r.json()["totals"]["total"] == 45
    # dinner sheet is separate and lists every active client with zero
    r = await client.get("/api/v1/tiffin-orders?date=2026-10-07&meal_type=dinner", headers=h)
    assert r.json()["totals"]["total"] == 0 and len(r.json()["items"]) == 2


async def test_zero_counts_remove_order(client):
    h, _ = await register_owner(client)
    a = await make_client(client, h)
    await client.put(
        "/api/v1/tiffin-orders",
        json={
            "date": "2026-10-07",
            "meal_type": "lunch",
            "items": [{"client_id": a["id"], "veg_count": 5, "nonveg_count": 5}],
        },
        headers=h,
    )
    r = await client.put(
        "/api/v1/tiffin-orders",
        json={
            "date": "2026-10-07",
            "meal_type": "lunch",
            "items": [{"client_id": a["id"], "veg_count": 0, "nonveg_count": 0}],
        },
        headers=h,
    )
    assert r.json()["totals"]["total"] == 0
    r = await client.get(f"/api/v1/tiffin-clients/{a['id']}/statement?month=2026-10", headers=h)
    assert r.json()["days"] == []


async def test_rate_snapshot_on_order(client):
    """Changing a client's rate later must not change past order amounts."""
    h, _ = await register_owner(client)
    a = await make_client(client, h, veg="60", nonveg="80")
    await client.put(
        "/api/v1/tiffin-orders",
        json={
            "date": "2026-10-07",
            "meal_type": "lunch",
            "items": [{"client_id": a["id"], "veg_count": 10, "nonveg_count": 0}],
        },
        headers=h,
    )
    await client.patch(f"/api/v1/tiffin-clients/{a['id']}", json={"veg_rate": "70"}, headers=h)
    await client.put(
        "/api/v1/tiffin-orders",
        json={
            "date": "2026-10-08",
            "meal_type": "lunch",
            "items": [{"client_id": a["id"], "veg_count": 10, "nonveg_count": 0}],
        },
        headers=h,
    )
    r = await client.get(f"/api/v1/tiffin-clients/{a['id']}/statement?month=2026-10", headers=h)
    assert r.json()["amount"] == "1300.00"  # 10*60 + 10*70


async def test_copy_previous_day(client):
    h, _ = await register_owner(client)
    a = await make_client(client, h)
    await client.put(
        "/api/v1/tiffin-orders",
        json={
            "date": "2026-10-07",
            "meal_type": "lunch",
            "items": [{"client_id": a["id"], "veg_count": 40, "nonveg_count": 10}],
        },
        headers=h,
    )
    await client.put(
        "/api/v1/tiffin-orders",
        json={
            "date": "2026-10-07",
            "meal_type": "dinner",
            "items": [{"client_id": a["id"], "veg_count": 5, "nonveg_count": 0}],
        },
        headers=h,
    )
    r = await client.post("/api/v1/tiffin-orders/copy?from=2026-10-07&to=2026-10-08", headers=h)
    assert r.status_code == 200 and r.json()["copied"] == 2
    r = await client.get("/api/v1/tiffin-orders?date=2026-10-08&meal_type=lunch", headers=h)
    assert r.json()["totals"]["total"] == 50


async def test_statement_payments_and_summary(client):
    h, _ = await register_owner(client)
    a = await make_client(client, h, veg="60", nonveg="80")
    for d, v, n in [("2026-10-06", 50, 0), ("2026-10-07", 40, 5)]:
        await client.put(
            "/api/v1/tiffin-orders",
            json={
                "date": d,
                "meal_type": "lunch",
                "items": [{"client_id": a["id"], "veg_count": v, "nonveg_count": n}],
            },
            headers=h,
        )
    r = await client.get(f"/api/v1/tiffin-clients/{a['id']}/statement?month=2026-10", headers=h)
    st = r.json()
    assert st["totals"] == {"veg": 90, "nonveg": 5, "total": 95}
    assert st["amount"] == "5800.00" and st["paid"] == "0.00" and st["due"] == "5800.00"
    assert [d["date"] for d in st["days"]] == ["2026-10-06", "2026-10-07"]
    assert (
        st["days"][1]["lunch_veg"] == 40
        and st["days"][1]["lunch_nonveg"] == 5
        and st["days"][1]["amount"] == "2800.00"
    )
    r = await client.post(
        f"/api/v1/tiffin-clients/{a['id']}/payments",
        json={"month": "2026-10", "amount": "5000", "method": "bank", "paid_on": "2026-10-07"},
        headers=h,
    )
    assert r.status_code == 201, r.text
    assert r.json()["paid"] == "5000.00" and r.json()["due"] == "800.00"
    pid = r.json()["payments"][0]["id"]
    r = await client.get("/api/v1/tiffin-clients/summary?month=2026-10", headers=h)
    row = r.json()["items"][0]
    assert row["total"] == 95 and row["amount"] == "5800.00" and row["due"] == "800.00"
    assert r.json()["totals"] == {
        "veg": 90,
        "nonveg": 5,
        "total": 95,
        "amount": "5800.00",
        "paid": "5000.00",
        "due": "800.00",
    }
    r = await client.delete(f"/api/v1/tiffin-payments/{pid}", headers=h)
    assert r.status_code == 200 and r.json()["paid"] == "0.00"


async def test_orders_blocked_in_closed_month(client):
    h, _ = await register_owner(client)
    a = await make_client(client, h)
    await client.post("/api/v1/months/2026-10/close", headers=h)
    r = await client.put(
        "/api/v1/tiffin-orders",
        json={
            "date": "2026-10-07",
            "meal_type": "lunch",
            "items": [{"client_id": a["id"], "veg_count": 1, "nonveg_count": 0}],
        },
        headers=h,
    )
    assert r.status_code == 409 and r.json()["code"] == "MONTH_CLOSED"


async def test_tenant_isolation_and_customer_forbidden(client):
    h1, _ = await register_owner(client, phone="9876543210", mess_name="Mess A")
    h2, _ = await register_owner(client, phone="9876543211", mess_name="Mess B")
    a = await make_client(client, h1)
    r = await client.put(
        "/api/v1/tiffin-orders",
        json={
            "date": "2026-10-07",
            "meal_type": "lunch",
            "items": [{"client_id": a["id"], "veg_count": 1, "nonveg_count": 0}],
        },
        headers=h2,
    )
    assert r.status_code == 404
    r = await client.get(f"/api/v1/tiffin-clients/{a['id']}/statement?month=2026-10", headers=h2)
    assert r.status_code == 404
    plan = await create_plan(client, h1)
    m = await create_member(client, h1, plan["id"])
    ch, _ = await login(client, "9000000011", m["temp_password"])
    r = await client.get("/api/v1/tiffin-clients", headers=ch)
    assert r.status_code == 403


async def test_dashboard_shows_today_tiffins(client):
    h, _ = await register_owner(client)
    a = await make_client(client, h)
    await client.put(
        "/api/v1/tiffin-orders",
        json={
            "date": "2026-10-07",
            "meal_type": "lunch",
            "items": [{"client_id": a["id"], "veg_count": 40, "nonveg_count": 10}],
        },
        headers=h,
    )
    r = await client.get("/api/v1/dashboard/owner?date=2026-10-07", headers=h)
    assert r.json()["bulk_tiffins"] == {
        "veg": 40,
        "nonveg": 10,
        "total": 50,
        "lunch": 50,
        "dinner": 0,
    }


async def test_negative_counts_rejected(client):
    h, _ = await register_owner(client)
    a = await make_client(client, h)
    r = await client.put(
        "/api/v1/tiffin-orders",
        json={
            "date": "2026-10-07",
            "meal_type": "lunch",
            "items": [{"client_id": a["id"], "veg_count": -1, "nonveg_count": 0}],
        },
        headers=h,
    )
    assert r.status_code == 422
