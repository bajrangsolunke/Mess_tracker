from tests.factories import create_member, create_plan, login, register_owner


async def setup(client):
    h, _ = await register_owner(client)
    plan = await create_plan(client, h, fee="2500")
    a = await create_member(client, h, plan["id"], phone="9000000011", name="Rahul")
    b = await create_member(
        client, h, plan["id"], phone="9000000012", name="Amit", monthly_fee="2000"
    )
    return h, a["member"], b["member"], a["temp_password"]


async def test_generate_bills_for_month(client):
    h, a, b, _ = await setup(client)
    r = await client.post("/api/v1/bills/generate?month=2026-10", headers=h)
    assert r.status_code == 200, r.text
    assert r.json()["created"] == 2
    r = await client.get("/api/v1/bills?month=2026-10", headers=h)
    body = r.json()
    assert body["totals"] == {
        "billed": "4500.00",
        "collected": "0.00",
        "pending": "4500.00",
        "members": 2,
        "paid": 0,
    }
    fees = {x["member"]["name"]: x["amount"] for x in body["items"]}
    assert fees == {"Rahul": "2500.00", "Amit": "2000.00"}
    assert all(x["status"] == "unpaid" for x in body["items"])
    # idempotent
    r = await client.post("/api/v1/bills/generate?month=2026-10", headers=h)
    assert r.json()["created"] == 0


async def test_generate_skips_members_who_joined_later_or_inactive(client):
    h, a, b, _ = await setup(client)
    await client.post(f"/api/v1/members/{b['id']}/deactivate", headers=h)
    r = await client.post("/api/v1/bills/generate?month=2026-11", headers=h)
    assert r.json()["created"] == 1  # only Rahul
    r = await client.post("/api/v1/bills/generate?month=2026-09", headers=h)
    assert r.json()["created"] == 0  # nobody had joined


async def test_record_payment_updates_status(client):
    h, a, b, _ = await setup(client)
    await client.post("/api/v1/bills/generate?month=2026-10", headers=h)
    r = await client.get("/api/v1/bills?month=2026-10&status=unpaid", headers=h)
    bill = next(x for x in r.json()["items"] if x["member"]["id"] == a["id"])
    r = await client.post(
        f"/api/v1/bills/{bill['id']}/payments",
        json={"amount": "1000", "method": "upi", "paid_on": "2026-10-05"},
        headers=h,
    )
    assert r.status_code == 201, r.text
    assert (
        r.json()["status"] == "partial"
        and r.json()["paid"] == "1000.00"
        and r.json()["due"] == "1500.00"
    )
    r = await client.post(
        f"/api/v1/bills/{bill['id']}/payments",
        json={"amount": "1500", "method": "cash", "paid_on": "2026-10-06", "note": "Full"},
        headers=h,
    )
    assert r.json()["status"] == "paid" and r.json()["due"] == "0.00"
    assert len(r.json()["payments"]) == 2
    r = await client.get("/api/v1/bills?month=2026-10", headers=h)
    assert r.json()["totals"]["collected"] == "2500.00" and r.json()["totals"]["paid"] == 1
    r = await client.get("/api/v1/bills?month=2026-10&status=paid", headers=h)
    assert [x["member"]["name"] for x in r.json()["items"]] == ["Rahul"]


async def test_overpayment_rejected(client):
    h, a, b, _ = await setup(client)
    await client.post("/api/v1/bills/generate?month=2026-10", headers=h)
    r = await client.get("/api/v1/bills?month=2026-10", headers=h)
    bill = r.json()["items"][0]
    r = await client.post(
        f"/api/v1/bills/{bill['id']}/payments",
        json={"amount": "99999", "method": "cash", "paid_on": "2026-10-05"},
        headers=h,
    )
    assert r.status_code == 422 and r.json()["code"] == "OVERPAYMENT"


async def test_edit_bill_amount(client):
    h, a, b, _ = await setup(client)
    await client.post("/api/v1/bills/generate?month=2026-10", headers=h)
    r = await client.get("/api/v1/bills?month=2026-10", headers=h)
    bill = next(x for x in r.json()["items"] if x["member"]["id"] == a["id"])
    r = await client.patch(
        f"/api/v1/bills/{bill['id']}",
        json={"amount": "1250", "note": "Joined mid-month"},
        headers=h,
    )
    assert (
        r.status_code == 200
        and r.json()["amount"] == "1250.00"
        and r.json()["note"] == "Joined mid-month"
    )


async def test_customer_sees_own_bills(client):
    h, a, b, pw = await setup(client)
    await client.post("/api/v1/bills/generate?month=2026-10", headers=h)
    r = await client.get("/api/v1/bills?month=2026-10", headers=h)
    bill = next(x for x in r.json()["items"] if x["member"]["id"] == a["id"])
    await client.post(
        f"/api/v1/bills/{bill['id']}/payments",
        json={"amount": "2500", "method": "upi", "paid_on": "2026-10-05"},
        headers=h,
    )
    ch, _ = await login(client, "9000000011", pw)
    r = await client.get("/api/v1/me/bills", headers=ch)
    assert r.status_code == 200
    assert (
        len(r.json()) == 1
        and r.json()[0]["status"] == "paid"
        and r.json()[0]["payments"][0]["method"] == "upi"
    )
    r = await client.get("/api/v1/bills?month=2026-10", headers=ch)
    assert r.status_code == 403


async def test_payment_reminders_create_notifications(client):
    h, a, b, pw = await setup(client)
    await client.post("/api/v1/bills/generate?month=2026-10", headers=h)
    r = await client.post("/api/v1/notifications/payment-reminders?month=2026-10", headers=h)
    assert r.status_code == 200 and r.json()["sent"] == 2
    ch, _ = await login(client, "9000000011", pw)
    r = await client.get("/api/v1/notifications", headers=ch)
    assert r.json()["unread"] == 1 and r.json()["items"][0]["type"] == "payment_due"
    # re-sending within the same day is a no-op
    r = await client.post("/api/v1/notifications/payment-reminders?month=2026-10", headers=h)
    assert r.json()["sent"] == 0


async def test_delete_payment(client):
    h, a, b, _ = await setup(client)
    await client.post("/api/v1/bills/generate?month=2026-10", headers=h)
    r = await client.get("/api/v1/bills?month=2026-10", headers=h)
    bill = r.json()["items"][0]
    r = await client.post(
        f"/api/v1/bills/{bill['id']}/payments",
        json={"amount": "500", "method": "cash", "paid_on": "2026-10-05"},
        headers=h,
    )
    pid = r.json()["payments"][0]["id"]
    r = await client.delete(f"/api/v1/payments/{pid}", headers=h)
    assert r.status_code == 200 and r.json()["status"] == "unpaid" and r.json()["payments"] == []
