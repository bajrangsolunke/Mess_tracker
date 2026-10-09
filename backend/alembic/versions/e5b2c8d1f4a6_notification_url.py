"""notification url: inbox items open their screen

Revision ID: e5b2c8d1f4a6
Revises: d4e1a7c9f2b3
Create Date: 2026-10-09

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "e5b2c8d1f4a6"
down_revision: str | Sequence[str] | None = "d4e1a7c9f2b3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("notifications", sa.Column("url", sa.String(length=300), nullable=True))


def downgrade() -> None:
    op.drop_column("notifications", "url")
