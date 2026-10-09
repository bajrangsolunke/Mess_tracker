"""Push notifications: who gets what, delivered after commit (fake sender)."""

import json
from datetime import date

import pytest

from app.core.config import settings
from app.services import push
from tests.factories import create_member, login, register_owner
from tests.test_pricing_checkin_api import set_pricing

SUB = {
    "keys": {"p256dh": "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA", "auth": "tBHItJI5svbpez7KI4CCXg"}
}


@pytest.fixture
def sent(monkeypatch):
    out: list[dict] = []
    monkeypatch.setattr(settings, "push_enabled", True)
    monkeypatch.setattr(
        push,
        "sender",
        lambda item, key: out.append({"to": item.endpoint, **json.loads(item.payload)}),
    )
    for mod in (
        "app.api.v1.attendance",
        "app.api.v1.tiffin",
        "app.api.v1.operations",
        "app.services.members",
    ):
        monkeypatch.setattr(f"{mod}.today_ist", lambda: date(2026, 10, 7))
    return out


async def subscribe(client, endpoint, headers=None, token=None):
    body = {"endpoint": endpoint, **SUB}
    url = f"/api/v1/public/members/{token}/push" if token else "/api/v1/push/subscriptions"
    r = await client.post(url, json=body, headers=headers or {})
    assert r.status_code == 204, r.text


async def make_staff(client, h):
    r = await client.post(
        "/api/v1/staff",
        json={"name": "Ganesh", "phone": "9111111111", "monthly_salary": "9000"},
        headers=h,
    )
    sh, _ = await login(client, "9111111111", r.json()["temp_password"])
    return r.json()["staff"], sh


async def test_public_key_is_created_once(client):
    a = (await client.get("/api/v1/push/key")).json()
    b = (await client.get("/api/v1/push/key")).json()
    assert a["public_key"] == b["public_key"] and len(a["public_key"]) == 87


async def test_member_gets_meal_and_payment_pushes(client, sent):
    h, _ = await register_owner(client)
    body = await set_pricing(client, h)
    m = (
        await create_member(client, h, body["plans"]["one_lunch"]["id"], joining_date="2026-10-01")
    )["member"]
    await subscribe(client, "https://push.example.com/member-phone", token=m["share_token"])
    await push.drain()
    assert sent[-1]["to"] == "https://push.example.com/member-phone"  # welcome / test message
    _, sh = await make_staff(client, h)
    r = await client.put(
        "/api/v1/attendance",
        json={
            "date": "2026-10-07",
            "meal_type": "lunch",
            "items": [{"member_id": m["id"], "status": "present"}],
        },
        headers=sh,
    )
    assert r.status_code == 200, r.text
    await push.drain()
    msg = sent[-1]
    assert (
        msg["title"].endswith("✓")
        and "29" in msg["body"]
        and msg["url"] == f"/m/{m['share_token']}"
    )
    bill = (await client.get("/api/v1/bills?month=2026-10", headers=h)).json()["items"][0]
    await client.post(
        f"/api/v1/bills/{bill['id']}/payments",
        json={"amount": "500", "method": "upi", "paid_on": "2026-10-07"},
        headers=h,
    )
    await push.drain()
    assert "₹500" in sent[-1]["title"] and "₹1,500" in sent[-1]["body"]


async def test_owner_hears_about_staff_tiffin_entry(client, sent):
    h, _ = await register_owner(client)
    await subscribe(client, "https://push.example.com/owner-phone", headers=h)
    _, sh = await make_staff(client, h)
    c = (
        await client.post(
            "/api/v1/tiffin-clients",
            json={"name": "Assa", "lunch": False, "dinner": True},
            headers=h,
        )
    ).json()
    r = await client.put(
        "/api/v1/tiffin-day",
        json={
            "date": "2026-10-07",
            "entries": [{"client_id": c["id"], "meal_type": "dinner", "veg": 18, "nonveg": 4}],
        },
        headers=sh,
    )
    assert r.status_code == 200, r.text
    await push.drain()
    msg = sent[-1]
    assert msg["to"] == "https://push.example.com/owner-phone"
    assert "Assa: 18" in msg["body"] and "Ganesh" in msg["body"]
    inbox = (await client.get("/api/v1/notifications", headers=h)).json()
    assert inbox["unread"] >= 1
    assert inbox["items"][0]["url"] == "/owner/tiffins?date=2026-10-07"  # tap opens that day
    # saving the same counts again is not news
    n = len(sent)
    await client.put(
        "/api/v1/tiffin-day",
        json={
            "date": "2026-10-07",
            "entries": [{"client_id": c["id"], "meal_type": "dinner", "veg": 18, "nonveg": 4}],
        },
        headers=sh,
    )
    await push.drain()
    assert len(sent) == n


async def test_staff_hears_about_new_member_and_own_advance(client, sent):
    h, _ = await register_owner(client)
    staff, sh = await make_staff(client, h)
    await subscribe(client, "https://push.example.com/staff-phone", headers=sh)
    body = await set_pricing(client, h)
    await create_member(client, h, body["plans"]["two"]["id"], name="Kiran")
    await push.drain()
    assert "Kiran" in sent[-1]["title"] and sent[-1]["to"].endswith("staff-phone")
    await client.post(
        "/api/v1/ledger/entries",
        json={
            "kind": "staff_advance",
            "amount": "1500",
            "occurred_on": "2026-10-07",
            "description": "Advance",
            "staff_user_id": staff["user_id"],
        },
        headers=h,
    )
    await push.drain()
    assert "₹1,500" in sent[-1]["title"]


async def test_unsubscribe_stops_pushes(client, sent):
    h, _ = await register_owner(client)
    await subscribe(client, "https://push.example.com/x", headers=h)
    r = await client.delete(
        "/api/v1/push/subscriptions?endpoint=https://push.example.com/x", headers=h
    )
    assert r.status_code == 204
    await client.post("/api/v1/push/test", headers=h)
    await push.drain()
    assert sent == []


async def test_bad_endpoint_rejected(client):
    h, _ = await register_owner(client)
    r = await client.post(
        "/api/v1/push/subscriptions", json={"endpoint": "http://evil", **SUB}, headers=h
    )
    assert r.status_code == 422
