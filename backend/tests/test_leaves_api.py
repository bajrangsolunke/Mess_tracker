from datetime import timedelta

import pytest

from app.core import time as t
from tests.factories import create_member, create_plan, login, register_owner


@pytest.fixture
def fixed_now(monkeypatch):
    """Freeze IST clock at 2026-10-07 18:00 so cutoff (22:00) has not passed."""
    from datetime import datetime

    frozen = datetime(2026, 10, 7, 18, 0, tzinfo=t.IST)
    monkeypatch.setattr(t, "now_ist", lambda: frozen)
    monkeypatch.setattr("app.services.leaves.now_ist", lambda: frozen)
    return frozen


async def setup(client):
    h, _ = await register_owner(client)
    plan = await create_plan(client, h)
    m = await create_member(client, h, plan["id"], phone="9000000011", name="Rahul")
    ch, _ = await login(client, "9000000011", m["temp_password"])
    return h, ch, m["member"]


async def test_customer_leave_before_cutoff_is_approved(client, fixed_now):
    h, ch, m = await setup(client)
    r = await client.post(
        "/api/v1/me/leaves",
        json={"date": "2026-10-08", "meal_types": ["lunch", "dinner"], "reason": "Going home"},
        headers=ch,
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert [x["status"] for x in body] == ["approved", "approved"]
    # it shows as on leave in the owner's sheet
    r = await client.get("/api/v1/attendance?date=2026-10-08&meal_type=lunch", headers=h)
    row = r.json()["items"][0]
    assert row["on_leave"] is True and row["leave_status"] == "approved"
    assert r.json()["counts"]["on_leave"] == 1


async def test_leave_after_cutoff_is_late(client, monkeypatch):
    from datetime import datetime

    frozen = datetime(2026, 10, 7, 22, 30, tzinfo=t.IST)
    monkeypatch.setattr("app.services.leaves.now_ist", lambda: frozen)
    h, ch, m = await setup(client)
    r = await client.post(
        "/api/v1/me/leaves", json={"date": "2026-10-08", "meal_types": ["lunch"]}, headers=ch
    )
    assert r.status_code == 201, r.text
    assert r.json()[0]["status"] == "late"
    # same-day leave is always late
    r = await client.post(
        "/api/v1/me/leaves", json={"date": "2026-10-07", "meal_types": ["dinner"]}, headers=ch
    )
    assert r.json()[0]["status"] == "late"
    # two days ahead is still approved even after cutoff
    r = await client.post(
        "/api/v1/me/leaves", json={"date": "2026-10-09", "meal_types": ["lunch"]}, headers=ch
    )
    assert r.json()[0]["status"] == "approved"


async def test_past_leave_rejected_422(client, fixed_now):
    h, ch, m = await setup(client)
    r = await client.post(
        "/api/v1/me/leaves", json={"date": "2026-10-06", "meal_types": ["lunch"]}, headers=ch
    )
    assert r.status_code == 422
    assert r.json()["code"] == "LEAVE_IN_PAST"


async def test_duplicate_leave_is_idempotent(client, fixed_now):
    h, ch, m = await setup(client)
    await client.post(
        "/api/v1/me/leaves", json={"date": "2026-10-08", "meal_types": ["lunch"]}, headers=ch
    )
    r = await client.post(
        "/api/v1/me/leaves",
        json={"date": "2026-10-08", "meal_types": ["lunch", "dinner"]},
        headers=ch,
    )
    assert r.status_code == 201
    r = await client.get("/api/v1/me/leaves?from=2026-10-01&to=2026-10-31", headers=ch)
    assert len(r.json()) == 2


async def test_customer_can_cancel_future_leave(client, fixed_now):
    h, ch, m = await setup(client)
    r = await client.post(
        "/api/v1/me/leaves", json={"date": "2026-10-10", "meal_types": ["lunch"]}, headers=ch
    )
    lid = r.json()[0]["id"]
    r = await client.delete(f"/api/v1/me/leaves/{lid}", headers=ch)
    assert r.status_code == 204
    r = await client.get("/api/v1/me/leaves?from=2026-10-01&to=2026-10-31", headers=ch)
    assert r.json() == []


async def test_owner_sees_leaves_and_decides_late_ones(client, monkeypatch):
    from datetime import datetime

    frozen = datetime(2026, 10, 7, 23, 0, tzinfo=t.IST)
    monkeypatch.setattr("app.services.leaves.now_ist", lambda: frozen)
    h, ch, m = await setup(client)
    r = await client.post(
        "/api/v1/me/leaves",
        json={"date": "2026-10-08", "meal_types": ["lunch"], "reason": "Sick"},
        headers=ch,
    )
    lid = r.json()[0]["id"]
    r = await client.get("/api/v1/leaves?from=2026-10-08&to=2026-10-08", headers=h)
    assert r.status_code == 200
    assert r.json()[0]["member"]["name"] == "Rahul" and r.json()[0]["status"] == "late"
    r = await client.get("/api/v1/leaves?from=2026-10-01&to=2026-10-31&status=late", headers=h)
    assert len(r.json()) == 1
    r = await client.post(f"/api/v1/leaves/{lid}/approve", headers=h)
    assert r.status_code == 200 and r.json()["status"] == "approved"
    # member got a notification
    r = await client.get("/api/v1/notifications", headers=ch)
    assert r.status_code == 200
    notes = r.json()["items"]
    assert notes[0]["type"] == "leave_decided" and r.json()["unread"] == 1
    r = await client.post(f"/api/v1/notifications/{notes[0]['id']}/read", headers=ch)
    assert r.status_code == 200
    r = await client.get("/api/v1/notifications", headers=ch)
    assert r.json()["unread"] == 0


async def test_reject_leave_puts_member_back_in_sheet(client, monkeypatch):
    from datetime import datetime

    frozen = datetime(2026, 10, 7, 23, 0, tzinfo=t.IST)
    monkeypatch.setattr("app.services.leaves.now_ist", lambda: frozen)
    h, ch, m = await setup(client)
    r = await client.post(
        "/api/v1/me/leaves", json={"date": "2026-10-08", "meal_types": ["lunch"]}, headers=ch
    )
    lid = r.json()[0]["id"]
    r = await client.post(f"/api/v1/leaves/{lid}/reject", headers=h)
    assert r.json()["status"] == "rejected"
    r = await client.get("/api/v1/attendance?date=2026-10-08&meal_type=lunch", headers=h)
    assert r.json()["items"][0]["on_leave"] is False


async def test_leave_blocked_when_month_closed(client, fixed_now):
    h, ch, m = await setup(client)
    await client.post("/api/v1/months/2026-10/close", headers=h)
    r = await client.post(
        "/api/v1/me/leaves", json={"date": "2026-10-08", "meal_types": ["lunch"]}, headers=ch
    )
    assert r.status_code == 409 and r.json()["code"] == "MONTH_CLOSED"


async def test_owner_cannot_use_customer_leave_routes(client, fixed_now):
    h, ch, m = await setup(client)
    r = await client.post(
        "/api/v1/me/leaves", json={"date": "2026-10-08", "meal_types": ["lunch"]}, headers=h
    )
    assert r.status_code == 403


def test_cutoff_rule_unit():
    from datetime import date, datetime, time

    from app.services.leaves import decide_status

    cutoff = time(22, 0)
    now = datetime(2026, 10, 7, 21, 59, tzinfo=t.IST)
    assert decide_status(date(2026, 10, 8), now, cutoff) == "approved"
    assert decide_status(date(2026, 10, 8), now + timedelta(minutes=2), cutoff) == "late"
    assert decide_status(date(2026, 10, 7), now, cutoff) == "late"
    assert decide_status(date(2026, 10, 9), now + timedelta(hours=2), cutoff) == "approved"
