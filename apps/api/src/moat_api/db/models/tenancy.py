from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from moat_api.db.base import Base, PrimaryKeyMixin, TimestampMixin


class Tenant(Base, PrimaryKeyMixin, TimestampMixin):
    """A customer organisation. The isolation boundary for everything."""

    __tablename__ = "tenants"

    slug: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, server_default=text("true"), nullable=False)

    memberships: Mapped[list[Membership]] = relationship(back_populates="tenant")


class User(Base, PrimaryKeyMixin, TimestampMixin):
    """A person.

    Not tenant-owned: one person can hold membership in several tenants, which
    is why authorisation is resolved per membership rather than per user.
    """

    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(320), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)

    # Set only under MOAT_AUTH_MODE=dev. Under OIDC the identity provider holds
    # credentials and this stays null (design doc §2: "the application does not
    # store passwords").
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # OIDC subject claim, once the user has signed in through Keycloak.
    external_subject: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)

    is_active: Mapped[bool] = mapped_column(Boolean, server_default=text("true"), nullable=False)
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    memberships: Mapped[list[Membership]] = relationship(back_populates="user")


class Role(Base, PrimaryKeyMixin, TimestampMixin):
    """A named bundle of permissions, e.g. `counsel`.

    A user may hold several roles in one tenant; the blueprint's one-role-per-
    person model does not survive contact with a real org chart.
    """

    __tablename__ = "roles"

    key: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    label: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str] = mapped_column(String(500), server_default="", nullable=False)


class Permission(Base, PrimaryKeyMixin):
    __tablename__ = "permissions"

    key: Mapped[str] = mapped_column(String(96), unique=True, nullable=False)
    description: Mapped[str] = mapped_column(String(300), server_default="", nullable=False)


class RolePermission(Base):
    __tablename__ = "role_permissions"

    role_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True
    )
    permission_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True
    )


class Membership(Base, PrimaryKeyMixin, TimestampMixin):
    """A user's standing in one tenant."""

    __tablename__ = "memberships"
    __table_args__ = (
        UniqueConstraint("tenant_id", "user_id", name="uq_memberships_tenant_user"),
        # Composite target so tenant-owned rows can reference a membership
        # without being able to point at another tenant's membership.
        UniqueConstraint("tenant_id", "id", name="uq_memberships_tenant_id_id"),
        Index("ix_memberships_user_active", "user_id", "is_active"),
    )

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    is_active: Mapped[bool] = mapped_column(Boolean, server_default=text("true"), nullable=False)

    # Bumped whenever roles or standing change. Live sessions carry the value
    # they were issued with, so a permission change takes effect on the next
    # request instead of whenever the session happens to expire.
    revision: Mapped[int] = mapped_column(Integer, server_default=text("1"), nullable=False)

    tenant: Mapped[Tenant] = relationship(back_populates="memberships")
    user: Mapped[User] = relationship(back_populates="memberships")
    roles: Mapped[list[MembershipRole]] = relationship(
        back_populates="membership", cascade="all, delete-orphan"
    )


class MembershipRole(Base):
    __tablename__ = "membership_roles"

    membership_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("memberships.id", ondelete="CASCADE"), primary_key=True
    )
    role_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True
    )

    membership: Mapped[Membership] = relationship(back_populates="roles")
    role: Mapped[Role] = relationship()


class AppSession(Base, PrimaryKeyMixin, TimestampMixin):
    """A browser session.

    Stored server-side so it can be revoked immediately. The cookie carries an
    opaque token; only its hash is persisted, so a database disclosure does not
    hand over usable sessions.
    """

    __tablename__ = "app_sessions"
    __table_args__ = (Index("ix_app_sessions_user_expiry", "user_id", "expires_at"),)

    token_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    # The tenant this session is currently acting in. Switching tenant issues a
    # new session rather than mutating this one.
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    membership_revision: Mapped[int] = mapped_column(Integer, nullable=False)

    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user_agent: Mapped[str] = mapped_column(String(400), server_default="", nullable=False)
    client_ip: Mapped[str] = mapped_column(String(64), server_default="", nullable=False)
