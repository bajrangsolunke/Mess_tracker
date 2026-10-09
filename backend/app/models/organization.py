from datetime import date, time
from decimal import Decimal

from sqlalchemy import Date, Enum, Numeric, String, Time
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin
from app.models.enums import BusinessType, Language


class Organization(TimestampMixin, Base):
    __tablename__ = "organizations"

    name: Mapped[str] = mapped_column(String(120), nullable=False)
    business_type: Mapped[BusinessType] = mapped_column(
        Enum(BusinessType, name="business_type"), default=BusinessType.mess, nullable=False
    )
    default_language: Mapped[Language] = mapped_column(
        Enum(Language, name="language"), default=Language.en, nullable=False
    )
    leave_cutoff_time: Mapped[time] = mapped_column(Time, default=time(22, 0), nullable=False)
    timezone: Mapped[str] = mapped_column(String(64), default="Asia/Kolkata", nullable=False)
    # After these times, members with no mark for that meal are recorded absent.
    lunch_end_time: Mapped[time] = mapped_column(
        Time, default=time(15, 30), server_default="15:30", nullable=False
    )
    dinner_end_time: Mapped[time] = mapped_column(
        Time, default=time(23, 0), server_default="23:00", nullable=False
    )
    one_meal_price: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    two_meal_price: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    # last day the daily reminders (memberships ending soon) were sent
    last_daily_run: Mapped[date | None] = mapped_column(Date)
