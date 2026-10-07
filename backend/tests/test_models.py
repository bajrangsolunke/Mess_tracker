import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.models import Language, Organization, User, UserRole


async def test_create_org_and_owner(db):
    org = Organization(name="Demo Mess")
    db.add(org)
    await db.flush()
    user = User(
        organization_id=org.id,
        phone="9000000001",
        name="Ramesh",
        password_hash="x",
        role=UserRole.owner,
        language=Language.mr,
    )
    db.add(user)
    await db.flush()
    fetched = (await db.execute(select(User).where(User.phone == "9000000001"))).scalar_one()
    assert fetched.organization_id == org.id
    assert fetched.role is UserRole.owner
    assert fetched.language is Language.mr
    assert fetched.is_active is True
    assert fetched.must_change_password is False
    assert org.leave_cutoff_time.strftime("%H:%M") == "22:00"
    assert org.timezone == "Asia/Kolkata"


async def test_phone_unique_per_org(db):
    org = Organization(name="Demo Mess")
    db.add(org)
    await db.flush()
    for _ in range(2):
        db.add(
            User(
                organization_id=org.id,
                phone="9000000001",
                name="A",
                password_hash="x",
                role=UserRole.customer,
            )
        )
    with pytest.raises(IntegrityError):
        await db.flush()
