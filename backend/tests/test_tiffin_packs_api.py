"""Tiffin packs: 30 (1 time) / 60 (2 times) tiffins per period, 6-day buffer, renew when used up."""

from datetime import date, timedelta

import pytest

from tests.factories import create_member, login, register_owner
from tests.test_pricing_checkin_api import set_pricing


@pytest.fixture
def today(monkeypatch):
    holder = {"d": date(2026, 10, 1)}

    def set_today(d: date):
        holder["d"] = d

    for mod in (
        "app.services.membership",
        "app.services.members",
        "app.api.v1.members",
        "app.api.v1.membership",
        "app.api.v1.attendance",
        "app.api.v1.public",
    ):
        monkeypatch.setattr(f"{mod}.today_ist", lambda: holder["d"])
    return set_today


async def setup(client, kind="one_lunch"):
    h, _ = await register_owner(client)
    body = await set_pricing(client, h)
    plan = body["plans"][kind]
    assert plan["meal_credits"] == (60 if kind == "two" else 30)
    m = (await create_member(client, h, plan["id"], joining_date="2026-10-01"))["member"]
    return h, m


async def mark(client, h, mid, d, meal="lunch", status="present"):
    return await client.put(
        "/api/v1/attendance",
        json={"date": str(d), "meal_type": meal, "items": [{"member_id": mid, "status": status}]},
        headers=h,
    )


async def test_one_time_member_can_eat_both_meals_and_uses_two_tiffins(client, today):
    h, m = await setup(client)
    assert m["credits"]["total"] == 30 and m["credits"]["left"] == 30
    assert m["credits"]["use_by"] == "2026-11-06"  # 31 Oct + 6 days
    assert (await mark(client, h, m["id"], "2026-10-01")).status_code == 200
    r = await mark(client, h, m["id"], "2026-10-01", meal="dinner")
    assert r.status_code == 200, r.text
    row = r.json()["items"][0]
    assert row["extra"] is True and row["tiffins_left"] == 28
    r = await client.get(f"/api/v1/members/{m['id']}", headers=h)
    assert r.json()["credits"]["used"] == 2 and r.json()["credits"]["left"] == 28
    # absent does not use a tiffin, and correcting present -> absent gives it back
    await client.put(
        "/api/v1/attendance",
        json={
            "date": "2026-10-01",
            "meal_type": "dinner",
            "items": [{"member_id": m["id"], "status": "absent"}],
            "override": True,
        },
        headers=h,
    )
    r = await client.get(f"/api/v1/members/{m['id']}", headers=h)
    assert r.json()["credits"]["left"] == 29


async def test_pack_used_up_ends_membership_until_renewed(client, today):
    h, m = await setup(client)
    d = date(2026, 10, 1)
    for i in range(15):  # lunch + dinner for 15 days = 30 tiffins
        for meal in ("lunch", "dinner"):
            r = await mark(client, h, m["id"], d + timedelta(days=i), meal)
            assert r.status_code == 200, r.text
    r = await mark(client, h, m["id"], "2026-10-16")
    assert r.status_code == 409 and r.json()["code"] == "NO_TIFFINS_LEFT"
    # no longer expected, so no automatic absent either
    r = await client.get("/api/v1/attendance?date=2026-10-16&meal_type=lunch", headers=h)
    assert r.json()["items"] == []
    today(date(2026, 10, 16))
    r = await client.get("/api/v1/memberships/due", headers=h)
    row = next(x for x in r.json() if x["member"]["id"] == m["id"])
    assert row["used_up"] is True and row["credits"]["left"] == 0
    # renewing starts a new pack today, even within the same month
    r = await client.post(f"/api/v1/members/{m['id']}/renew", json={}, headers=h)
    assert r.status_code == 200, r.text
    assert r.json()["bill"]["period_start"] == "2026-10-16"
    assert r.json()["member"]["valid_until"] == "2026-11-15"
    assert r.json()["member"]["credits"]["left"] == 30
    assert (await mark(client, h, m["id"], "2026-10-16")).status_code == 200


async def test_leftovers_usable_for_six_days_then_lapse(client, today):
    h, m = await setup(client, kind="two")
    for i in range(10):
        await mark(client, h, m["id"], date(2026, 10, 1) + timedelta(days=i))
    # after the period, not expected any more, but can still be marked in the buffer
    r = await client.get("/api/v1/attendance?date=2026-11-03&meal_type=lunch", headers=h)
    assert r.json()["items"] == []
    assert (await mark(client, h, m["id"], "2026-11-06", "dinner")).status_code == 200
    r = await mark(client, h, m["id"], "2026-11-07")
    assert r.status_code == 409 and r.json()["code"] == "MEMBERSHIP_EXPIRED"


async def test_renewal_overlap_uses_older_leftovers_first(client, today):
    h, m = await setup(client)
    today(date(2026, 10, 30))
    r = await client.post(f"/api/v1/members/{m['id']}/renew", json={}, headers=h)
    assert r.json()["bill"]["period_start"] == "2026-11-01"
    await mark(client, h, m["id"], "2026-11-02")
    today(date(2026, 11, 2))
    r = await client.get(f"/api/v1/members/{m['id']}", headers=h)
    c = r.json()["credits"]
    # the old pack (30, unused) is in use; both packs count as left
    assert c["start"] == "2026-10-01" and c["used"] == 1 and c["left"] == 59


async def test_search_by_id_and_mark(client, today):
    h, m = await setup(client)
    other = await create_member(client, h, m["plan"]["id"], phone="9000000012", name="Sneha")
    today(date(2026, 10, 1))
    r = await client.get(f"/api/v1/attendance/search?q={m['member_no']}", headers=h)
    rows = r.json()
    assert rows[0]["member"]["id"] == m["id"]
    assert rows[0]["lunch"]["allowed"] is True and rows[0]["dinner"]["allowed"] is True
    assert rows[0]["credits"]["left"] == 30
    await mark(client, h, m["id"], "2026-10-01")
    r = await client.get("/api/v1/attendance/search?q=Rah", headers=h)
    row = r.json()[0]
    assert row["lunch"]["status"] == "present" and row["lunch"]["allowed"] is False
    r = await client.get("/api/v1/attendance/search?q=9000000012", headers=h)
    assert [x["member"]["name"] for x in r.json()] == [other["member"]["name"]]


async def test_public_link_shows_tiffins_left(client, today):
    h, m = await setup(client)
    await mark(client, h, m["id"], "2026-10-01")
    r = await client.get(f"/api/v1/public/members/{m['share_token']}")
    assert r.json()["credits"]["left"] == 29


async def test_unlimited_plans_unchanged(client, today):
    h, _ = await register_owner(client)
    r = await client.post(
        "/api/v1/plans",
        json={
            "name": "Special",
            "includes_lunch": True,
            "includes_dinner": False,
            "monthly_fee": "1500",
        },
        headers=h,
    )
    m = (await create_member(client, h, r.json()["id"]))["member"]
    assert m["credits"] is None
    assert (await mark(client, h, m["id"], "2026-10-02")).status_code == 200


async def test_customer_login_still_works_with_packs(client, today):
    h, m = await setup(client)
    assert m["user_id"] is not None
    ch, _ = await login(
        client,
        "9000000011",
        (await client.post(f"/api/v1/members/{m['id']}/reset-password", headers=h)).json()[
            "temp_password"
        ],
    )
    r = await client.get("/api/v1/me/attendance/today", headers=ch)
    assert r.status_code == 200
