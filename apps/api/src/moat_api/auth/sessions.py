from __future__ import annotations

import hashlib
import secrets
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy import select, text, update
from sqlalchemy.ext.asyncio import AsyncSession

from moat_api.auth.permissions import ROLE_PERMISSIONS, Permission
from moat_api.core.config import get_settings
from moat_api.db.models import AppSession, Membership, MembershipRole, Role, Tenant, User

settings = get_settings()

SESSION_COOKIE = "moat_session"


async def set_actor(session: AsyncSession, user_id: uuid.UUID) -> None:
    """Declare who is acting, for the membership row policy.

    Membership rows are visible within their tenant OR to the user they belong
    to. Before a tenant is chosen -- during login, and when listing the
    workspaces someone may switch into -- the second half of that policy is the
    only one that applies, so the actor must be set or the query correctly
    returns nothing.
    """
    await session.execute(
        text("SELECT set_config('app.user_id', :actor, true)"), {"actor": str(user_id)}
    )


def _hash_token(token: str) -> str:
    """Only the hash is stored. A database disclosure therefore does not hand
    an attacker usable sessions."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


@dataclass(frozen=True, slots=True)
class Principal:
    """Everything authorisation needs, resolved once per request."""

    user_id: uuid.UUID
    user_name: str
    user_email: str
    tenant_id: uuid.UUID
    tenant_slug: str
    tenant_name: str
    membership_id: uuid.UUID
    membership_revision: int
    roles: frozenset[str]
    permissions: frozenset[Permission]
    session_id: uuid.UUID

    def has(self, permission: Permission) -> bool:
        return permission in self.permissions


async def load_membership_roles(
    session: AsyncSession, membership_id: uuid.UUID
) -> tuple[frozenset[str], frozenset[Permission]]:
    rows = await session.execute(
        select(Role.key)
        .join(MembershipRole, MembershipRole.role_id == Role.id)
        .where(MembershipRole.membership_id == membership_id)
    )
    roles = frozenset(row[0] for row in rows)
    permissions: set[Permission] = set()
    for role in roles:
        permissions |= ROLE_PERMISSIONS.get(role, set())
    return roles, frozenset(permissions)


async def create_session(
    session: AsyncSession,
    *,
    user: User,
    membership: Membership,
    user_agent: str = "",
    client_ip: str = "",
) -> str:
    """Issue a session and return the raw token, which is never stored."""
    token = secrets.token_urlsafe(40)
    record = AppSession(
        token_hash=_hash_token(token),
        user_id=user.id,
        tenant_id=membership.tenant_id,
        # Pinning the revision is what makes a role change take effect on the
        # next request rather than whenever the session happens to expire.
        membership_revision=membership.revision,
        expires_at=datetime.now(UTC) + timedelta(hours=settings.session_ttl_hours),
        user_agent=user_agent[:400],
        client_ip=client_ip[:64],
    )
    session.add(record)
    await session.flush()
    return token


async def resolve_session(session: AsyncSession, token: str | None) -> Principal | None:
    """Turn a cookie into a Principal, or None.

    Every rejection path returns None rather than raising, so the caller cannot
    accidentally distinguish expired from revoked from forged.
    """
    if not token:
        return None

    record = (
        await session.execute(
            select(AppSession).where(AppSession.token_hash == _hash_token(token))
        )
    ).scalar_one_or_none()

    if record is None or record.revoked_at is not None:
        return None
    if record.expires_at <= datetime.now(UTC):
        return None

    # The session knows its user, so membership can now be read under a
    # user-scoped row policy instead of an unrestricted query.
    await set_actor(session, record.user_id)

    row = (
        await session.execute(
            select(User, Membership, Tenant)
            .join(Membership, Membership.user_id == User.id)
            .join(Tenant, Tenant.id == Membership.tenant_id)
            .where(
                User.id == record.user_id,
                Membership.tenant_id == record.tenant_id,
                User.is_active.is_(True),
                Membership.is_active.is_(True),
                Tenant.is_active.is_(True),
            )
        )
    ).first()

    if row is None:
        return None

    user, membership, tenant = row

    # Membership changed since this session was issued: force re-authentication
    # rather than serving stale permissions.
    if membership.revision != record.membership_revision:
        return None

    roles, permissions = await load_membership_roles(session, membership.id)

    return Principal(
        user_id=user.id,
        user_name=user.name,
        user_email=user.email,
        tenant_id=tenant.id,
        tenant_slug=tenant.slug,
        tenant_name=tenant.name,
        membership_id=membership.id,
        membership_revision=membership.revision,
        roles=roles,
        permissions=permissions,
        session_id=record.id,
    )


async def revoke_session(session: AsyncSession, session_id: uuid.UUID) -> None:
    await session.execute(
        update(AppSession)
        .where(AppSession.id == session_id, AppSession.revoked_at.is_(None))
        .values(revoked_at=datetime.now(UTC))
    )


async def revoke_all_for_user(session: AsyncSession, user_id: uuid.UUID) -> None:
    await session.execute(
        update(AppSession)
        .where(AppSession.user_id == user_id, AppSession.revoked_at.is_(None))
        .values(revoked_at=datetime.now(UTC))
    )
