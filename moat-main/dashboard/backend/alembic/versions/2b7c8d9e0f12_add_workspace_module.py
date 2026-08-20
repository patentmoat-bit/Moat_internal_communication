"""add workspace module

Revision ID: 2b7c8d9e0f12
Revises: 1a2b3c4d5e6f
Create Date: 2026-06-04 13:55:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = '2b7c8d9e0f12'
down_revision: Union[str, None] = '1a2b3c4d5e6f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

workspace_role = postgresql.ENUM('owner', 'admin', 'editor', 'viewer', name='workspace_role')
project_status = postgresql.ENUM('active', 'on_hold', 'completed', 'archived', name='workspace_project_status')


def upgrade() -> None:
    bind = op.get_bind()
    workspace_role.create(bind, checkfirst=True)
    project_status.create(bind, checkfirst=True)

    op.add_column(
        'workspaces',
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.alter_column('workspaces', 'updated_at', server_default=None)

    op.create_table(
        'workspace_members',
        sa.Column('id', postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column('workspace_id', postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column('role', workspace_role, nullable=False),
        sa.Column('invited_by_id', postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column('joined_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['invited_by_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('workspace_id', 'user_id', name='uq_workspace_member_user'),
    )
    op.create_index('ix_workspace_members_workspace_id', 'workspace_members', ['workspace_id'])
    op.create_index('ix_workspace_members_user_id', 'workspace_members', ['user_id'])

    op.create_table(
        'workspace_projects',
        sa.Column('id', postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column('workspace_id', postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status', project_status, nullable=False),
        sa.Column('owner_id', postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column('due_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_workspace_projects_workspace_id', 'workspace_projects', ['workspace_id'])
    op.create_index('ix_workspace_projects_owner_id', 'workspace_projects', ['owner_id'])

    op.create_table(
        'workspace_activities',
        sa.Column('id', postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column('workspace_id', postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column('actor_id', postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column('action', sa.String(length=100), nullable=False),
        sa.Column('entity_type', sa.String(length=100), nullable=False),
        sa.Column('entity_id', sa.String(length=64), nullable=True),
        sa.Column('message', sa.String(length=512), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['actor_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_workspace_activities_actor_id', 'workspace_activities', ['actor_id'])
    op.create_index('ix_workspace_activities_workspace_id', 'workspace_activities', ['workspace_id'])
    op.create_index('ix_workspace_activities_workspace_created', 'workspace_activities', ['workspace_id', 'created_at'])

    op.execute(
        """
        INSERT INTO workspace_members (id, workspace_id, user_id, role, invited_by_id, joined_at)
        SELECT (
            substr(md5(id::text || owner_id::text || 'owner'), 1, 8) || '-' ||
            substr(md5(id::text || owner_id::text || 'owner'), 9, 4) || '-4' ||
            substr(md5(id::text || owner_id::text || 'owner'), 14, 3) || '-8' ||
            substr(md5(id::text || owner_id::text || 'owner'), 18, 3) || '-' ||
            substr(md5(id::text || owner_id::text || 'owner'), 21, 12)
        )::uuid, id, owner_id, 'owner', owner_id, created_at
        FROM workspaces
        ON CONFLICT (workspace_id, user_id) DO NOTHING
        """
    )


def downgrade() -> None:
    bind = op.get_bind()
    op.drop_index('ix_workspace_activities_workspace_created', table_name='workspace_activities')
    op.drop_index('ix_workspace_activities_workspace_id', table_name='workspace_activities')
    op.drop_index('ix_workspace_activities_actor_id', table_name='workspace_activities')
    op.drop_table('workspace_activities')

    op.drop_index('ix_workspace_projects_owner_id', table_name='workspace_projects')
    op.drop_index('ix_workspace_projects_workspace_id', table_name='workspace_projects')
    op.drop_table('workspace_projects')

    op.drop_index('ix_workspace_members_user_id', table_name='workspace_members')
    op.drop_index('ix_workspace_members_workspace_id', table_name='workspace_members')
    op.drop_table('workspace_members')

    op.drop_column('workspaces', 'updated_at')
    project_status.drop(bind, checkfirst=True)
    workspace_role.drop(bind, checkfirst=True)
