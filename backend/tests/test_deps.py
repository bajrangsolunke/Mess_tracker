import pytest
from fastapi import APIRouter

from app.core.deps import CustomerUser, OwnerUser
from app.core.security import create_access_token, hash_password
from app.main import app
from app.models import Language, Organization, User, UserRole

guard_router = APIRouter(prefix="/_test")


@guard_router.get("/owner-only")
async def owner_only(user: OwnerUser) -> dict[str, int]:
    return {"user_id": user.id}


@guard_router.get("/customer-only")
async def customer_only(user: CustomerUser) -> dict[str, int]:
    return {"user_id": user.id}


@pytest.fixture(scope="module", autouse=True)
def _mount():
    app.include_router(guard_router)
    yield


@pytest.fixture
async def users(db):
    org = Organization(name="Org", default_language=Language.en)
    db.add(org)
    await db.flush()
    owner = User(
        organization_id=org.id,
        phone="9000000001",
        name="O",
        password_hash=hash_password("x"),
        role=UserRole.owner,
    )
    customer = User(
        organization_id=org.id,
        phone="9000000002",
        name="C",
        password_hash=hash_password("x"),
        role=UserRole.customer,
    )
    inactive = User(
        organization_id=org.id,
        phone="9000000003",
        name="I",
        password_hash=hash_password("x"),
        role=UserRole.owner,
        is_active=False,
    )
    db.add_all([owner, customer, inactive])
    await db.flush()
    return org, owner, customer, inactive


def auth(user: User, org_id: int | None = None) -> dict[str, str]:
    tok = create_access_token(
        user_id=user.id, org_id=org_id or user.organization_id, role=user.role.value
    )
    return {"Authorization": f"Bearer {tok}"}


async def test_no_token_401(client, users):
    r = await client.get("/_test/owner-only")
    assert r.status_code == 401
    assert r.json()["code"] == "NOT_AUTHENTICATED"


async def test_wrong_scheme_401(client, users):
    r = await client.get("/_test/owner-only", headers={"Authorization": "Basic abc"})
    assert r.status_code == 401


async def test_customer_on_owner_route_403(client, users):
    _, _, customer, _ = users
    r = await client.get("/_test/owner-only", headers=auth(customer))
    assert r.status_code == 403
    assert r.json()["code"] == "FORBIDDEN"


async def test_owner_on_customer_route_403(client, users):
    _, owner, _, _ = users
    r = await client.get("/_test/customer-only", headers=auth(owner))
    assert r.status_code == 403


async def test_owner_ok(client, users):
    _, owner, _, _ = users
    r = await client.get("/_test/owner-only", headers=auth(owner))
    assert r.status_code == 200
    assert r.json() == {"user_id": owner.id}


async def test_customer_ok(client, users):
    _, _, customer, _ = users
    r = await client.get("/_test/customer-only", headers=auth(customer))
    assert r.status_code == 200


async def test_inactive_user_401(client, users):
    _, _, _, inactive = users
    r = await client.get("/_test/owner-only", headers=auth(inactive))
    assert r.status_code == 401


async def test_org_mismatch_401(client, users):
    _, owner, _, _ = users
    r = await client.get(
        "/_test/owner-only", headers=auth(owner, org_id=owner.organization_id + 99)
    )
    assert r.status_code == 401
