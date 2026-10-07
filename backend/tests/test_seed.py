from sqlalchemy import func, select

from app.models import Organization, User
from scripts.seed import seed


async def test_seed_is_idempotent(db):
    await seed(db)
    await seed(db)
    orgs = (await db.execute(select(func.count()).select_from(Organization))).scalar_one()
    users = (await db.execute(select(func.count()).select_from(User))).scalar_one()
    assert orgs == 1
    assert users == 2
    owner = (await db.execute(select(User).where(User.phone == "9000000001"))).scalar_one()
    customer = (await db.execute(select(User).where(User.phone == "9000000002"))).scalar_one()
    assert owner.role.value == "owner"
    assert customer.role.value == "customer"
    assert customer.must_change_password is True


async def test_seeded_users_can_login(client, db):
    await seed(db)
    for phone, pw in [("9000000001", "owner123"), ("9000000002", "cust123")]:
        r = await client.post("/api/v1/auth/login", json={"phone": phone, "password": pw})
        assert r.status_code == 200, r.text
