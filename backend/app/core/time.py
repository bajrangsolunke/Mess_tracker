from datetime import date, datetime
from zoneinfo import ZoneInfo

IST = ZoneInfo("Asia/Kolkata")


def now_ist() -> datetime:
    return datetime.now(IST)


def today_ist() -> date:
    return now_ist().date()


def month_start(d: date) -> date:
    return d.replace(day=1)


def parse_month(value: str) -> date:
    """'2026-10' or '2026-10-01' → date(2026, 10, 1). Raises ValueError otherwise."""
    parts = value.split("-")
    if len(parts) not in (2, 3):
        raise ValueError("month must be YYYY-MM")
    return date(int(parts[0]), int(parts[1]), 1)


def month_end(d: date) -> date:
    nxt = d.replace(day=28) + __import__("datetime").timedelta(days=4)
    return nxt.replace(day=1) - __import__("datetime").timedelta(days=1)
