"""failed login / setup-code attempts for rate limiting

Revision ID: f6c3d9e2a7b8
Revises: e5b2c8d1f4a6
Create Date: 2026-10-12

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "f6c3d9e2a7b8"
down_revision: str | Sequence[str] | None = "e5b2c8d1f4a6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "failed_attempts",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("key", sa.String(length=80), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_failed_attempts_key_at", "failed_attempts", ["key", "created_at"])


def downgrade() -> None:
    op.drop_index("ix_failed_attempts_key_at", table_name="failed_attempts")
    op.drop_table("failed_attempts")
