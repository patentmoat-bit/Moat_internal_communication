from __future__ import annotations

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from moat_api.auth.sessions import Principal
from moat_api.db.models import AuditEvent


def record(
    session: AsyncSession,
    principal: Principal,
    action: str,
    *,
    resource_type: str = "",
    resource_id: uuid.UUID | None = None,
    request_id: str = "",
    **detail: object,
) -> None:
    """Append an audit row inside the caller's transaction.

    Same transaction as the change it describes, on purpose: an audit trail
    that can commit without its business change (or the reverse) is worse than
    none, because it is trusted and wrong.
    """
    session.add(
        AuditEvent(
            tenant_id=principal.tenant_id,
            actor_id=principal.user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            request_id=request_id,
            detail=dict(detail),
        )
    )
