from tests.factories import create_member, create_plan, login, register_owner


async def test_plan_crud(client):
    h, _ = await register_owner(client)
    plan = await create_plan(client, h)
    assert plan["name"] == "Lunch + Dinner"
    assert plan["monthly_fee"] == "2500.00"
    r = await client.get("/api/v1/plans", headers=h)
    assert [p["id"] for p in r.json()] == [plan["id"]]
    r = await client.patch(f"/api/v1/plans/{plan['id']}", json={"monthly_fee": "2700"}, headers=h)
    assert r.status_code == 200 and r.json()["monthly_fee"] == "2700.00"


async def test_plan_needs_at_least_one_meal(client):
    h, _ = await register_owner(client)
    r = await client.post(
        "/api/v1/plans",
        json={
            "name": "None",
            "includes_lunch": False,
            "includes_dinner": False,
            "monthly_fee": "1",
        },
        headers=h,
    )
    assert r.status_code == 422


async def test_create_member_creates_login_and_returns_temp_password(client):
    h, _ = await register_owner(client)
    plan = await create_plan(client, h)
    m = await create_member(client, h, plan["id"])
    assert m["member"]["name"] == "Rahul"
    assert m["member"]["monthly_fee"] == "2500.00"  # copied from plan
    assert m["member"]["status"] == "active"
    assert m["member"]["plan"]["name"] == "Lunch + Dinner"
    assert len(m["temp_password"]) >= 6
    ch, me = await login(client, "9000000011", m["temp_password"])
    assert me["user"]["role"] == "customer"
    assert me["user"]["must_change_password"] is True
    assert me["member"]["id"] == m["member"]["id"]
    assert me["member"]["plan"]["includes_dinner"] is True


async def test_create_member_duplicate_phone_409(client):
    h, _ = await register_owner(client)
    plan = await create_plan(client, h)
    await create_member(client, h, plan["id"])
    r = await client.post(
        "/api/v1/members",
        json={
            "name": "X",
            "phone": "9000000011",
            "plan_id": plan["id"],
            "joining_date": "2026-10-01",
        },
        headers=h,
    )
    assert r.status_code == 409
    assert r.json()["code"] == "DUPLICATE_PHONE"


async def test_member_fee_override_and_fields(client):
    h, _ = await register_owner(client)
    plan = await create_plan(client, h)
    m = await create_member(
        client,
        h,
        plan["id"],
        monthly_fee="2000",
        deposit="500",
        notes="Veg only",
        emergency_contact="9111111111",
    )
    assert m["member"]["monthly_fee"] == "2000.00"
    assert m["member"]["deposit"] == "500.00"
    assert m["member"]["notes"] == "Veg only"


async def test_list_search_and_filter(client):
    h, _ = await register_owner(client)
    plan = await create_plan(client, h)
    await create_member(
        client, h, plan["id"], phone="9000000011", name="Rahul Sharma", room_no="101"
    )
    await create_member(client, h, plan["id"], phone="9000000012", name="Amit Kumar", room_no="202")
    r = await client.get("/api/v1/members", headers=h)
    assert r.status_code == 200 and r.json()["total"] == 2
    for q in ["rahul", "9000000011", "101"]:
        r = await client.get(f"/api/v1/members?search={q}", headers=h)
        assert [x["name"] for x in r.json()["items"]] == ["Rahul Sharma"], q
    r = await client.get("/api/v1/members?status=inactive", headers=h)
    assert r.json()["total"] == 0


async def test_patch_deactivate_activate(client):
    h, _ = await register_owner(client)
    plan = await create_plan(client, h)
    m = (await create_member(client, h, plan["id"]))["member"]
    r = await client.patch(
        f"/api/v1/members/{m['id']}", json={"room_no": "305", "name": "Rahul S"}, headers=h
    )
    assert r.status_code == 200 and r.json()["room_no"] == "305"
    r = await client.post(f"/api/v1/members/{m['id']}/deactivate", headers=h)
    assert r.status_code == 200 and r.json()["status"] == "inactive"
    assert r.json()["inactive_from"] is not None
    # deactivated member can no longer log in
    r = await client.post("/api/v1/auth/login", json={"phone": "9000000011", "password": "x"})
    assert r.status_code == 401
    r = await client.post(f"/api/v1/members/{m['id']}/activate", headers=h)
    assert r.json()["status"] == "active" and r.json()["inactive_from"] is None


async def test_reset_password(client):
    h, _ = await register_owner(client)
    plan = await create_plan(client, h)
    m = await create_member(client, h, plan["id"])
    r = await client.post(f"/api/v1/members/{m['member']['id']}/reset-password", headers=h)
    assert r.status_code == 200
    new_pw = r.json()["temp_password"]
    assert new_pw != m["temp_password"]
    await login(client, "9000000011", new_pw)


async def test_tenant_isolation(client):
    h1, _ = await register_owner(client, phone="9876543210", mess_name="Mess A")
    h2, _ = await register_owner(client, phone="9876543211", mess_name="Mess B")
    plan1 = await create_plan(client, h1)
    m = (await create_member(client, h1, plan1["id"]))["member"]
    r = await client.get("/api/v1/members", headers=h2)
    assert r.json()["total"] == 0
    r = await client.get(f"/api/v1/members/{m['id']}", headers=h2)
    assert r.status_code == 404
    # plan from org A cannot be used in org B
    r = await client.post(
        "/api/v1/members",
        json={
            "name": "X",
            "phone": "9000000099",
            "plan_id": plan1["id"],
            "joining_date": "2026-10-01",
        },
        headers=h2,
    )
    assert r.status_code == 404


async def test_customer_forbidden_on_members(client):
    h, _ = await register_owner(client)
    plan = await create_plan(client, h)
    m = await create_member(client, h, plan["id"])
    ch, _ = await login(client, "9000000011", m["temp_password"])
    r = await client.get("/api/v1/members", headers=ch)
    assert r.status_code == 403
