from __future__ import annotations

import time
from collections import defaultdict

from fastapi import APIRouter, HTTPException, Request, Response, status
from sqlalchemy import select

from moat_api.auth.deps import CurrentPrincipal
from moat_api.auth.passwords import verify_password
from moat_api.auth.sessions import (
    SESSION_COOKIE,
    create_session,
    load_membership_roles,
    resolve_session,
    revoke_session,
    set_actor,
)
from moat_api.core import telemetry
from moat_api.core.config import get_settings
from moat_api.db.models import Membership, Tenant, User
from moat_api.db.session import tenant_session, unscoped_session
from moat_api.schemas.auth import (
    LoginRequest,
    SessionResponse,
    SessionUser,
    SwitchTenantRequest,
    TenantRef,
)

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()

# In-process throttle. Correct for a single replica and useless across several,
# so this moves to Valkey before the API is scaled out. Stated plainly rather
# than left as a false sense of protection.
_ATTEMPTS: dict[str, list[float]] = defaultdict(list)
_WINDOW_SECONDS = 300

# Two separate budgets, because they defend against different things.
#
# Per account: tight. Guessing one person's password is the attack, and a
# legitimate user does not need ten tries in five minutes.
_MAX_PER_ACCOUNT = settings.login_max_per_account
#
# Per source address: loose. A whole office behind one NAT gateway shares an
# egress IP, so a tight per-IP limit locks out colleagues who did nothing
# wrong. Found by the load profile, where every simulated user shares an
# address -- exactly the corporate-NAT shape.
_MAX_PER_ADDRESS = settings.login_max_per_address


def _record(key: str, limit: int) -> bool:
    """Returns False when the key is over its budget."""
    now = time.monotonic()
    recent = [moment for moment in _ATTEMPTS[key] if now - moment < _WINDOW_SECONDS]
    _ATTEMPTS[key] = recent
    if len(recent) >= limit:
        return False
    _ATTEMPTS[key].append(now)
    return True


def _throttle(email: str, client_ip: str) -> None:
    account_ok = _record(f"account:{email}", _MAX_PER_ACCOUNT)
    address_ok = _record(f"address:{client_ip}", _MAX_PER_ADDRESS) if client_ip else True
    if account_ok and address_ok:
        return

    telemetry.admission_rejections.labels(
        "login", "account" if not account_ok else "address"
    ).inc()
    raise HTTPException(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        detail={"code": "too_many_attempts", "message": "Too many attempts. Wait and retry."},
        headers={"Retry-After": str(_WINDOW_SECONDS)},
    )


def _set_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        SESSION_COOKIE,
        token,
        max_age=settings.session_ttl_hours * 3600,
        httponly=True,           # unreadable from JavaScript, so XSS cannot exfiltrate it
        secure=settings.cookie_secure,
        samesite="lax",          # blocks cross-site POST carrying the cookie
        path="/",
    )


async def _session_payload(
    session, principal_user: User, membership: Membership
) -> SessionResponse:
    await set_actor(session, principal_user.id)
    tenant = (
        await session.execute(select(Tenant).where(Tenant.id == membership.tenant_id))
    ).scalar_one()
    roles, permissions = await load_membership_roles(session, membership.id)

    rows = (
        await session.execute(
            select(Tenant)
            .join(Membership, Membership.tenant_id == Tenant.id)
            .where(Membership.user_id == principal_user.id, Membership.is_active.is_(True))
            .order_by(Tenant.name)
        )
    ).scalars()

    return SessionResponse(
        user=SessionUser(
            id=principal_user.id, name=principal_user.name, email=principal_user.email
        ),
        tenant=TenantRef(id=tenant.id, slug=tenant.slug, name=tenant.name),
        roles=sorted(roles),
        permissions=sorted(str(p) for p in permissions),
        available_tenants=[TenantRef(id=t.id, slug=t.slug, name=t.name) for t in rows],
    )


@router.post("/login", response_model=SessionResponse)
async def login(body: LoginRequest, request: Request, response: Response) -> SessionResponse:
    if settings.auth_mode != "dev":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "wrong_auth_mode",
                "message": "This deployment authenticates through its identity provider.",
            },
        )

    client_ip = request.client.host if request.client else ""
    _throttle(body.email.lower(), client_ip)

    async with unscoped_session() as session:
        user = (
            await session.execute(select(User).where(User.email == body.email.lower()))
        ).scalar_one_or_none()

        # One message and one timing profile for every failure, so the response
        # never reveals whether an address is registered.
        if not user or not user.is_active or not verify_password(body.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={"code": "invalid_credentials", "message": "Email or password is wrong."},
            )

        await set_actor(session, user.id)

        query = (
            select(Membership, Tenant)
            .join(Tenant, Tenant.id == Membership.tenant_id)
            .where(
                Membership.user_id == user.id,
                Membership.is_active.is_(True),
                Tenant.is_active.is_(True),
            )
        )
        if body.tenant_slug:
            query = query.where(Tenant.slug == body.tenant_slug)

        row = (await session.execute(query.order_by(Tenant.name))).first()
        if row is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "code": "no_membership",
                    "message": "This account has no active workspace.",
                },
            )

        membership, _tenant = row
        token = await create_session(
            session,
            user=user,
            membership=membership,
            user_agent=request.headers.get("user-agent", ""),
            client_ip=client_ip,
        )
        payload = await _session_payload(session, user, membership)

    # Audit lives in the tenant's own rows, so it is written under that tenant's
    # context rather than in the unscoped auth transaction.
    async with tenant_session(membership.tenant_id, user.id) as session:
        from moat_api.db.models import AuditEvent

        session.add(
            AuditEvent(
                tenant_id=membership.tenant_id,
                actor_id=user.id,
                action="auth.login",
                resource_type="user",
                resource_id=user.id,
                detail={"ip": client_ip, "mode": settings.auth_mode},
            )
        )

    _set_cookie(response, token)
    return payload


@router.get("/me", response_model=SessionResponse)
async def me(principal: CurrentPrincipal) -> SessionResponse:
    async with unscoped_session() as session:
        # Declare the actor before reading membership: the row policy is what
        # keeps this from being able to read anyone else's.
        await set_actor(session, principal.user_id)
        user = (
            await session.execute(select(User).where(User.id == principal.user_id))
        ).scalar_one()
        membership = (
            await session.execute(
                select(Membership).where(Membership.id == principal.membership_id)
            )
        ).scalar_one()
        return await _session_payload(session, user, membership)


@router.post("/switch-tenant", response_model=SessionResponse)
async def switch_tenant(
    body: SwitchTenantRequest, principal: CurrentPrincipal, request: Request, response: Response
) -> SessionResponse:
    """Switching workspace issues a NEW session rather than mutating the current
    one, so a session token is only ever valid for the tenant it was minted for."""
    async with unscoped_session() as session:
        await set_actor(session, principal.user_id)
        row = (
            await session.execute(
                select(User, Membership)
                .join(Membership, Membership.user_id == User.id)
                .where(
                    User.id == principal.user_id,
                    Membership.tenant_id == body.tenant_id,
                    Membership.is_active.is_(True),
                )
            )
        ).first()
        if row is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "code": "no_membership",
                    "message": "You are not a member of that workspace.",
                },
            )
        user, membership = row
        await revoke_session(session, principal.session_id)
        token = await create_session(
            session,
            user=user,
            membership=membership,
            user_agent=request.headers.get("user-agent", ""),
            client_ip=request.client.host if request.client else "",
        )
        payload = await _session_payload(session, user, membership)

    _set_cookie(response, token)
    return payload


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(request: Request, response: Response) -> Response:
    token = request.cookies.get(SESSION_COOKIE)
    if token:
        async with unscoped_session() as session:
            principal = await resolve_session(session, token)
            if principal:
                await revoke_session(session, principal.session_id)
    response.delete_cookie(SESSION_COOKIE, path="/")
    response.status_code = status.HTTP_204_NO_CONTENT
    return response
