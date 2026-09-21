from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy import select

from moat_api.auth.deps import CurrentPrincipal, ScopedDB, require
from moat_api.auth.permissions import ROLE_LABELS, Permission
from moat_api.db.models import Membership, MembershipRole, Role, User
from moat_api.schemas.base import Schema

router = APIRouter(prefix="/users", tags=["users"])


class Colleague(Schema):
    id: uuid.UUID
    name: str
    email: str
    roles: list[str]
    role_labels: list[str]


@router.get("", response_model=list[Colleague])
async def list_colleagues(
    db: ScopedDB,
    principal: CurrentPrincipal,
    _: object = Depends(require(Permission.USER_READ)),
) -> list[Colleague]:
    """People in the caller's tenant.

    Membership rows are filtered by the row policy, so this returns colleagues
    in this workspace only -- never the same person's membership elsewhere.
    """
    rows = (
        await db.execute(
            select(User, Role.key)
            .join(Membership, Membership.user_id == User.id)
            .outerjoin(MembershipRole, MembershipRole.membership_id == Membership.id)
            .outerjoin(Role, Role.id == MembershipRole.role_id)
            .where(Membership.tenant_id == principal.tenant_id, Membership.is_active.is_(True))
            .order_by(User.name)
        )
    ).all()

    grouped: dict[uuid.UUID, Colleague] = {}
    for user, role_key in rows:
        entry = grouped.get(user.id)
        if entry is None:
            entry = Colleague(
                id=user.id, name=user.name, email=user.email, roles=[], role_labels=[]
            )
            grouped[user.id] = entry
        if role_key and role_key not in entry.roles:
            entry.roles.append(role_key)
            entry.role_labels.append(ROLE_LABELS.get(role_key, role_key))
    return list(grouped.values())
