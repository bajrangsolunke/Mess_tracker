from sqlalchemy import func, select

from app.models import Bill, Member, MessPlan, Organization, User
from scripts.seed import seed


async def test_seed_is_idempotent(db):
    await seed(db)
    await seed(db)
    assert (await db.execute(select(func.count()).select_from(Organization))).scalar_one() == 1
    assert (await db.execute(select(func.count()).select_from(User))).scalar_one() == 8
    assert (await db.execute(select(func.count()).select_from(MessPlan))).scalar_one() == 3
    assert (await db.execute(select(func.count()).select_from(Member))).scalar_one() == 7
    assert (await db.execute(select(func.count()).select_from(Bill))).scalar_one() == 7
    owner = (await db.execute(select(User).where(User.phone == "9000000001"))).scalar_one()
    assert owner.role.value == "owner"


async def test_seeded_users_can_login(client, db):
    await seed(db)
    for phone, pw in [("9000000001", "owner123"), ("9000000002", "cust123")]:
        r = await client.post("/api/v1/auth/login", json={"phone": phone, "password": pw})
        assert r.status_code == 200, r.text
