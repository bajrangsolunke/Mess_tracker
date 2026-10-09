"""staff accounts and daily ledger

Revision ID: a61c4e28d3f1
Revises: 94a27cb96935
Create Date: 2026-10-08

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "a61c4e28d3f1"
down_revision: str | Sequence[str] | None = "94a27cb96935"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'staff'")
    ledger_kind = postgresql.ENUM(
        "expense",
        "income",
        "staff_advance",
        "salary_payment",
        "advance_repayment",
        name="ledger_kind",
        create_type=False,
    )
    ledger_kind.create(op.get_bind(), checkfirst=True)
    op.create_table(
        "staff_profiles",
        sa.Column("organization_id", sa.BigInteger(), nullable=False),
        sa.Column("user_id", sa.BigInteger(), nullable=False),
        sa.Column("monthly_salary", sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id"),
    )
    op.create_index(
        op.f("ix_staff_profiles_organization_id"),
        "staff_profiles",
        ["organization_id"],
        unique=False,
    )
    op.create_table(
        "ledger_entries",
        sa.Column("organization_id", sa.BigInteger(), nullable=False),
        sa.Column("kind", ledger_kind, nullable=False),
        sa.Column("amount", sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column("occurred_on", sa.Date(), nullable=False),
        sa.Column("description", sa.String(length=160), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("staff_user_id", sa.BigInteger(), nullable=True),
        sa.Column("recorded_by", sa.BigInteger(), nullable=True),
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["recorded_by"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["staff_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_ledger_entries_occurred_on"),
        "ledger_entries",
        ["occurred_on"],
        unique=False,
    )
    op.create_index(
        op.f("ix_ledger_entries_organization_id"),
        "ledger_entries",
        ["organization_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_ledger_entries_organization_id"), table_name="ledger_entries")
    op.drop_index(op.f("ix_ledger_entries_occurred_on"), table_name="ledger_entries")
    op.drop_table("ledger_entries")
    op.drop_index(op.f("ix_staff_profiles_organization_id"), table_name="staff_profiles")
    op.drop_table("staff_profiles")
    op.execute("DROP TYPE IF EXISTS ledger_kind")
    # PostgreSQL does not support removing an enum label; existing staff users prevent a safe downgrade.
