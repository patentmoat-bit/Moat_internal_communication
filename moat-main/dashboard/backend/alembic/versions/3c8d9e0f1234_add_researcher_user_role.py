"""add researcher user role

Revision ID: 3c8d9e0f1234
Revises: 2b7c8d9e0f12
Create Date: 2026-06-04 16:10:00.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = '3c8d9e0f1234'
down_revision: Union[str, None] = '2b7c8d9e0f12'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'researcher'")


def downgrade() -> None:
    # PostgreSQL enum values cannot be removed safely without recreating the type.
    pass
