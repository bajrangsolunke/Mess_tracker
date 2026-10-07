from tests.factories import create_member, create_plan, login, register_owner


async def setup(client):
    h, _ = await register_owner(client)
    full = await create_plan(client, h, name="Full", lunch=True, dinner=True)
    dinner_only = await create_plan(client, h, name="Dinner", lunch=False, dinner=True, fee="1500")
    a = await create_member(client, h, full["id"], phone="9000000011", name="Rahul")
    b = await create_member(client, h, dinner_only["id"], phone="9000000012", name="Amit")
    c = await create_member(client, h, full["id"], phone="9000000013", name="Sneha")
    return h, a, b, c


async def test_expected_list_respects_plan(client):
    h, a, b, c = await setup(client)
    r = await client.get("/api/v1/attendance?date=2026-10-07&meal_type=lunch", headers=h)
    assert r.status_code == 200, r.text
    body = r.json()
    assert [x["member"]["name"] for x in body["items"]] == ["Rahul", "Sneha"]  # Amit is dinner-only
    assert body["counts"] == {
        "expected": 2,
        "present": 0,
        "absent": 0,
        "unmarked": 2,
        "on_leave": 0,
    }
    assert body["locked"] is False
    r = await client.get("/api/v1/attendance?date=2026-10-07&meal_type=dinner", headers=h)
    assert len(r.json()["items"]) == 3


async def test_bulk_mark_and_counts(client):
    h, a, b, c = await setup(client)
    r = await client.put(
        "/api/v1/attendance",
        json={
            "date": "2026-10-07",
            "meal_type": "dinner",
            "items": [
                {"member_id": a["member"]["id"], "status": "present"},
                {"member_id": b["member"]["id"], "status": "absent"},
            ],
        },
        headers=h,
    )
    assert r.status_code == 200, r.text
    counts = r.json()["counts"]
    assert counts == {"expected": 3, "present": 1, "absent": 1, "unmarked": 1, "on_leave": 0}
    # re-marking overwrites
    r = await client.put(
        "/api/v1/attendance",
        json={
            "date": "2026-10-07",
            "meal_type": "dinner",
            "items": [{"member_id": b["member"]["id"], "status": "present"}],
        },
        headers=h,
    )
    assert r.json()["counts"]["present"] == 2


async def test_mark_all_present_endpoint(client):
    h, a, b, c = await setup(client)
    r = await client.post(
        "/api/v1/attendance/mark-all?date=2026-10-07&meal_type=lunch&status=present", headers=h
    )
    assert r.status_code == 200, r.text
    assert r.json()["counts"]["present"] == 2


async def test_inactive_member_not_expected(client):
    h, a, b, c = await setup(client)
    await client.post(f"/api/v1/members/{c['member']['id']}/deactivate", headers=h)
    r = await client.get("/api/v1/attendance?date=2026-10-07&meal_type=lunch", headers=h)
    assert [x["member"]["name"] for x in r.json()["items"]] == ["Rahul"]


async def test_joining_date_excludes_earlier_days(client):
    h, a, b, c = await setup(client)
    r = await client.get("/api/v1/attendance?date=2026-09-30&meal_type=lunch", headers=h)
    assert r.json()["items"] == []


async def test_holiday_blocks_attendance(client):
    h, a, b, c = await setup(client)
    r = await client.post(
        "/api/v1/holidays",
        json={"date": "2026-10-24", "meal_type": "all", "reason": "Diwali"},
        headers=h,
    )
    assert r.status_code == 201, r.text
    r = await client.get("/api/v1/attendance?date=2026-10-24&meal_type=lunch", headers=h)
    assert r.json()["holiday"]["reason"] == "Diwali"
    assert r.json()["items"] == []
    # lunch-only holiday keeps dinner
    await client.post(
        "/api/v1/holidays", json={"date": "2026-10-25", "meal_type": "lunch"}, headers=h
    )
    r = await client.get("/api/v1/attendance?date=2026-10-25&meal_type=dinner", headers=h)
    assert len(r.json()["items"]) == 3
    r = await client.get("/api/v1/holidays?from=2026-10-01&to=2026-10-31", headers=h)
    assert len(r.json()) == 2
    hid = r.json()[0]["id"]
    r = await client.delete(f"/api/v1/holidays/{hid}", headers=h)
    assert r.status_code == 204


async def test_month_close_locks_attendance(client):
    h, a, b, c = await setup(client)
    r = await client.post("/api/v1/months/2026-10/close", headers=h)
    assert r.status_code == 200, r.text
    r = await client.get("/api/v1/attendance?date=2026-10-07&meal_type=lunch", headers=h)
    assert r.json()["locked"] is True
    r = await client.put(
        "/api/v1/attendance",
        json={
            "date": "2026-10-07",
            "meal_type": "lunch",
            "items": [{"member_id": a["member"]["id"], "status": "present"}],
        },
        headers=h,
    )
    assert r.status_code == 409
    assert r.json()["code"] == "MONTH_CLOSED"
    r = await client.get("/api/v1/months?year=2026", headers=h)
    assert r.json() == [{"month": "2026-10-01", "closed": True}] or any(
        m["month"] == "2026-10-01" and m["closed"] for m in r.json()
    )
    r = await client.delete("/api/v1/months/2026-10/close", headers=h)
    assert r.status_code == 200
    r = await client.get("/api/v1/attendance?date=2026-10-07&meal_type=lunch", headers=h)
    assert r.json()["locked"] is False


async def test_history_and_summary(client):
    h, a, b, c = await setup(client)
    for d in ["2026-10-05", "2026-10-06"]:
        await client.put(
            "/api/v1/attendance",
            json={
                "date": d,
                "meal_type": "lunch",
                "items": [{"member_id": a["member"]["id"], "status": "present"}],
            },
            headers=h,
        )
    await client.put(
        "/api/v1/attendance",
        json={
            "date": "2026-10-06",
            "meal_type": "dinner",
            "items": [{"member_id": a["member"]["id"], "status": "absent"}],
        },
        headers=h,
    )
    r = await client.get(
        f"/api/v1/attendance/history?member_id={a['member']['id']}&month=2026-10", headers=h
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["present_count"] == 2
    assert {(x["date"], x["meal_type"], x["status"]) for x in body["items"]} == {
        ("2026-10-05", "lunch", "present"),
        ("2026-10-06", "lunch", "present"),
        ("2026-10-06", "dinner", "absent"),
    }
    r = await client.get("/api/v1/attendance/summary?month=2026-10", headers=h)
    row = next(x for x in r.json() if x["member"]["id"] == a["member"]["id"])
    assert row["lunch_present"] == 2 and row["dinner_present"] == 0 and row["total_present"] == 2


async def test_customer_sees_only_own_history(client):
    h, a, b, c = await setup(client)
    await client.put(
        "/api/v1/attendance",
        json={
            "date": "2026-10-05",
            "meal_type": "lunch",
            "items": [{"member_id": a["member"]["id"], "status": "present"}],
        },
        headers=h,
    )
    ch, _ = await login(client, "9000000011", a["temp_password"])
    r = await client.get("/api/v1/attendance/history?month=2026-10", headers=ch)
    assert r.status_code == 200 and r.json()["present_count"] == 1
    # cannot peek at another member
    r = await client.get(
        f"/api/v1/attendance/history?member_id={c['member']['id']}&month=2026-10", headers=ch
    )
    assert r.status_code == 200 and r.json()["member"]["id"] == a["member"]["id"]
    r = await client.get("/api/v1/attendance?date=2026-10-05&meal_type=lunch", headers=ch)
    assert r.status_code == 403


async def test_unknown_member_in_bulk_404(client):
    h, a, b, c = await setup(client)
    r = await client.put(
        "/api/v1/attendance",
        json={
            "date": "2026-10-07",
            "meal_type": "lunch",
            "items": [{"member_id": 99999, "status": "present"}],
        },
        headers=h,
    )
    assert r.status_code == 404
