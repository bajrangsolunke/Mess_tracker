"""Seed a demo mess with plans, members (dine-in + tiffin), attendance, bills, menu and an announcement.

Run: uv run python -m scripts.seed
Idempotent: re-running does not duplicate rows (keyed by phone / date / month).
"""

import asyncio
from datetime import timedelta
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.core.time import membership_end, month_start, today_ist
from app.db.session import SessionLocal
from app.models import (
    Announcement,
    AttendanceStatus,
    Language,
    MealType,
    Member,
    MemberType,
    MessPlan,
    Organization,
    TiffinClient,
    User,
    UserRole,
)
from app.schemas.pricing import PricingPut
from app.schemas.tiffin import OrderItem
from app.services import attendance as att
from app.services import billing, menus
from app.services import tiffin as tiffin_svc
from app.services.pricing import set_pricing

DEMO_ORG = "स्वाद भोजनालय"
OWNER = ("9000000001", "Ramesh Laturkar", "owner123")
ONE_MEAL_PRICE, TWO_MEAL_PRICE = "2000", "3600"
# plan index → standard plan kind
PLAN_KINDS = ["two", "one_dinner", "one_lunch"]
MEMBERS = [
    # phone, name, plan index, room, type, company
    ("9000000002", "Rahul Sharma", 0, "101", MemberType.dine_in, None),
    ("9000000011", "Amit Kumar", 0, "102", MemberType.dine_in, None),
    ("9000000012", "Sneha Patil", 1, "103", MemberType.dine_in, None),
    ("9000000013", "Sandeep Yadav", 0, "104", MemberType.dine_in, None),
    ("9000000014", "Priya Deshmukh", 0, "105", MemberType.dine_in, None),
    ("9000000021", "Infosys Tiffin A", 2, None, MemberType.tiffin, "Infosys"),
    ("9000000022", "TCS Tiffin", 2, None, MemberType.tiffin, "TCS"),
]
CUSTOMER_PASSWORD = "cust123"


async def seed(db: AsyncSession) -> None:
    org = (
        await db.execute(select(Organization).where(Organization.name == DEMO_ORG))
    ).scalar_one_or_none()
    if org is None:
        org = Organization(name=DEMO_ORG, default_language=Language.mr)
        db.add(org)
        await db.flush()

    phone, name, pw = OWNER
    if not (await db.execute(select(User.id).where(User.phone == phone))).first():
        db.add(
            User(
                organization_id=org.id,
                phone=phone,
                name=name,
                password_hash=hash_password(pw),
                role=UserRole.owner,
                language=Language.mr,
            )
        )
    await db.flush()
    owner = (await db.execute(select(User).where(User.phone == phone))).scalar_one()

    if org.one_meal_price is None:
        await set_pricing(
            db,
            org,
            PricingPut(
                one_meal_price=Decimal(ONE_MEAL_PRICE), two_meal_price=Decimal(TWO_MEAL_PRICE)
            ),
        )
    std = {
        p.kind: p
        for p in (
            await db.execute(select(MessPlan).where(MessPlan.organization_id == org.id))
        ).scalars()
        if p.kind
    }
    plans: list[MessPlan] = [std[k] for k in PLAN_KINDS]

    today = today_ist()
    joined = month_start(today)
    members: list[Member] = []
    for mphone, mname, pidx, room, mtype, company in MEMBERS:
        user = (await db.execute(select(User).where(User.phone == mphone))).scalar_one_or_none()
        if user is None:
            user = User(
                organization_id=org.id,
                phone=mphone,
                name=mname,
                password_hash=hash_password(CUSTOMER_PASSWORD),
                role=UserRole.customer,
                language=Language.mr,
                must_change_password=False,
            )
            db.add(user)
            await db.flush()
        member = (
            await db.execute(select(Member).where(Member.user_id == user.id))
        ).scalar_one_or_none()
        if member is None:
            member = Member(
                organization_id=org.id,
                user_id=user.id,
                name=mname,
                phone=mphone,
                room_no=room,
                member_type=mtype,
                company=company,
                delivery_address="Hinjewadi Phase 2" if company else None,
                plan_id=plans[pidx].id,
                monthly_fee=plans[pidx].monthly_fee,
                joining_date=joined,
                valid_until=membership_end(joined),
            )
            db.add(member)
            await db.flush()
            await db.refresh(member)
            await billing.create_period_bill(db, member, joined, member.valid_until)
        members.append(member)

    # attendance for the past days of this month (everyone present, a few absences)
    for i in range((today - joined).days):
        d = joined + timedelta(days=i)
        for meal in (MealType.lunch, MealType.dinner):
            expected = await att.expected_members(db, org.id, d, meal)
            marks = [
                (m.id, AttendanceStatus.absent if (m.id + i) % 7 == 0 else AttendanceStatus.present)
                for m in expected
            ]
            if marks:
                await att.bulk_mark(db, org.id, d, meal, marks, owner.id)

    # a few of this month's bills paid
    page = await billing.list_bills(db, org.id, joined)
    for idx, bill in enumerate(page.items):
        if bill.status.value == "unpaid" and idx % 2 == 0:
            from app.models import PaymentMethod
            from app.schemas.billing import PaymentCreate

            await billing.record_payment(
                db,
                org.id,
                bill.id,
                PaymentCreate(
                    amount=bill.amount, method=PaymentMethod.upi, paid_on=joined + timedelta(days=3)
                ),
                owner.id,
            )

    # today's menu + an announcement
    if not await menus.list_menus(db, org.id, today, today):
        await menus.put_menu(
            db, org.id, today, MealType.lunch, ["चपाती", "भात", "डाळ", "भाजी", "कोशिंबीर"]
        )
        await menus.put_menu(
            db, org.id, today, MealType.dinner, ["पनीर भुर्जी", "भात", "चपाती", "डाळ"]
        )
    if not (
        await db.execute(select(Announcement.id).where(Announcement.organization_id == org.id))
    ).first():
        await menus.create_announcement(
            db, org.id, owner.id, "रविवारी मेस बंद", "24 ऑक्टोबरला दिवाळीनिमित्त मेस बंद राहील."
        )
    # bulk company tiffins with varying daily veg / non-veg counts
    companies = []
    for cname, veg, nonveg in [("Infosys", "60", "80"), ("TCS", "55", "75")]:
        c = (
            await db.execute(
                select(TiffinClient).where(
                    TiffinClient.organization_id == org.id, TiffinClient.name == cname
                )
            )
        ).scalar_one_or_none()
        if c is None:
            c = TiffinClient(
                organization_id=org.id,
                name=cname,
                contact_name="Admin desk",
                address="Hinjewadi Phase 2, Pune",
                veg_rate=Decimal(veg),
                nonveg_rate=Decimal(nonveg),
            )
            db.add(c)
            await db.flush()
        companies.append(c)
    for i in range((today - joined).days + 1):
        d = joined + timedelta(days=i)
        sheet = await tiffin_svc.sheet(db, org.id, d, MealType.lunch)
        if sheet.totals.total == 0:
            await tiffin_svc.put_orders(
                db,
                org.id,
                d,
                MealType.lunch,
                [
                    OrderItem(
                        client_id=companies[0].id,
                        veg_count=40 + (i * 3) % 11,
                        nonveg_count=8 + i % 5,
                    ),
                    OrderItem(
                        client_id=companies[1].id, veg_count=25 + (i * 7) % 9, nonveg_count=i % 4
                    ),
                ],
            )
    await db.flush()


async def main() -> None:
    async with SessionLocal() as db:
        await seed(db)
        await db.commit()
    print(
        f"Seeded '{DEMO_ORG}'. Owner {OWNER[0]}/{OWNER[2]}; customers e.g. 9000000002/{CUSTOMER_PASSWORD}"
    )


if __name__ == "__main__":
    asyncio.run(main())
