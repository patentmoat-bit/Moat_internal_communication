from __future__ import annotations

import uuid

from pydantic import EmailStr, Field

from moat_api.schemas.base import Schema


class LoginRequest(Schema):
    email: EmailStr
    password: str = Field(min_length=1, max_length=200)
    tenant_slug: str | None = None


class TenantRef(Schema):
    id: uuid.UUID
    slug: str
    name: str


class SessionUser(Schema):
    id: uuid.UUID
    name: str
    email: str


class SessionResponse(Schema):
    user: SessionUser
    tenant: TenantRef
    roles: list[str]
    permissions: list[str]
    # Every tenant this person may switch into, so the UI can offer a switcher
    # without a second round trip.
    available_tenants: list[TenantRef]


class SwitchTenantRequest(Schema):
    tenant_id: uuid.UUID
