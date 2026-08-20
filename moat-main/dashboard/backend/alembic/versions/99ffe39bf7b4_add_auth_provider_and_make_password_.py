"""add auth_provider and make password nullable

Revision ID: 99ffe39bf7b4
Revises: 
Create Date: 2026-06-04 11:54:32.513457

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '99ffe39bf7b4'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column('users', 'password_hash', existing_type=sa.String(length=255), nullable=True)
    op.add_column('users', sa.Column('auth_provider', sa.String(length=50), server_default='local', nullable=False))


def downgrade() -> None:
    op.drop_column('users', 'auth_provider')
    op.alter_column('users', 'password_hash', existing_type=sa.String(length=255), nullable=False)
