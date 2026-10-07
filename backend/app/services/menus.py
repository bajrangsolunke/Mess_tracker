from datetime import date

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Announcement, MealType, Member, Menu, NotificationType
from app.schemas.menu import MenuOut
from app.services.notifications import notify


def _out(m: Menu) -> MenuOut:
    return MenuOut(date=m.date, meal_type=m.meal_type, items=[x for x in m.items.split("\n") if x])


async def list_menus(db: AsyncSession, org_id: int, start: date, end: date) -> list[MenuOut]:
    rows = (
        await db.execute(
            select(Menu)
            .where(Menu.organization_id == org_id, Menu.date >= start, Menu.date <= end)
            .order_by(Menu.date, Menu.meal_type)
        )
    ).scalars()
    return [_out(m) for m in rows]


async def put_menu(
    db: AsyncSession, org_id: int, d: date, meal: MealType, items: list[str]
) -> MenuOut:
    existing = (
        await db.execute(
            select(Menu).where(
                Menu.organization_id == org_id, Menu.date == d, Menu.meal_type == meal
            )
        )
    ).scalar_one_or_none()
    if not items:
        if existing:
            await db.delete(existing)
            await db.flush()
        return MenuOut(date=d, meal_type=meal, items=[])
    text = "\n".join(items)
    stmt = insert(Menu).values(organization_id=org_id, date=d, meal_type=meal, items=text)
    stmt = stmt.on_conflict_do_update(constraint="uq_menus_org_date_meal", set_={"items": text})
    await db.execute(stmt)
    await db.flush()
    return MenuOut(date=d, meal_type=meal, items=items)


async def copy_day(db: AsyncSession, org_id: int, src: date, dst: date) -> int:
    rows = await list_menus(db, org_id, src, src)
    for m in rows:
        await put_menu(db, org_id, dst, m.meal_type, m.items)
    return len(rows)


async def create_announcement(
    db: AsyncSession, org_id: int, user_id: int, title: str, body: str | None
) -> Announcement:
    a = Announcement(organization_id=org_id, title=title, body=body, created_by=user_id)
    db.add(a)
    await db.flush()
    user_ids = (
        await db.execute(
            select(Member.user_id).where(
                Member.organization_id == org_id, Member.user_id.is_not(None)
            )
        )
    ).scalars()
    for uid in user_ids:
        await notify(
            db, org_id, uid, NotificationType.announcement, title, body, ref=("announcement", a.id)
        )
    return a


async def list_announcements(db: AsyncSession, org_id: int, limit: int = 30) -> list[Announcement]:
    return list(
        (
            await db.execute(
                select(Announcement)
                .where(Announcement.organization_id == org_id)
                .order_by(Announcement.published_at.desc(), Announcement.id.desc())
                .limit(limit)
            )
        ).scalars()
    )
