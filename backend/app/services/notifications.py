from datetime import UTC, datetime

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Notification, NotificationType


async def notify(
    db: AsyncSession,
    org_id: int,
    user_id: int,
    type_: NotificationType,
    title: str,
    body: str | None = None,
    ref: tuple[str, int] | None = None,
    url: str | None = None,
) -> Notification:
    n = Notification(
        organization_id=org_id,
        user_id=user_id,
        type=type_,
        title=title,
        body=body,
        ref_type=ref[0] if ref else None,
        ref_id=ref[1] if ref else None,
        url=url,
    )
    db.add(n)
    await db.flush()
    return n


async def list_for_user(
    db: AsyncSession, user_id: int, limit: int = 50
) -> tuple[list[Notification], int]:
    rows = (
        (
            await db.execute(
                select(Notification)
                .where(Notification.user_id == user_id)
                .order_by(Notification.created_at.desc(), Notification.id.desc())
                .limit(limit)
            )
        )
        .scalars()
        .all()
    )
    unread = (
        await db.execute(
            select(func.count()).where(
                Notification.user_id == user_id, Notification.read_at.is_(None)
            )
        )
    ).scalar_one()
    return list(rows), unread


async def mark_read(db: AsyncSession, user_id: int, notification_id: int | None) -> None:
    stmt = update(Notification).where(
        Notification.user_id == user_id, Notification.read_at.is_(None)
    )
    if notification_id is not None:
        stmt = stmt.where(Notification.id == notification_id)
    await db.execute(stmt.values(read_at=datetime.now(UTC)))
    await db.flush()
