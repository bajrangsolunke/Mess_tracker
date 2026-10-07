from datetime import date
from decimal import Decimal

from sqlalchemy import Date, Enum, ForeignKey, Index, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.models.enums import BillStatus, PaymentMethod


class Bill(TimestampMixin, Base):
    __tablename__ = "bills"
    __table_args__ = (
        UniqueConstraint("member_id", "month", name="uq_bills_member_month"),
        Index("ix_bills_org_month", "organization_id", "month"),
    )

    organization_id: Mapped[int] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    member_id: Mapped[int] = mapped_column(
        ForeignKey("members.id", ondelete="CASCADE"), nullable=False
    )
    month: Mapped[date] = mapped_column(Date, nullable=False)  # first day of month
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    status: Mapped[BillStatus] = mapped_column(
        Enum(BillStatus, name="bill_status"), default=BillStatus.unpaid, nullable=False
    )
    note: Mapped[str | None] = mapped_column(String(200))

    payments: Mapped[list["Payment"]] = relationship(
        back_populates="bill",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="Payment.paid_on",
    )


class Payment(TimestampMixin, Base):
    __tablename__ = "payments"

    organization_id: Mapped[int] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    bill_id: Mapped[int] = mapped_column(ForeignKey("bills.id", ondelete="CASCADE"), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    method: Mapped[PaymentMethod] = mapped_column(
        Enum(PaymentMethod, name="payment_method"), nullable=False
    )
    paid_on: Mapped[date] = mapped_column(Date, nullable=False)
    note: Mapped[str | None] = mapped_column(String(200))
    recorded_by: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))

    bill: Mapped[Bill] = relationship(back_populates="payments")
