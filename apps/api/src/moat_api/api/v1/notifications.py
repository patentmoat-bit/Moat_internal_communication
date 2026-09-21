from __future__ import annotations

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select, update

from moat_api.auth.deps import CurrentPrincipal, ScopedDB, require
from moat_api.auth.permissions import Permission
from moat_api.db.models import Notification
from moat_api.schemas.base import Schema

router = APIRouter(prefix="/notifications", tags=["notifications"])


class NotificationOut(Schema):
    id: uuid.UUID
    kind: str
    title: str
    body: str
    action_url: str
    priority: str
    created_at: datetime
    read_at: datetime | None


@router.get("", response_model=list[NotificationOut])
async def list_notifications(
    db: ScopedDB,
    principal: CurrentPrincipal,
    _: object = Depends(require(Permission.NOTIFICATION_READ)),
    unread_only: bool = Query(default=False),
    limit: int = Query(default=50, ge=1, le=200),
) -> list[Notification]:
    # Scoped to the caller as well as the tenant: colleagues share a tenant but
    # not an inbox.
    query = select(Notification).where(Notification.user_id == principal.user_id)
    if unread_only:
        query = query.where(Notification.read_at.is_(None))
    rows = await db.execute(query.order_by(Notification.created_at.desc()).limit(limit))
    return list(rows.scalars())


@router.post("/{notification_id}/read", status_code=status.HTTP_204_NO_CONTENT)
async def mark_read(
    notification_id: uuid.UUID,
    db: ScopedDB,
    principal: CurrentPrincipal,
    _: object = Depends(require(Permission.NOTIFICATION_READ)),
) -> None:
    await db.execute(
        update(Notification)
        .where(
            Notification.id == notification_id,
            Notification.user_id == principal.user_id,
            Notification.read_at.is_(None),
        )
        .values(read_at=datetime.now(UTC))
    )
