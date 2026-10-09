from datetime import datetime

import pytest

from app.core import time as t
from app.core.config import settings
from tests.factories import create_member, create_plan, login, register_owner


@pytest.fixture
def auto_close(monkeypatch):
    """Enable automatic absent marking and freeze the IST clock."""
    monkeypatch.setattr(settings, "auto_close_meals", True)

    def at(y, m, d, hh, mm=0):
        frozen = datetime(y, m, d, hh, mm, tzinfo=t.IST)
        for target in (
            "app.services.attendance.now_ist",
            "app.services.checkin.now_ist",
            "app.services.leaves.now_ist",
        ):
            monkeypatch.setattr(target, lambda: frozen)
        return frozen

    return at


async def setup(client):
    h, _ = await register_owner(client)
    plan = await create_plan(client, h)
    a = await create_member(
        client, h, plan["id"], phone="9000000011", name="Rahul", joining_date="2026-10-06"
    )
    b = await create_member(
        client, h, plan["id"], phone="9000000012", name="Amit", joining_date="2026-10-06"
    )
    return h, a, b


async def test_missed_meals_become_absent_after_meal_time(client, auto_close):
    h, a, b = await setup(client)
    auto_close(2026, 10, 7, 10)  # morning: nothing closed for today yet
    await client.put(
        "/api/v1/attendance",
        json={
            "date": "2026-10-06",
            "meal_type": "lunch",
            "items": [{"member_id": a["member"]["id"], "status": "present"}],
        },
        headers=h,
    )
    auto_close(2026, 10, 7, 16)  # after lunch ends (15:30), before dinner ends (23:00)
    r = await client.get("/api/v1/attendance?date=2026-10-07&meal_type=lunch", headers=h)
    body = r.json()
    assert body["counts"] == {
        "expected": 2,
        "present": 0,
        "absent": 2,
        "unmarked": 0,
        "on_leave": 0,
    }
    assert all(x["auto"] is True and x["status"] == "absent" for x in body["items"])
    assert body["closed"] is True
    # dinner today is still open
    r = await client.get("/api/v1/attendance?date=2026-10-07&meal_type=dinner", headers=h)
    assert r.json()["counts"]["unmarked"] == 2 and r.json()["closed"] is False
    # yesterday: Rahul's present untouched, Amit auto-absent; dinner both absent
    r = await client.get("/api/v1/attendance?date=2026-10-06&meal_type=lunch", headers=h)
    st = {x["member"]["name"]: (x["status"], x["auto"]) for x in r.json()["items"]}
    assert st == {"Rahul": ("present", False), "Amit": ("absent", True)}
    r = await client.get("/api/v1/attendance?date=2026-10-06&meal_type=dinner", headers=h)
    assert r.json()["counts"]["absent"] == 2


async def test_leave_and_holiday_are_not_auto_absent(client, auto_close):
    h, a, b = await setup(client)
    auto_close(2026, 10, 6, 12)
    ch, _ = await login(client, "9000000011", a["temp_password"])
    await client.post(
        "/api/v1/me/leaves", json={"date": "2026-10-07", "meal_types": ["lunch"]}, headers=ch
    )
    await client.post(
        "/api/v1/holidays", json={"date": "2026-10-07", "meal_type": "dinner"}, headers=h
    )
    auto_close(2026, 10, 8, 9)
    r = await client.get("/api/v1/attendance?date=2026-10-07&meal_type=lunch", headers=h)
    st = {x["member"]["name"]: (x["status"], x["on_leave"]) for x in r.json()["items"]}
    assert st == {"Rahul": (None, True), "Amit": ("absent", False)}
    assert r.json()["counts"]["on_leave"] == 1
    r = await client.get("/api/v1/attendance?date=2026-10-07&meal_type=dinner", headers=h)
    assert r.json()["holiday"] is not None and r.json()["items"] == []


async def test_marks_record_time_and_who(client, auto_close):
    h, a, b = await setup(client)
    auto_close(2026, 10, 7, 13, 25)
    r = await client.put(
        "/api/v1/attendance",
        json={
            "date": "2026-10-07",
            "meal_type": "lunch",
            "items": [{"member_id": a["member"]["id"], "status": "present"}],
        },
        headers=h,
    )
    row = next(x for x in r.json()["items"] if x["member"]["id"] == a["member"]["id"])
    assert row["status"] == "present" and row["auto"] is False
    assert row["marked_at"].startswith("2026-10-07T13:25") or row["marked_at"].startswith(
        "2026-10-07T07:55"
    )
    # owner can correct an automatic absent; it stops being automatic
    auto_close(2026, 10, 7, 16)
    await client.get("/api/v1/attendance?date=2026-10-07&meal_type=lunch", headers=h)
    r = await client.put(
        "/api/v1/attendance",
        json={
            "date": "2026-10-07",
            "meal_type": "lunch",
            "items": [{"member_id": b["member"]["id"], "status": "present"}],
            "override": True,
        },
        headers=h,
    )
    row = next(x for x in r.json()["items"] if x["member"]["id"] == b["member"]["id"])
    assert row["status"] == "present" and row["auto"] is False


async def test_member_history_shows_time_and_auto(client, auto_close):
    h, a, b = await setup(client)
    ch, _ = await login(client, "9000000011", a["temp_password"])
    auto_close(2026, 10, 7, 13, 5)
    await client.put(
        "/api/v1/attendance",
        json={
            "date": "2026-10-07",
            "meal_type": "lunch",
            "items": [{"member_id": a["member"]["id"], "status": "present"}],
        },
        headers=h,
    )
    auto_close(2026, 10, 8, 9)
    r = await client.get("/api/v1/attendance/history?month=2026-10", headers=ch)
    items = {(x["date"], x["meal_type"]): x for x in r.json()["items"]}
    assert (
        items[("2026-10-07", "lunch")]["status"] == "present"
        and items[("2026-10-07", "lunch")]["self_marked"] is False
    )
    assert items[("2026-10-07", "lunch")]["marked_at"] is not None
    assert (
        items[("2026-10-07", "dinner")]["status"] == "absent"
        and items[("2026-10-07", "dinner")]["auto"] is True
    )
    assert r.json()["absent_count"] == 3  # 6 lunch, 6 dinner, 7 dinner


async def test_today_view_shows_auto_absent_after_meal_time(client, auto_close):
    h, a, b = await setup(client)
    ch, _ = await login(client, "9000000011", a["temp_password"])
    auto_close(2026, 10, 7, 15, 45)
    r = await client.get("/api/v1/me/attendance/today", headers=ch)
    assert (
        r.json()["lunch"]["closed"] is True
        and r.json()["lunch"]["status"] == "absent"
        and r.json()["lunch"]["auto"] is True
    )
    assert r.json()["dinner"]["closed"] is False and r.json()["dinner"]["status"] is None


async def test_mark_all_only_touches_unmarked(client, auto_close):
    h, a, b = await setup(client)
    auto_close(2026, 10, 7, 12)
    await client.put(
        "/api/v1/attendance",
        json={
            "date": "2026-10-07",
            "meal_type": "lunch",
            "items": [{"member_id": a["member"]["id"], "status": "absent"}],
        },
        headers=h,
    )
    r = await client.post(
        "/api/v1/attendance/mark-all?date=2026-10-07&meal_type=lunch&status=present", headers=h
    )
    st = {x["member"]["name"]: x["status"] for x in r.json()["items"]}
    assert st == {"Rahul": "absent", "Amit": "present"}


async def test_meal_times_are_configurable(client, auto_close):
    h, a, b = await setup(client)
    r = await client.get("/api/v1/organization", headers=h)
    assert r.json()["lunch_end_time"] == "15:30:00" and r.json()["dinner_end_time"] == "23:00:00"
    r = await client.patch(
        "/api/v1/organization",
        json={"lunch_end_time": "14:00", "dinner_end_time": "22:00", "leave_cutoff_time": "21:00"},
        headers=h,
    )
    assert r.status_code == 200 and r.json()["lunch_end_time"] == "14:00:00"
    auto_close(2026, 10, 7, 14, 30)
    r = await client.get("/api/v1/attendance?date=2026-10-07&meal_type=lunch", headers=h)
    assert r.json()["closed"] is True and r.json()["counts"]["absent"] == 2
    ch, _ = await login(client, "9000000011", a["temp_password"])
    r = await client.patch("/api/v1/organization", json={"lunch_end_time": "13:00"}, headers=ch)
    assert r.status_code == 403
