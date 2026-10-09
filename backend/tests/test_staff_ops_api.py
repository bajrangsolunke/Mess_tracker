"""Staff role, salary/advance ledger, payment at registration, share links, simple tiffins."""

from datetime import date

import pytest

from tests.factories import create_member, create_plan, login, register_owner

TODAY = date(2026, 10, 7)


@pytest.fixture
def today(monkeypatch):
    for mod in (
        "app.api.v1.attendance",
        "app.api.v1.tiffin",
        "app.api.v1.operations",
        "app.api.v1.public",
        "app.services.members",
    ):
        monkeypatch.setattr(f"{mod}.today_ist", lambda: TODAY)


async def make_staff(client, h, phone="9111111111", salary="9000"):
    r = await client.post(
        "/api/v1/staff",
        json={"name": "Ganesh", "phone": phone, "monthly_salary": salary},
        headers=h,
    )
    assert r.status_code == 201, r.text
    sh, _ = await login(client, phone, r.json()["temp_password"])
    return r.json()["staff"], sh


def mark(member_id, status="present", d="2026-10-07", meal="lunch", **extra):
    return {
        "date": d,
        "meal_type": meal,
        "items": [{"member_id": member_id, "status": status}],
        **extra,
    }


# --- staff permissions -----------------------------------------------------------------


async def test_staff_marks_today_only_and_cannot_correct(client, today):
    h, _ = await register_owner(client)
    plan = await create_plan(client, h)
    m = (await create_member(client, h, plan["id"]))["member"]
    _, sh = await make_staff(client, h)

    r = await client.put("/api/v1/attendance", json=mark(m["id"]), headers=sh)
    assert r.status_code == 200, r.text
    assert r.json()["counts"]["present"] == 1
    assert r.json()["items"][0]["marked_by_name"] == "Ganesh"
    # a mark is final for staff
    r = await client.put("/api/v1/attendance", json=mark(m["id"], "absent"), headers=sh)
    assert r.status_code == 409 and r.json()["code"] == "ATTENDANCE_LOCKED"
    r = await client.put(
        "/api/v1/attendance", json=mark(m["id"], "absent", override=True), headers=sh
    )
    assert r.status_code == 403 and r.json()["code"] == "OWNER_ONLY_CORRECTION"
    # other days are the owner's
    r = await client.put("/api/v1/attendance", json=mark(m["id"], d="2026-10-06"), headers=sh)
    assert r.status_code == 403 and r.json()["code"] == "STAFF_TODAY_ONLY"
    r = await client.post(
        "/api/v1/attendance/mark-all?date=2026-10-06&meal_type=dinner&status=present",
        headers=sh,
    )
    assert r.status_code == 403
    # owner corrects explicitly
    r = await client.put(
        "/api/v1/attendance", json=mark(m["id"], "absent", override=True), headers=h
    )
    assert r.json()["counts"]["absent"] == 1


async def test_staff_cannot_reach_owner_areas(client, today):
    h, _ = await register_owner(client)
    _, sh = await make_staff(client, h)
    for path in ("/api/v1/members", "/api/v1/staff", "/api/v1/ledger?from=2026-10-01"):
        r = await client.get(path, headers=sh)
        assert r.status_code == 403, path
    r = await client.get("/api/v1/kitchen/today", headers=sh)
    assert r.status_code == 200 and r.json()["date"] == "2026-10-07"
    r = await client.get("/api/v1/staff/me", headers=h)
    assert r.status_code == 403


async def test_deactivated_staff_is_locked_out(client, today):
    h, _ = await register_owner(client)
    staff, sh = await make_staff(client, h)
    r = await client.patch(f"/api/v1/staff/{staff['id']}", json={"is_active": False}, headers=h)
    assert r.json()["is_active"] is False
    r = await client.get("/api/v1/kitchen/today", headers=sh)
    assert r.status_code == 401


async def test_staff_isolated_between_messes(client, today):
    h1, _ = await register_owner(client)
    h2, _ = await register_owner(client, phone="9876500000", mess_name="Other")
    staff, _ = await make_staff(client, h1)
    r = await client.patch(f"/api/v1/staff/{staff['id']}", json={"is_active": False}, headers=h2)
    assert r.status_code == 404
    r = await client.post(
        "/api/v1/ledger/entries",
        json={
            "kind": "staff_advance",
            "amount": "500",
            "occurred_on": "2026-10-07",
            "description": "Advance",
            "staff_user_id": staff["user_id"],
        },
        headers=h2,
    )
    assert r.status_code == 422 and r.json()["code"] == "STAFF_NOT_FOUND"


# --- salary, advances and the daily ledger --------------------------------------------


async def test_salary_advances_and_ledger(client, today):
    h, _ = await register_owner(client)
    staff, sh = await make_staff(client, h)

    async def entry(kind, amount, staff_id=None, d="2026-10-07"):
        r = await client.post(
            "/api/v1/ledger/entries",
            json={
                "kind": kind,
                "amount": amount,
                "occurred_on": d,
                "description": kind,
                "staff_user_id": staff_id,
            },
            headers=h,
        )
        assert r.status_code == 201, r.text
        return r.json()

    r = await client.post(
        "/api/v1/ledger/entries",
        json={
            "kind": "staff_advance",
            "amount": "500",
            "occurred_on": "2026-10-07",
            "description": "x",
        },
        headers=h,
    )
    assert r.status_code == 422 and r.json()["code"] == "STAFF_REQUIRED"
    await entry("staff_advance", "2000", staff["user_id"], "2026-10-03")
    await entry("advance_repayment", "500", staff["user_id"], "2026-10-05")
    await entry("salary_payment", "1000", staff["user_id"])
    gas = await entry("expense", "950")
    await entry("staff_advance", "700", staff["user_id"], "2026-09-20")  # last month

    r = await client.get("/api/v1/staff?month=2026-10", headers=h)
    month = r.json()[0]["month"]
    assert month == {
        "month": "2026-10-01",
        "salary": "9000.00",
        "advances": "2000.00",
        "repaid": "500.00",
        "paid": "1000.00",
        "payable": "6500.00",
    }
    r = await client.get("/api/v1/staff/me", headers=sh)
    assert r.status_code == 200 and r.json()["month"]["payable"] == "6500.00"
    assert len(r.json()["entries"]) == 4  # expenses are not the staff member's business

    r = await client.get("/api/v1/ledger?from=2026-10-01&to=2026-10-31", headers=h)
    t = r.json()["totals"]
    assert t["cash_out"] == "3950.00" and t["cash_in"] == "500.00"
    r = await client.delete(f"/api/v1/ledger/entries/{gas['id']}", headers=h)
    assert r.status_code == 204
    r = await client.get("/api/v1/ledger?from=2026-10-01&to=2026-10-31", headers=h)
    assert r.json()["totals"]["expense"] == "0.00"


async def test_ledger_includes_member_and_company_collections(client, today):
    h, _ = await register_owner(client)
    plan = await create_plan(client, h, fee="2000")
    await create_member(client, h, plan["id"], paid_amount="1500")
    c = (await client.post("/api/v1/tiffin-clients", json={"name": "Assa"}, headers=h)).json()
    await client.post(
        f"/api/v1/tiffin-clients/{c['id']}/payments",
        json={"amount": "3000", "method": "upi", "paid_on": "2026-10-07"},
        headers=h,
    )
    r = await client.get("/api/v1/ledger?from=2026-10-07&to=2026-10-07", headers=h)
    t = r.json()["totals"]
    assert t["member_collections"] == "1500.00" and t["company_collections"] == "3000.00"
    assert t["cash_in"] == "4500.00" and t["net"] == "4500.00"


# --- payment at registration, share links -----------------------------------------------


async def test_partial_payment_at_registration_then_rest(client, today):
    h, _ = await register_owner(client)
    plan = await create_plan(client, h, fee="2000")
    r = await client.post(
        "/api/v1/members",
        json={
            "name": "Amit",
            "phone": "9000000099",
            "plan_id": plan["id"],
            "joining_date": "2026-10-07",
            "paid_amount": "1000",
            "payment_method": "upi",
            "create_login": False,
        },
        headers=h,
    )
    assert r.status_code == 201, r.text
    m = r.json()["member"]
    assert r.json()["temp_password"] is None
    assert m["due"] == "1000.00" and len(m["share_token"]) >= 16
    r = await client.get("/api/v1/bills?month=2026-10", headers=h)
    bill = r.json()["items"][0]
    assert bill["status"] == "partial" and bill["paid"] == "1000.00"
    assert bill["payments"][0]["method"] == "upi"
    # the rest, mid-month
    r = await client.post(
        f"/api/v1/bills/{bill['id']}/payments",
        json={"amount": "1000", "method": "cash", "paid_on": "2026-10-20"},
        headers=h,
    )
    assert r.json()["status"] == "paid"
    r = await client.get(f"/api/v1/members/{m['id']}", headers=h)
    assert r.json()["due"] == "0.00"


async def test_overpayment_at_registration_refused(client, today):
    h, _ = await register_owner(client)
    plan = await create_plan(client, h, fee="2000")
    r = await client.post(
        "/api/v1/members",
        json={
            "name": "Amit",
            "phone": "9000000099",
            "plan_id": plan["id"],
            "joining_date": "2026-10-07",
            "paid_amount": "2500",
        },
        headers=h,
    )
    assert r.status_code == 422 and r.json()["code"] == "OVERPAYMENT"
    r = await client.get("/api/v1/members", headers=h)
    assert r.json()["total"] == 0


async def test_renewal_with_payment(client, today):
    h, _ = await register_owner(client)
    plan = await create_plan(client, h, fee="2000")
    m = (await create_member(client, h, plan["id"], paid_amount="2000"))["member"]
    assert m["due"] == "0.00"
    r = await client.post(
        f"/api/v1/members/{m['id']}/renew", json={"paid_amount": "500"}, headers=h
    )
    assert r.status_code == 200, r.text
    assert r.json()["bill"]["paid"] == "500.00" and r.json()["bill"]["status"] == "partial"


async def test_public_link_is_read_only_and_rotatable(client, today):
    h, _ = await register_owner(client, mess_name="Swad")
    plan = await create_plan(client, h, fee="2000")
    m = (await create_member(client, h, plan["id"], paid_amount="500"))["member"]
    await client.put("/api/v1/attendance", json=mark(m["id"]), headers=h)
    token = m["share_token"]
    r = await client.get(f"/api/v1/public/members/{token}?month=2026-10")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["mess_name"] == "Swad" and body["member"]["name"] == "Rahul"
    assert body["due"] == "1500.00" and body["days_left"] == 24
    assert body["history"]["present_count"] == 1
    assert r.headers["cache-control"] == "no-store"
    # nothing else is reachable with the token
    r = await client.get("/api/v1/members", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 401
    # new link: the old one stops working
    r = await client.post(f"/api/v1/members/{m['id']}/share-link", headers=h)
    assert r.json()["share_token"] != token
    r = await client.get(f"/api/v1/public/members/{token}")
    assert r.status_code == 404 and r.json()["code"] == "LINK_NOT_FOUND"


# --- simple company tiffins ---------------------------------------------------------------


async def make_company(client, h, **extra):
    r = await client.post(
        "/api/v1/tiffin-clients",
        json={
            "name": "Assa",
            "veg_price": "90",
            "nonveg_price": "130",
            "lunch": False,
            "dinner": True,
            **extra,
        },
        headers=h,
    )
    assert r.status_code == 201, r.text
    return r.json()


async def put_day(client, h, d, cid, veg, nonveg, meal="dinner"):
    return await client.put(
        "/api/v1/tiffin-day",
        json={
            "date": d,
            "entries": [{"client_id": cid, "meal_type": meal, "veg": veg, "nonveg": nonveg}],
        },
        headers=h,
    )


async def test_daily_veg_nonveg_entry(client, today):
    h, _ = await register_owner(client)
    c = await make_company(client, h)
    r = await client.get("/api/v1/tiffin-day?date=2026-10-06", headers=h)
    rows = r.json()["rows"]
    assert [(x["client_name"], x["meal_type"], x["saved"]) for x in rows] == [
        ("Assa", "dinner", False)
    ]
    r = await put_day(client, h, "2026-10-06", c["id"], 12, 6)
    row = r.json()["rows"][0]
    assert (row["veg"], row["nonveg"], row["amount"]) == (12, 6, "1860.00")
    assert r.json()["totals"]["total"] == 18
    # next day remembers yesterday for "same as last"
    r = await client.get("/api/v1/tiffin-day?date=2026-10-07", headers=h)
    row = r.json()["rows"][0]
    assert (row["last_date"], row["last_veg"], row["last_nonveg"]) == ("2026-10-06", 12, 6)
    # a rate change does not reprice saved days
    await client.patch(f"/api/v1/tiffin-clients/{c['id']}", json={"veg_price": "100"}, headers=h)
    r = await put_day(client, h, "2026-10-06", c["id"], 12, 6)
    assert r.json()["rows"][0]["amount"] == "1860.00"
    # zero removes the day
    r = await put_day(client, h, "2026-10-06", c["id"], 0, 0)
    assert r.json()["rows"][0]["saved"] is False


async def test_running_balance_with_random_day_payments(client, today):
    h, _ = await register_owner(client)
    c = await make_company(client, h)
    await put_day(client, h, "2026-09-29", c["id"], 10, 8)  # 900 + 1040 = 1940
    await put_day(client, h, "2026-10-02", c["id"], 14, 8)  # 1260 + 1040 = 2300
    await client.post(
        f"/api/v1/tiffin-clients/{c['id']}/payments",
        json={"amount": "1000", "method": "cash", "paid_on": "2026-10-05"},
        headers=h,
    )
    r = await client.get(f"/api/v1/tiffin-clients/{c['id']}/statement?month=2026-10", headers=h)
    st = r.json()
    assert st["opening_due"] == "1940.00" and st["amount"] == "2300.00"
    assert st["paid"] == "1000.00" and st["balance"] == "3240.00"
    day = st["days"][0]
    assert (day["dinner_veg"], day["dinner_nonveg"]) == (14, 8)
    r = await client.get("/api/v1/tiffin-clients/summary?month=2026-10", headers=h)
    assert r.json()["items"][0]["balance"] == "3240.00"


async def test_staff_enters_today_tiffins_without_prices(client, today):
    h, _ = await register_owner(client)
    c = await make_company(client, h)
    _, sh = await make_staff(client, h)
    r = await put_day(client, sh, "2026-10-07", c["id"], 18, 4)
    assert r.status_code == 200, r.text
    row = r.json()["rows"][0]
    assert row["veg"] == 18 and row["amount"] is None and row["veg_price"] is None
    r = await put_day(client, sh, "2026-10-06", c["id"], 1, 1)
    assert r.status_code == 403
    r = await client.get("/api/v1/kitchen/today", headers=sh)
    assert r.json()["dinner"]["tiffin_veg"] == 18 and r.json()["dinner"]["tiffin_nonveg"] == 4
    r = await client.get(f"/api/v1/tiffin-clients/{c['id']}/statement", headers=sh)
    assert r.status_code == 403
