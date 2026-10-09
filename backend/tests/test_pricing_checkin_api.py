from datetime import datetime

import pytest

from app.core import time as t
from tests.factories import create_member, login, register_owner


@pytest.fixture
def today_oct7(monkeypatch):
    frozen = datetime(2026, 10, 7, 13, 30, tzinfo=t.IST)
    monkeypatch.setattr("app.services.checkin.now_ist", lambda: frozen)
    return frozen


async def set_pricing(client, h, one="2000", two="3600", apply=False):
    r = await client.put(
        "/api/v1/pricing",
        json={"one_meal_price": one, "two_meal_price": two, "apply_to_existing": apply},
        headers=h,
    )
    assert r.status_code == 200, r.text
    return r.json()


# --- pricing -----------------------------------------------------------------------


async def test_pricing_unset_by_default(client):
    h, _ = await register_owner(client)
    r = await client.get("/api/v1/pricing", headers=h)
    assert r.status_code == 200
    assert r.json()["one_meal_price"] is None and r.json()["plans"]["two"] is None


async def test_set_pricing_creates_standard_plans(client):
    h, _ = await register_owner(client)
    body = await set_pricing(client, h)
    assert body["one_meal_price"] == "2000.00" and body["two_meal_price"] == "3600.00"
    plans = body["plans"]
    assert (
        plans["one_lunch"]["includes_lunch"] is True
        and plans["one_lunch"]["includes_dinner"] is False
    )
    assert (
        plans["one_dinner"]["includes_dinner"] is True
        and plans["one_dinner"]["includes_lunch"] is False
    )
    assert plans["two"]["includes_lunch"] and plans["two"]["includes_dinner"]
    assert (
        plans["one_lunch"]["monthly_fee"] == "2000.00" and plans["two"]["monthly_fee"] == "3600.00"
    )
    assert plans["two"]["kind"] == "two"
    # re-saving updates the same plans, does not duplicate
    await set_pricing(client, h, one="2100", two="3800")
    r = await client.get("/api/v1/plans", headers=h)
    assert len(r.json()) == 3
    assert {p["kind"]: p["monthly_fee"] for p in r.json()} == {
        "one_lunch": "2100.00",
        "one_dinner": "2100.00",
        "two": "3800.00",
    }


async def test_price_change_applies_to_existing_only_when_asked(client):
    h, _ = await register_owner(client)
    body = await set_pricing(client, h)
    m = await create_member(client, h, body["plans"]["two"]["id"])
    assert m["member"]["monthly_fee"] == "3600.00"
    r = await client.put(
        "/api/v1/pricing",
        json={"one_meal_price": "2000", "two_meal_price": "3800", "apply_to_existing": False},
        headers=h,
    )
    assert r.json()["updated_members"] == 0
    r = await client.get(f"/api/v1/members/{m['member']['id']}", headers=h)
    assert r.json()["monthly_fee"] == "3600.00"
    r = await client.put(
        "/api/v1/pricing",
        json={"one_meal_price": "2000", "two_meal_price": "3800", "apply_to_existing": True},
        headers=h,
    )
    assert r.json()["updated_members"] == 1
    r = await client.get(f"/api/v1/members/{m['member']['id']}", headers=h)
    assert r.json()["monthly_fee"] == "3800.00"


async def test_pricing_validation(client):
    h, _ = await register_owner(client)
    r = await client.put(
        "/api/v1/pricing", json={"one_meal_price": "0", "two_meal_price": "3600"}, headers=h
    )
    assert r.status_code == 422


# --- member self check-in (replaces notebook signature) ----------------------------


async def setup_member(client, plan_kind="two"):
    h, _ = await register_owner(client)
    body = await set_pricing(client, h)
    m = await create_member(client, h, body["plans"][plan_kind]["id"], joining_date="2026-10-01")
    ch, _ = await login(client, "9000000011", m["temp_password"])
    return h, ch, m["member"]


async def test_member_today_is_view_only(client, today_oct7):
    h, ch, m = await setup_member(client)
    r = await client.get("/api/v1/me/attendance/today", headers=ch)
    assert r.status_code == 200, r.text
    assert r.json()["date"] == "2026-10-07"
    lunch = r.json()["lunch"]
    keys = ("expected", "status", "self_marked", "on_leave", "holiday", "closed", "auto")
    assert {k: lunch[k] for k in keys} == {
        "expected": True,
        "status": None,
        "self_marked": False,
        "on_leave": False,
        "holiday": False,
        "closed": False,
        "auto": False,
    }
    # members cannot mark their own meals any more
    r = await client.post("/api/v1/me/attendance", json={"meal_type": "lunch"}, headers=ch)
    assert r.status_code in (404, 405)
    # the owner's mark shows up for the member
    await client.put(
        "/api/v1/attendance",
        json={
            "date": "2026-10-07",
            "meal_type": "lunch",
            "items": [{"member_id": m["id"], "status": "present"}],
        },
        headers=h,
    )
    r = await client.get("/api/v1/me/attendance/today", headers=ch)
    assert r.json()["lunch"]["status"] == "present" and r.json()["lunch"]["self_marked"] is False


async def test_today_view_plan_and_holiday(client, today_oct7):
    h, ch, m = await setup_member(client, plan_kind="one_dinner")
    r = await client.get("/api/v1/me/attendance/today", headers=ch)
    assert r.json()["lunch"]["expected"] is False and r.json()["dinner"]["expected"] is True
    await client.post(
        "/api/v1/holidays", json={"date": "2026-10-07", "meal_type": "dinner"}, headers=h
    )
    r = await client.get("/api/v1/me/attendance/today", headers=ch)
    assert r.json()["dinner"]["holiday"] is True


# --- notebook-style register ------------------------------------------------------------


async def test_register_grid(client):
    h, _ = await register_owner(client)
    body = await set_pricing(client, h)
    a = (
        await create_member(
            client,
            h,
            body["plans"]["two"]["id"],
            phone="9000000011",
            name="Rahul",
            joining_date="2026-10-01",
        )
    )["member"]
    b = (
        await create_member(
            client,
            h,
            body["plans"]["one_dinner"]["id"],
            phone="9000000012",
            name="Amit",
            joining_date="2026-10-05",
        )
    )["member"]
    await client.put(
        "/api/v1/attendance",
        json={
            "date": "2026-10-02",
            "meal_type": "lunch",
            "items": [{"member_id": a["id"], "status": "present"}],
        },
        headers=h,
    )
    await client.put(
        "/api/v1/attendance",
        json={
            "date": "2026-10-06",
            "meal_type": "dinner",
            "items": [
                {"member_id": a["id"], "status": "absent"},
                {"member_id": b["id"], "status": "present"},
            ],
        },
        headers=h,
    )
    await client.post(
        "/api/v1/holidays", json={"date": "2026-10-24", "meal_type": "all"}, headers=h
    )
    r = await client.get("/api/v1/attendance/register?month=2026-10", headers=h)
    assert r.status_code == 200, r.text
    reg = r.json()
    assert reg["days"] == 31 and reg["holidays"] == [{"date": "2026-10-24", "meal_type": "all"}]
    rows = {x["member"]["name"]: x for x in reg["rows"]}
    assert rows["Rahul"]["marks"] == {
        "2026-10-02": {"lunch": "present"},
        "2026-10-06": {"dinner": "absent"},
    }
    assert rows["Rahul"]["present"] == 1 and rows["Rahul"]["joining_date"] == "2026-10-01"
    assert rows["Amit"]["present"] == 1 and rows["Amit"]["joining_date"] == "2026-10-05"
