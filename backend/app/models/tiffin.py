from datetime import date
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    Date,
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
from app.models.enums import FoodType, MealType, PaymentMethod


class TiffinItem(TimestampMixin, Base):
    """Price list for office tiffins, e.g. Veg thali ₹90, Anda thali - Chapati ₹120."""

    __tablename__ = "tiffin_items"

    organization_id: Mapped[int] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    food_type: Mapped[FoodType] = mapped_column(
        Enum(FoodType, name="food_type"), default=FoodType.veg, nullable=False
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


class TiffinClient(TimestampMixin, Base):
    """A company that orders tiffins in bulk; counts vary day to day."""

    __tablename__ = "tiffin_clients"

    organization_id: Mapped[int] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    contact_name: Mapped[str | None] = mapped_column(String(120))
    phone: Mapped[str | None] = mapped_column(String(15))
    address: Mapped[str | None] = mapped_column(String(300))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)


class TiffinOrder(TimestampMixin, Base):
    """One client's order for one date and meal; quantities live in lines."""

    __tablename__ = "tiffin_orders"
    __table_args__ = (
        UniqueConstraint(
            "client_id", "date", "meal_type", name="uq_tiffin_orders_client_date_meal"
        ),
        Index("ix_tiffin_orders_org_date", "organization_id", "date"),
    )

    organization_id: Mapped[int] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    client_id: Mapped[int] = mapped_column(
        ForeignKey("tiffin_clients.id", ondelete="CASCADE"), nullable=False
    )
    date: Mapped[date] = mapped_column(Date, nullable=False)
    meal_type: Mapped[MealType] = mapped_column(Enum(MealType, name="meal_type"), nullable=False)
    note: Mapped[str | None] = mapped_column(String(200))

    lines: Mapped[list["TiffinOrderLine"]] = relationship(
        back_populates="order", cascade="all, delete-orphan", lazy="selectin"
    )


class TiffinOrderLine(TimestampMixin, Base):
    """Quantity of one item in an order; price snapshotted at entry time."""

    __tablename__ = "tiffin_order_lines"
    __table_args__ = (UniqueConstraint("order_id", "item_id", name="uq_tiffin_lines_order_item"),)

    order_id: Mapped[int] = mapped_column(
        ForeignKey("tiffin_orders.id", ondelete="CASCADE"), nullable=False, index=True
    )
    item_id: Mapped[int] = mapped_column(
        ForeignKey("tiffin_items.id", ondelete="RESTRICT"), nullable=False
    )
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)

    order: Mapped[TiffinOrder] = relationship(back_populates="lines")
    item: Mapped[TiffinItem] = relationship(lazy="joined")


class TiffinPayment(TimestampMixin, Base):
    __tablename__ = "tiffin_payments"
    __table_args__ = (Index("ix_tiffin_payments_client_month", "client_id", "month"),)

    organization_id: Mapped[int] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    client_id: Mapped[int] = mapped_column(
        ForeignKey("tiffin_clients.id", ondelete="CASCADE"), nullable=False
    )
    month: Mapped[date] = mapped_column(Date, nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    method: Mapped[PaymentMethod] = mapped_column(
        Enum(PaymentMethod, name="payment_method"), nullable=False
    )
    paid_on: Mapped[date] = mapped_column(Date, nullable=False)
    note: Mapped[str | None] = mapped_column(String(200))
    recorded_by: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
