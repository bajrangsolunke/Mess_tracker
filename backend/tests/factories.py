"""Shared helpers for API tests: register an owner, get auth headers, create plans/members."""

from app.core.config import settings


async def register_owner(client, phone="9876543210", mess_name="Shree Mess", password="owner123"):
    r = await client.post(
        "/api/v1/auth/register-owner",
        json={
            "mess_name": mess_name,
            "owner_name": "Owner",
            "phone": phone,
            "password": password,
            "language": "mr",
            "invite_code": settings.owner_invite_code,
        },
    )
    assert r.status_code == 201, r.text
    body = r.json()
    return {"Authorization": f"Bearer {body['access_token']}"}, body


async def login(client, phone, password):
    r = await client.post("/api/v1/auth/login", json={"phone": phone, "password": password})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}, r.json()


async def create_plan(client, headers, name="Lunch + Dinner", lunch=True, dinner=True, fee="2500"):
    r = await client.post(
        "/api/v1/plans",
        json={"name": name, "includes_lunch": lunch, "includes_dinner": dinner, "monthly_fee": fee},
        headers=headers,
    )
    assert r.status_code == 201, r.text
    return r.json()


async def create_member(client, headers, plan_id, phone="9000000011", name="Rahul", **extra):
    payload = {
        "name": name,
        "phone": phone,
        "plan_id": plan_id,
        "joining_date": "2026-10-01",
        "room_no": "101",
        **extra,
    }
    r = await client.post("/api/v1/members", json=payload, headers=headers)
    assert r.status_code == 201, r.text
    return r.json()
