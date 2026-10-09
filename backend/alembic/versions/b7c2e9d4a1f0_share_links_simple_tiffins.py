"""member share links, simple veg/non-veg company tiffins

Revision ID: b7c2e9d4a1f0
Revises: a61c4e28d3f1
Create Date: 2026-10-09

"""

import secrets
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "b7c2e9d4a1f0"
down_revision: str | Sequence[str] | None = "a61c4e28d3f1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("members", sa.Column("share_token", sa.String(length=32), nullable=True))
    op.create_unique_constraint(None, "members", ["share_token"])  # members_share_token_key
    conn = op.get_bind()
    for (member_id,) in conn.execute(sa.text("SELECT id FROM members")).all():
        conn.execute(
            sa.text("UPDATE members SET share_token = :t WHERE id = :id"),
            {"t": secrets.token_urlsafe(16), "id": member_id},
        )

    op.add_column("tiffin_clients", sa.Column("veg_price", sa.Numeric(10, 2), nullable=True))
    op.add_column("tiffin_clients", sa.Column("nonveg_price", sa.Numeric(10, 2), nullable=True))
    op.add_column(
        "tiffin_clients",
        sa.Column("lunch", sa.Boolean(), server_default=sa.true(), nullable=False),
    )
    op.add_column(
        "tiffin_clients",
        sa.Column("dinner", sa.Boolean(), server_default=sa.true(), nullable=False),
    )
    # existing companies take the meals they were ordering; lunch if nothing yet
    op.execute(
        "UPDATE tiffin_clients c SET "
        "lunch = EXISTS (SELECT 1 FROM tiffin_orders o "
        "WHERE o.client_id = c.id AND o.meal_type = 'lunch'), "
        "dinner = EXISTS (SELECT 1 FROM tiffin_orders o "
        "WHERE o.client_id = c.id AND o.meal_type = 'dinner')"
    )
    op.execute("UPDATE tiffin_clients SET lunch = true WHERE NOT lunch AND NOT dinner")
    for col in ("veg_qty", "nonveg_qty"):
        op.add_column(
            "tiffin_orders",
            sa.Column(col, sa.Integer(), server_default="0", nullable=False),
        )
    for col in ("veg_price", "nonveg_price"):
        op.add_column(
            "tiffin_orders",
            sa.Column(col, sa.Numeric(10, 2), server_default="0", nullable=False),
        )


def downgrade() -> None:
    for col in ("nonveg_price", "veg_price", "nonveg_qty", "veg_qty"):
        op.drop_column("tiffin_orders", col)
    for col in ("dinner", "lunch", "nonveg_price", "veg_price"):
        op.drop_column("tiffin_clients", col)
    op.drop_constraint("members_share_token_key", "members", type_="unique")
    op.drop_column("members", "share_token")
