from app.core.monitoring import _scrub


def test_scrub_removes_personal_data_and_link_secrets():
    event = {
        "request": {
            "url": "https://api/api/v1/public/members/7PGB3JW1D6jy23ZwsCiqmg?month=2026-10",
            "data": {"phone": "9000000001", "password": "x"},
            "headers": {"Authorization": "Bearer t"},
            "cookies": {"a": "b"},
        },
        "user": {"id": 1},
    }
    out = _scrub(event, None)
    assert "7PGB3JW1" not in out["request"]["url"] and "[link]" in out["request"]["url"]
    assert "data" not in out["request"] and "headers" not in out["request"]
    assert "user" not in out
