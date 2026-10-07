from tests.factories import create_member, create_plan, login, register_owner


async def make_items(c, h):
    out = {}
    for name, price, ft in [
        ("Veg thali / Rice plate", "90", "veg"),
        ("Anda thali - Chapati", "120", "egg"),
        ("Anda thali - Bhakri", "130", "egg"),
        ("Chicken thali", "160", "nonveg"),
    ]:
        r = await c.post(
            "/api/v1/tiffin-items", json={"name": name, "price": price, "food_type": ft}, headers=h
        )
        assert r.status_code == 201, r.text
        out[ft if ft != "egg" else name] = r.json()
    return out


async def make_client(c, h, name="Infosys"):
    r = await c.post(
        "/api/v1/tiffin-clients",
        json={
            "name": name,
            "contact_name": "HR Desk",
            "phone": "9123456780",
            "address": "Hinjewadi",
        },
        headers=h,
    )
    assert r.status_code == 201, r.text
    return r.json()


async def setup(client):
    h, _ = await register_owner(client)
    items = await make_items(client, h)
    veg = items["veg"]
    anda_c = items["Anda thali - Chapati"]
    anda_b = items["Anda thali - Bhakri"]
    return h, veg, anda_c, anda_b, items["nonveg"]


def line(item, qty):
    return {"item_id": item["id"], "quantity": qty}


async def test_price_list_crud(client):
    h, veg, anda_c, anda_b, chicken = await setup(client)
    r = await client.get("/api/v1/tiffin-items", headers=h)
    assert [(i["name"], i["price"], i["food_type"]) for i in r.json()][:3] == [
        ("Veg thali / Rice plate", "90.00", "veg"),
        ("Anda thali - Chapati", "120.00", "egg"),
        ("Anda thali - Bhakri", "130.00", "egg"),
    ]
    r = await client.patch(f"/api/v1/tiffin-items/{veg['id']}", json={"price": "95"}, headers=h)
    assert r.json()["price"] == "95.00"
    r = await client.patch(
        f"/api/v1/tiffin-items/{chicken['id']}", json={"is_active": False}, headers=h
    )
    assert r.json()["is_active"] is False
    r = await client.post(
        "/api/v1/tiffin-items", json={"name": "X", "price": "0", "food_type": "veg"}, headers=h
    )
    assert r.status_code == 422


async def test_daily_orders_by_item(client):
    h, veg, anda_c, anda_b, chicken = await setup(client)
    a = await make_client(client, h, "Infosys")
    b = await make_client(client, h, "TCS")
    r = await client.put(
        "/api/v1/tiffin-orders",
        json={
            "date": "2026-10-07",
            "meal_type": "lunch",
            "items": [
                {
                    "client_id": a["id"],
                    "lines": [line(veg, 40), line(anda_c, 8), line(anda_b, 2)],
                    "note": "2 Jain",
                },
                {"client_id": b["id"], "lines": [line(veg, 20)]},
            ],
        },
        headers=h,
    )
    assert r.status_code == 200, r.text
    sheet = r.json()
    # 60*90 + 8*120 + 2*130 = 5400 + 960 + 260
    assert sheet["totals"] == {"total": 70, "veg": 60, "nonveg": 10, "amount": "6620.00"}
    assert sheet["by_item"] == {str(veg["id"]): 60, str(anda_c["id"]): 8, str(anda_b["id"]): 2}
    rows = {x["client"]["name"]: x for x in sheet["rows"]}
    assert rows["Infosys"]["quantities"] == {
        str(veg["id"]): 40,
        str(anda_c["id"]): 8,
        str(anda_b["id"]): 2,
    }
    assert rows["Infosys"]["note"] == "2 Jain" and rows["Infosys"]["amount"] == "4820.00"
    assert [i["name"] for i in sheet["items"]] == [
        "Veg thali / Rice plate",
        "Anda thali - Chapati",
        "Anda thali - Bhakri",
        "Chicken thali",
    ]
    # next day different count, overwrite replaces lines
    r = await client.put(
        "/api/v1/tiffin-orders",
        json={
            "date": "2026-10-07",
            "meal_type": "lunch",
            "items": [{"client_id": a["id"], "lines": [line(veg, 35)]}],
        },
        headers=h,
    )
    rows = {x["client"]["name"]: x for x in r.json()["rows"]}
    assert rows["Infosys"]["quantities"] == {str(veg["id"]): 35}
    assert r.json()["totals"]["total"] == 55
    # dinner sheet is separate and lists active clients empty
    r = await client.get("/api/v1/tiffin-orders?date=2026-10-07&meal_type=dinner", headers=h)
    assert r.json()["totals"]["total"] == 0 and len(r.json()["rows"]) == 2


async def test_empty_lines_remove_order(client):
    h, veg, *_ = await setup(client)
    a = await make_client(client, h)
    await client.put(
        "/api/v1/tiffin-orders",
        json={
            "date": "2026-10-07",
            "meal_type": "lunch",
            "items": [{"client_id": a["id"], "lines": [line(veg, 5)]}],
        },
        headers=h,
    )
    r = await client.put(
        "/api/v1/tiffin-orders",
        json={
            "date": "2026-10-07",
            "meal_type": "lunch",
            "items": [{"client_id": a["id"], "lines": [line(veg, 0)]}],
        },
        headers=h,
    )
    assert r.json()["totals"]["total"] == 0
    r = await client.get(f"/api/v1/tiffin-clients/{a['id']}/statement?month=2026-10", headers=h)
    assert r.json()["days"] == []


async def test_price_snapshot_on_order(client):
    """Changing an item's price later must not change past order amounts."""
    h, veg, *_ = await setup(client)
    a = await make_client(client, h)
    await client.put(
        "/api/v1/tiffin-orders",
        json={
            "date": "2026-10-07",
            "meal_type": "lunch",
            "items": [{"client_id": a["id"], "lines": [line(veg, 10)]}],
        },
        headers=h,
    )
    await client.patch(f"/api/v1/tiffin-items/{veg['id']}", json={"price": "100"}, headers=h)
    await client.put(
        "/api/v1/tiffin-orders",
        json={
            "date": "2026-10-08",
            "meal_type": "lunch",
            "items": [{"client_id": a["id"], "lines": [line(veg, 10)]}],
        },
        headers=h,
    )
    r = await client.get(f"/api/v1/tiffin-clients/{a['id']}/statement?month=2026-10", headers=h)
    assert r.json()["amount"] == "1900.00"  # 10*90 + 10*100


async def test_copy_previous_day(client):
    h, veg, anda_c, *_ = await setup(client)
    a = await make_client(client, h)
    await client.put(
        "/api/v1/tiffin-orders",
        json={
            "date": "2026-10-07",
            "meal_type": "lunch",
            "items": [{"client_id": a["id"], "lines": [line(veg, 40), line(anda_c, 10)]}],
        },
        headers=h,
    )
    await client.put(
        "/api/v1/tiffin-orders",
        json={
            "date": "2026-10-07",
            "meal_type": "dinner",
            "items": [{"client_id": a["id"], "lines": [line(veg, 5)]}],
        },
        headers=h,
    )
    r = await client.post("/api/v1/tiffin-orders/copy?from=2026-10-07&to=2026-10-08", headers=h)
    assert r.status_code == 200 and r.json()["copied"] == 2
    r = await client.get("/api/v1/tiffin-orders?date=2026-10-08&meal_type=lunch", headers=h)
    assert r.json()["totals"]["total"] == 50


async def test_statement_payments_and_summary(client):
    h, veg, anda_c, anda_b, _ = await setup(client)
    a = await make_client(client, h)
    await client.put(
        "/api/v1/tiffin-orders",
        json={
            "date": "2026-10-06",
            "meal_type": "lunch",
            "items": [{"client_id": a["id"], "lines": [line(veg, 50)]}],
        },
        headers=h,
    )
    await client.put(
        "/api/v1/tiffin-orders",
        json={
            "date": "2026-10-07",
            "meal_type": "lunch",
            "items": [{"client_id": a["id"], "lines": [line(veg, 40), line(anda_b, 5)]}],
        },
        headers=h,
    )
    r = await client.get(f"/api/v1/tiffin-clients/{a['id']}/statement?month=2026-10", headers=h)
    st = r.json()
    assert st["totals"] == {"total": 95, "veg": 90, "nonveg": 5}
    assert (
        st["amount"] == "8750.00" and st["paid"] == "0.00" and st["due"] == "8750.00"
    )  # 90*90 + 5*130
    assert [(d["date"], d["total"], d["amount"]) for d in st["days"]] == [
        ("2026-10-06", 50, "4500.00"),
        ("2026-10-07", 45, "4250.00"),
    ]
    assert [(x["name"], x["quantity"], x["amount"]) for x in st["by_item"]] == [
        ("Veg thali / Rice plate", 90, "8100.00"),
        ("Anda thali - Bhakri", 5, "650.00"),
    ]
    r = await client.post(
        f"/api/v1/tiffin-clients/{a['id']}/payments",
        json={"month": "2026-10", "amount": "8000", "method": "bank", "paid_on": "2026-10-07"},
        headers=h,
    )
    assert r.status_code == 201, r.text
    assert r.json()["paid"] == "8000.00" and r.json()["due"] == "750.00"
    pid = r.json()["payments"][0]["id"]
    r = await client.get("/api/v1/tiffin-clients/summary?month=2026-10", headers=h)
    row = r.json()["items"][0]
    assert row["total"] == 95 and row["amount"] == "8750.00" and row["due"] == "750.00"
    assert r.json()["totals"] == {
        "total": 95,
        "veg": 90,
        "nonveg": 5,
        "amount": "8750.00",
        "paid": "8000.00",
        "due": "750.00",
    }
    r = await client.delete(f"/api/v1/tiffin-payments/{pid}", headers=h)
    assert r.status_code == 200 and r.json()["paid"] == "0.00"


async def test_orders_blocked_in_closed_month(client):
    h, veg, *_ = await setup(client)
    a = await make_client(client, h)
    await client.post("/api/v1/months/2026-10/close", headers=h)
    r = await client.put(
        "/api/v1/tiffin-orders",
        json={
            "date": "2026-10-07",
            "meal_type": "lunch",
            "items": [{"client_id": a["id"], "lines": [line(veg, 1)]}],
        },
        headers=h,
    )
    assert r.status_code == 409 and r.json()["code"] == "MONTH_CLOSED"


async def test_tenant_isolation_and_customer_forbidden(client):
    h1, _ = await register_owner(client, phone="9876543210", mess_name="Mess A")
    h2, _ = await register_owner(client, phone="9876543211", mess_name="Mess B")
    items = await make_items(client, h1)
    a = await make_client(client, h1)
    other_items = await make_items(client, h2)
    # B cannot order for A's client, nor use A's item for its own client
    r = await client.put(
        "/api/v1/tiffin-orders",
        json={
            "date": "2026-10-07",
            "meal_type": "lunch",
            "items": [{"client_id": a["id"], "lines": [line(other_items["veg"], 1)]}],
        },
        headers=h2,
    )
    assert r.status_code == 404
    b = await make_client(client, h2, "TCS")
    r = await client.put(
        "/api/v1/tiffin-orders",
        json={
            "date": "2026-10-07",
            "meal_type": "lunch",
            "items": [{"client_id": b["id"], "lines": [line(items["veg"], 1)]}],
        },
        headers=h2,
    )
    assert r.status_code == 404
    r = await client.get(f"/api/v1/tiffin-clients/{a['id']}/statement?month=2026-10", headers=h2)
    assert r.status_code == 404
    plan = await create_plan(client, h1)
    m = await create_member(client, h1, plan["id"])
    ch, _ = await login(client, "9000000011", m["temp_password"])
    r = await client.get("/api/v1/tiffin-items", headers=ch)
    assert r.status_code == 403


async def test_dashboard_shows_today_tiffins(client):
    h, veg, anda_c, *_ = await setup(client)
    a = await make_client(client, h)
    await client.put(
        "/api/v1/tiffin-orders",
        json={
            "date": "2026-10-07",
            "meal_type": "lunch",
            "items": [{"client_id": a["id"], "lines": [line(veg, 40), line(anda_c, 10)]}],
        },
        headers=h,
    )
    r = await client.get("/api/v1/dashboard/owner?date=2026-10-07", headers=h)
    bt = r.json()["bulk_tiffins"]
    assert {k: bt[k] for k in ("veg", "nonveg", "total", "lunch", "dinner")} == {
        "veg": 40,
        "nonveg": 10,
        "total": 50,
        "lunch": 50,
        "dinner": 0,
    }
    assert bt["items"] == [
        {"name": "Veg thali / Rice plate", "food_type": "veg", "quantity": 40},
        {"name": "Anda thali - Chapati", "food_type": "egg", "quantity": 10},
    ]


async def test_negative_quantity_rejected(client):
    h, veg, *_ = await setup(client)
    a = await make_client(client, h)
    r = await client.put(
        "/api/v1/tiffin-orders",
        json={
            "date": "2026-10-07",
            "meal_type": "lunch",
            "items": [{"client_id": a["id"], "lines": [line(veg, -1)]}],
        },
        headers=h,
    )
    assert r.status_code == 422


async def test_client_crud(client):
    h, *_ = await setup(client)
    tc = await make_client(client, h)
    assert tc["name"] == "Infosys" and tc["is_active"] is True
    r = await client.patch(
        f"/api/v1/tiffin-clients/{tc['id']}",
        json={"is_active": False, "contact_name": "Admin"},
        headers=h,
    )
    assert (
        r.status_code == 200
        and r.json()["is_active"] is False
        and r.json()["contact_name"] == "Admin"
    )
