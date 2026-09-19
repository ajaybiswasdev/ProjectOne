"""initial resource table

Revision ID: 001
Revises:
Create Date: 2026-09-19
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "resources",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("employee_id", sa.String(32), unique=True, index=True),
        sa.Column("name", sa.String(160), index=True),
        sa.Column("level", sa.String(120), index=True),
        sa.Column("skill", sa.String(160), server_default="", index=True),
        sa.Column("department", sa.String(160), index=True),
        sa.Column("location", sa.String(120), index=True),
        sa.Column("days_on_bench", sa.Integer(), index=True),
        sa.Column("age_bucket", sa.String(40), index=True),
        sa.Column("deployable", sa.String(40), index=True),
        sa.Column("rmg_status", sa.String(120), index=True),
        sa.Column("status", sa.String(40), index=True),
        sa.Column("experience_bucket", sa.String(40), index=True),
        sa.Column("hrbp", sa.String(80), index=True),
        sa.Column("leader", sa.String(80), index=True),
    )


def downgrade() -> None:
    op.drop_table("resources")
