from sqlalchemy import BigInteger, DateTime, Index, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class FailedAttempt(Base):
    """A wrong password / setup code, keyed by what was guessed ("phone:98…", "ip:1.2.3.4")."""

    __tablename__ = "failed_attempts"
    __table_args__ = (Index("ix_failed_attempts_key_at", "key", "created_at"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    key: Mapped[str] = mapped_column(String(80), nullable=False)
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
