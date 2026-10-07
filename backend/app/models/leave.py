from datetime import date, datetime

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin
from app.models.enums import LeaveStatus, MealType


class Leave(TimestampMixin, Base):
    __tablename__ = "leaves"
    __table_args__ = (
        UniqueConstraint("member_id", "date", "meal_type", name="uq_leaves_member_date_meal"),
        Index("ix_leaves_org_date", "organization_id", "date"),
    )

    organization_id: Mapped[int] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    member_id: Mapped[int] = mapped_column(
        ForeignKey("members.id", ondelete="CASCADE"), nullable=False
    )
    date: Mapped[date] = mapped_column(Date, nullable=False)
    meal_type: Mapped[MealType] = mapped_column(Enum(MealType, name="meal_type"), nullable=False)
    reason: Mapped[str | None] = mapped_column(String(200))
    status: Mapped[LeaveStatus] = mapped_column(
        Enum(LeaveStatus, name="leave_status"), nullable=False
    )
    decided_by: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
