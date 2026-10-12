"""Slow down password and setup-code guessing.

Every wrong attempt is stored under the keys it touches (the phone number and the caller's
IP). Once a key reaches its limit within 15 minutes, further attempts are refused with 429
until the oldest of those failures is 15 minutes old. A correct login clears its phone key.
Kept in the database so limits survive restarts and work with several server instances.
"""

from datetime import UTC, datetime, timedelta

from fastapi import Request
from sqlalchemy import delete, func, insert, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ApiError
from app.models import FailedAttempt

WINDOW = timedelta(minutes=15)
LIMITS = {"phone": 5, "ip": 20, "invite": 5, "pw": 5}


def client_ip(request: Request) -> str:
    """Caller IP; behind Render/Netlify the original address is the first X-Forwarded-For."""
    forwarded = request.headers.get("x-forwarded-for", "")
    ip = forwarded.split(",")[0].strip() if forwarded else ""
    return (ip or (request.client.host if request.client else "unknown"))[:60]


async def check(db: AsyncSession, keys: list[str]) -> None:
    since = datetime.now(UTC) - WINDOW
    for key in keys:
        limit = LIMITS[key.split(":", 1)[0]]
        count, oldest = (
            await db.execute(
                select(func.count(), func.min(FailedAttempt.created_at)).where(
                    FailedAttempt.key == key, FailedAttempt.created_at >= since
                )
            )
        ).one()
        if count >= limit:
            wait = max(int((oldest + WINDOW - datetime.now(UTC)).total_seconds()), 60)
            minutes = -(-wait // 60)
            raise ApiError(
                429,
                "TOO_MANY_ATTEMPTS",
                f"Too many wrong attempts. Try again in {minutes} minutes.",
                retry_after=wait,
            )


async def fail(db: AsyncSession, keys: list[str]) -> None:
    """Record a wrong attempt and commit it (the request itself is about to fail)."""
    await db.execute(insert(FailedAttempt), [{"key": k} for k in keys])
    await db.execute(
        delete(FailedAttempt).where(
            FailedAttempt.created_at < datetime.now(UTC) - timedelta(days=1)
        )
    )
    await db.commit()


async def clear(db: AsyncSession, keys: list[str]) -> None:
    await db.execute(delete(FailedAttempt).where(FailedAttempt.key.in_(keys)))
