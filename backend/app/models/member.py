from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.models.enums import MemberStatus, MemberType
from app.models.plan import MessPlan


class Member(TimestampMixin, Base):
    __tablename__ = "members"
    __table_args__ = (
        Index("ix_members_org_status", "organization_id", "status"),
        Index("ix_members_org_phone", "organization_id", "phone"),
        Index("ix_members_org_type", "organization_id", "member_type"),
        UniqueConstraint("organization_id", "member_no", name="uq_members_org_member_no"),
    )

    organization_id: Mapped[int] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), unique=True
    )
    # Short ID shown to the owner and searchable: 1001, 1002, … per mess.
    member_no: Mapped[int] = mapped_column(Integer, nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    phone: Mapped[str] = mapped_column(String(15), nullable=False)
    room_no: Mapped[str | None] = mapped_column(String(30))
    member_type: Mapped[MemberType] = mapped_column(
        Enum(MemberType, name="member_type"),
        default=MemberType.dine_in,
        server_default="dine_in",
        nullable=False,
    )
    company: Mapped[str | None] = mapped_column(String(120))
    delivery_address: Mapped[str | None] = mapped_column(String(300))
    plan_id: Mapped[int] = mapped_column(ForeignKey("mess_plans.id"), nullable=False)
    monthly_fee: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    joining_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[MemberStatus] = mapped_column(
        Enum(MemberStatus, name="member_status"), default=MemberStatus.active, nullable=False
    )
    deposit: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0"), nullable=False)
    emergency_contact: Mapped[str | None] = mapped_column(String(120))
    notes: Mapped[str | None] = mapped_column(Text)
    inactive_from: Mapped[date | None] = mapped_column(Date)
    # Membership runs in one-month periods from the joining date; NULL = legacy open-ended.
    valid_until: Mapped[date | None] = mapped_column(Date)
    renewal_plan_id: Mapped[int | None] = mapped_column(
        ForeignKey("mess_plans.id", ondelete="SET NULL")
    )
    renewal_requested_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    plan: Mapped[MessPlan] = relationship(lazy="joined", foreign_keys=[plan_id])
    renewal_plan: Mapped[MessPlan | None] = relationship(
        lazy="joined", foreign_keys=[renewal_plan_id]
    )
