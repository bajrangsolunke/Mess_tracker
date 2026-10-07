"""Seed a demo organization with one owner and one customer.

Run: uv run python -m scripts.seed
Idempotent: re-running does not duplicate rows.
"""

import asyncio

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models import Language, Organization, User, UserRole

DEMO_ORG = "Demo Mess"
DEMO_USERS = [
    # phone, name, password, role, must_change_password
    ("9000000001", "Ramesh (Owner)", "owner123", UserRole.owner, False),
    ("9000000002", "Rahul (Customer)", "cust123", UserRole.customer, True),
]


async def seed(db: AsyncSession) -> None:
    org = (
        await db.execute(select(Organization).where(Organization.name == DEMO_ORG))
    ).scalar_one_or_none()
    if org is None:
        org = Organization(name=DEMO_ORG, default_language=Language.mr)
        db.add(org)
        await db.flush()
    for phone, name, password, role, must_change in DEMO_USERS:
        exists = (await db.execute(select(User.id).where(User.phone == phone))).first()
        if exists:
            continue
        db.add(
            User(
                organization_id=org.id,
                phone=phone,
                name=name,
                password_hash=hash_password(password),
                role=role,
                language=Language.mr,
                must_change_password=must_change,
            )
        )
    await db.flush()


async def main() -> None:
    async with SessionLocal() as db:
        await seed(db)
        await db.commit()
    print("Seeded demo org. Owner 9000000001/owner123, Customer 9000000002/cust123")


if __name__ == "__main__":
    asyncio.run(main())
