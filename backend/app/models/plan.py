from decimal import Decimal

from sqlalchemy import Boolean, ForeignKey, Integer, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin


class MessPlan(TimestampMixin, Base):
    __tablename__ = "mess_plans"
    __table_args__ = (UniqueConstraint("organization_id", "kind", name="uq_mess_plans_org_kind"),)

    organization_id: Mapped[int] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    includes_lunch: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    includes_dinner: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    monthly_fee: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    # Standard plans from the pricing screen: one_lunch, one_dinner, two. NULL = custom.
    kind: Mapped[str | None] = mapped_column(String(20))
    # tiffins in one membership period (1 time: 30, 2 times: 60). NULL = unlimited meals.
    meal_credits: Mapped[int | None] = mapped_column(Integer)
