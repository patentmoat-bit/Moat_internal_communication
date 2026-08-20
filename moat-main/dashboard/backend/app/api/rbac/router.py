from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.models.rbac import Role, Permission
from app.schemas.rbac import RoleWorkspaceResponse
from app.services.rbac_service import RBACService
from app.core.rbac_middleware import RequireRole, TokenPayload

router = APIRouter(prefix="/rbac", tags=["rbac"])


@router.get("/me/workspace", response_model=RoleWorkspaceResponse)
async def get_my_role_workspace(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> RoleWorkspaceResponse:
    return await RBACService(db).get_role_workspace(current_user)

@router.get("/roles")
async def get_roles(
    payload: TokenPayload = Depends(RequireRole(["admin"])),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Role))
    roles = result.scalars().all()
    return [{"id": r.id, "name": r.name, "label": r.label, "workspace_route": r.workspace_route} for r in roles]

@router.get("/permissions")
async def get_permissions(
    payload: TokenPayload = Depends(RequireRole(["admin"])),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Permission))
    perms = result.scalars().all()
    return [{"id": p.id, "key": p.key, "label": p.label, "category": p.category} for p in perms]
