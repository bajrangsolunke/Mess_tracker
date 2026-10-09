"""tiffin packs: 30/60 tiffins per membership period

Revision ID: c3d8f2a6b9e1
Revises: b7c2e9d4a1f0
Create Date: 2026-10-09

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "c3d8f2a6b9e1"
down_revision: str | Sequence[str] | None = "b7c2e9d4a1f0"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("mess_plans", sa.Column("meal_credits", sa.Integer(), nullable=True))
    op.execute(
        "UPDATE mess_plans SET meal_credits = CASE kind WHEN 'two' THEN 60 ELSE 30 END "
        "WHERE kind IS NOT NULL"
    )
    op.add_column("bills", sa.Column("meal_credits", sa.Integer(), nullable=True))
    # current period bills take the tiffins of the member's plan
    op.execute(
        "UPDATE bills b SET meal_credits = p.meal_credits FROM members m "
        "JOIN mess_plans p ON p.id = m.plan_id "
        "WHERE b.member_id = m.id AND b.period_start IS NOT NULL"
    )
    op.drop_constraint("uq_bills_member_month", "bills", type_="unique")
    op.create_index(
        "uq_bills_member_month_legacy",
        "bills",
        ["member_id", "month"],
        unique=True,
        postgresql_where=sa.text("period_start IS NULL"),
    )
    op.create_index(
        "uq_bills_member_period",
        "bills",
        ["member_id", "period_start"],
        unique=True,
        postgresql_where=sa.text("period_start IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index("uq_bills_member_period", table_name="bills")
    op.drop_index("uq_bills_member_month_legacy", table_name="bills")
    op.create_unique_constraint("uq_bills_member_month", "bills", ["member_id", "month"])
    op.drop_column("bills", "meal_credits")
    op.drop_column("mess_plans", "meal_credits")
