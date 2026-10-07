from datetime import date, datetime

from app.core import time as t
from app.core.time import membership_end
from tests.factories import create_member, login, register_owner


def freeze(monkeypatch, y, m, d, hh=12):
    frozen = datetime(y, m, d, hh, 0, tzinfo=t.IST)
    for target in (
        "app.services.membership.now_ist",
        "app.services.checkin.now_ist",
        "app.services.leaves.now_ist",
    ):
        monkeypatch.setattr(target, lambda: frozen)
    monkeypatch.setattr("app.services.membership.today_ist", lambda: frozen.date())
    monkeypatch.setattr("app.services.members.today_ist", lambda: frozen.date())
    return frozen


async def setup(client, joining="2026-10-07", kind="two"):
    h, _ = await register_owner(client)
    r = await client.put(
        "/api/v1/pricing", json={"one_meal_price": "2000", "two_meal_price": "3600"}, headers=h
    )
    plans = r.json()["plans"]
    m = await create_member(client, h, plans[kind]["id"], joining_date=joining)
    ch, _ = await login(client, "9000000011", m["temp_password"])
    return h, ch, m["member"], plans


def test_membership_end_rules():
    assert membership_end(date(2026, 10, 7)) == date(2026, 11, 6)
    assert membership_end(date(2026, 10, 1)) == date(2026, 10, 31)
    assert membership_end(date(2026, 1, 31)) == date(2026, 2, 28)
    assert membership_end(date(2026, 12, 15)) == date(2027, 1, 14)


async def test_enrollment_sets_validity_and_first_bill(client):
    h, ch, m, plans = await setup(client)
    assert m["valid_until"] == "2026-11-06"
    r = await client.get("/api/v1/bills?month=2026-10", headers=h)
    bills = r.json()["items"]
    assert len(bills) == 1
    assert (
        bills[0]["amount"] == "3600.00"
        and bills[0]["period_start"] == "2026-10-07"
        and bills[0]["period_end"] == "2026-11-06"
    )


async def test_owner_renews_continuously_and_can_switch_plan(client, monkeypatch):
    h, ch, m, plans = await setup(client)
    freeze(monkeypatch, 2026, 11, 5)
    r = await client.post(
        f"/api/v1/members/{m['id']}/renew", json={"plan_id": plans["one_dinner"]["id"]}, headers=h
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["member"]["valid_until"] == "2026-12-06"
    assert (
        body["member"]["plan"]["kind"] == "one_dinner"
        and body["member"]["monthly_fee"] == "2000.00"
    )
    assert body["bill"]["period_start"] == "2026-11-07" and body["bill"]["amount"] == "2000.00"
    # member was notified
    r = await client.get("/api/v1/notifications", headers=ch)
    assert any(
        "2026" in n["title"] or "Dec" in n["title"] or "06" in n["title"] for n in r.json()["items"]
    )


async def test_lapsed_membership_renews_from_today(client, monkeypatch):
    h, ch, m, plans = await setup(client)
    freeze(monkeypatch, 2026, 11, 20)
    r = await client.post(f"/api/v1/members/{m['id']}/renew", json={}, headers=h)
    assert (
        r.json()["bill"]["period_start"] == "2026-11-20"
        and r.json()["member"]["valid_until"] == "2026-12-19"
    )
    assert r.json()["bill"]["amount"] == "3600.00"


async def test_owner_can_choose_start_date(client, monkeypatch):
    h, ch, m, plans = await setup(client)
    freeze(monkeypatch, 2026, 11, 20)
    r = await client.post(
        f"/api/v1/members/{m['id']}/renew", json={"start_date": "2026-11-07"}, headers=h
    )
    assert r.json()["member"]["valid_until"] == "2026-12-06"


async def test_expired_member_not_expected_and_cannot_check_in(client, monkeypatch):
    h, ch, m, plans = await setup(client, joining="2026-10-01")
    r = await client.get("/api/v1/attendance?date=2026-10-31&meal_type=lunch", headers=h)
    assert len(r.json()["items"]) == 1
    r = await client.get("/api/v1/attendance?date=2026-11-01&meal_type=lunch", headers=h)
    assert r.json()["items"] == []
    freeze(monkeypatch, 2026, 11, 2)
    r = await client.post("/api/v1/me/attendance", json={"meal_type": "lunch"}, headers=ch)
    assert r.status_code == 409 and r.json()["code"] == "MEMBERSHIP_EXPIRED"


async def test_customer_requests_renewal_owner_sees_and_confirms(client, monkeypatch):
    h, ch, m, plans = await setup(client)
    freeze(monkeypatch, 2026, 11, 4)
    r = await client.get("/api/v1/me/plans", headers=ch)
    assert {p["kind"] for p in r.json()} == {"one_lunch", "one_dinner", "two"}
    r = await client.post(
        "/api/v1/me/renewal", json={"plan_id": plans["one_lunch"]["id"]}, headers=ch
    )
    assert r.status_code == 200, r.text
    assert (
        r.json()["renewal_plan"]["kind"] == "one_lunch"
        and r.json()["renewal_requested_at"] is not None
    )
    # owner notified + appears in due list
    r = await client.get("/api/v1/notifications", headers=h)
    assert r.json()["unread"] >= 1
    r = await client.get("/api/v1/memberships/due", headers=h)
    row = r.json()[0]
    assert (
        row["member"]["id"] == m["id"]
        and row["renewal_plan"]["kind"] == "one_lunch"
        and row["days_left"] == 2
    )
    # owner confirms using the requested plan by default
    r = await client.post(f"/api/v1/members/{m['id']}/renew", json={}, headers=h)
    assert r.json()["member"]["plan"]["kind"] == "one_lunch"
    assert r.json()["member"]["renewal_plan"] is None
    r = await client.get("/api/v1/memberships/due", headers=h)
    assert r.json() == []


async def test_customer_can_cancel_request(client, monkeypatch):
    h, ch, m, plans = await setup(client)
    freeze(monkeypatch, 2026, 11, 4)
    await client.post("/api/v1/me/renewal", json={"plan_id": plans["two"]["id"]}, headers=ch)
    r = await client.delete("/api/v1/me/renewal", headers=ch)
    assert r.status_code == 200 and r.json()["renewal_plan"] is None


async def test_due_list_includes_expiring_and_expired(client, monkeypatch):
    h, _ = await register_owner(client)
    r = await client.put(
        "/api/v1/pricing", json={"one_meal_price": "2000", "two_meal_price": "3600"}, headers=h
    )
    pid = r.json()["plans"]["two"]["id"]
    await create_member(
        client, h, pid, phone="9000000011", name="Soon", joining_date="2026-10-10"
    )  # till 11-09
    await create_member(
        client, h, pid, phone="9000000012", name="Expired", joining_date="2026-09-20"
    )  # till 10-19
    await create_member(
        client, h, pid, phone="9000000013", name="Later", joining_date="2026-10-30"
    )  # till 11-29
    freeze(monkeypatch, 2026, 11, 5)
    r = await client.get("/api/v1/memberships/due", headers=h)
    names = [x["member"]["name"] for x in r.json()]
    assert names == ["Expired", "Soon"]
    assert r.json()[0]["days_left"] < 0
    r = await client.get("/api/v1/dashboard/owner?date=2026-11-05", headers=h)
    assert r.json()["renewals_due"] == 2


async def test_customer_dashboard_shows_membership(client, monkeypatch):
    h, ch, m, plans = await setup(client)
    freeze(monkeypatch, 2026, 11, 1)
    r = await client.get("/api/v1/dashboard/me?date=2026-11-01", headers=ch)
    ms = r.json()["membership"]
    assert ms["valid_until"] == "2026-11-06" and ms["days_left"] == 5 and ms["expired"] is False
