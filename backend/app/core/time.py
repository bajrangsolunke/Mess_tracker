from datetime import date, datetime, timedelta
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
    nxt = d.replace(day=28) + timedelta(days=4)
    return nxt.replace(day=1) - timedelta(days=1)


def add_months(d: date, n: int) -> date:
    """Same day n months later, clamped to the last day of the target month."""
    y, m = divmod(d.month - 1 + n, 12)
    target = date(d.year + y, m + 1, 1)
    return target.replace(day=min(d.day, month_end(target).day))


def membership_end(start: date) -> date:
    """Last day of a one-month membership that starts on `start` (7 Oct → 6 Nov, 1 Oct → 31 Oct).
    When the next month is shorter (31 Jan), the membership runs to the end of that month."""
    nxt = add_months(start, 1)
    if nxt.day < start.day:
        return nxt
    return nxt - timedelta(days=1)
