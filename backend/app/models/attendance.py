from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Enum, ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin
from app.models.enums import AttendanceStatus, HolidayMeal, MealType


class Attendance(TimestampMixin, Base):
    __tablename__ = "attendance"
    __table_args__ = (
        UniqueConstraint("member_id", "date", "meal_type", name="uq_attendance_member_date_meal"),
        Index("ix_attendance_org_date_meal", "organization_id", "date", "meal_type"),
    )

    organization_id: Mapped[int] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    member_id: Mapped[int] = mapped_column(
        ForeignKey("members.id", ondelete="CASCADE"), nullable=False
    )
    date: Mapped[date] = mapped_column(Date, nullable=False)
    meal_type: Mapped[MealType] = mapped_column(Enum(MealType, name="meal_type"), nullable=False)
    status: Mapped[AttendanceStatus] = mapped_column(
        Enum(AttendanceStatus, name="attendance_status"), nullable=False
    )
    marked_by: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    # When the status was last set, and whether the system set it (missed meal → absent).
    marked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    auto: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false", nullable=False
    )


class MealClosure(TimestampMixin, Base):
    """A (date, meal) whose missed marks have been recorded as absent."""

    __tablename__ = "meal_closures"
    __table_args__ = (
        UniqueConstraint(
            "organization_id", "date", "meal_type", name="uq_meal_closures_org_date_meal"
        ),
    )

    organization_id: Mapped[int] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    date: Mapped[date] = mapped_column(Date, nullable=False)
    meal_type: Mapped[MealType] = mapped_column(Enum(MealType, name="meal_type"), nullable=False)


class Holiday(TimestampMixin, Base):
    __tablename__ = "holidays"
    __table_args__ = (
        UniqueConstraint("organization_id", "date", "meal_type", name="uq_holidays_org_date_meal"),
    )

    organization_id: Mapped[int] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    date: Mapped[date] = mapped_column(Date, nullable=False)
    meal_type: Mapped[HolidayMeal] = mapped_column(
        Enum(HolidayMeal, name="holiday_meal"), default=HolidayMeal.all, nullable=False
    )
    reason: Mapped[str | None] = mapped_column(String(200))


class MonthClosure(TimestampMixin, Base):
    __tablename__ = "month_closures"
    __table_args__ = (
        UniqueConstraint("organization_id", "month", name="uq_month_closures_org_month"),
    )

    organization_id: Mapped[int] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    month: Mapped[date] = mapped_column(Date, nullable=False)  # first day of month
    closed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    closed_by: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
