from datetime import time

from sqlalchemy import Enum, String, Time
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
