from __future__ import annotations

from collections.abc import AsyncIterator
from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from moat_api.auth.permissions import Permission
from moat_api.auth.sessions import SESSION_COOKIE, Principal, resolve_session
from moat_api.core.config import get_settings
from moat_api.db.session import tenant_session, unscoped_session

settings = get_settings()

SAFE_METHODS = frozenset({"GET", "HEAD", "OPTIONS"})


async def current_principal(request: Request) -> Principal:
    """Resolve the caller, or refuse the request.

    Runs on its own short transaction so that session lookup cannot be affected
    by, or hold locks alongside, the request's business transaction.
    """
    token = request.cookies.get(SESSION_COOKIE)
    async with unscoped_session() as session:
        principal = await resolve_session(session, token)

    if principal is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "not_authenticated", "message": "Sign in to continue."},
        )

    # Cross-origin write protection. SameSite=Lax already blocks the common
    # cases; an explicit Origin check covers the rest and costs nothing.
    if request.method not in SAFE_METHODS:
        origin = request.headers.get("origin")
        if origin is not None and origin != settings.web_origin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"code": "bad_origin", "message": "Cross-origin request refused."},
            )

    request.state.principal = principal
    return principal


CurrentPrincipal = Annotated[Principal, Depends(current_principal)]


async def scoped_db(principal: CurrentPrincipal) -> AsyncIterator[AsyncSession]:
    """A transaction pinned to the caller's tenant.

    Handing routes this instead of a bare session is what makes tenant scoping
    the default: a route cannot read another tenant's rows even if its own
    WHERE clause forgets to filter, because the row policy does it.
    """
    async with tenant_session(principal.tenant_id, principal.user_id) as session:
        yield session


ScopedDB = Annotated[AsyncSession, Depends(scoped_db)]


def require(*permissions: Permission):
    """Route dependency asserting every listed permission."""

    async def _check(principal: CurrentPrincipal) -> Principal:
        missing = [p for p in permissions if not principal.has(p)]
        if missing:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "code": "forbidden",
                    "message": "You do not have permission to do that.",
                    "required": [str(p) for p in missing],
                },
            )
        return principal

    return _check
