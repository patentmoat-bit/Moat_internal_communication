from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.schemas.workspace import (
    WorkspaceActivityResponse,
    WorkspaceAuditLogResponse,
    WorkspaceCreate,
    WorkspaceDetailResponse,
    WorkspaceMemberCreate,
    WorkspaceMemberResponse,
    WorkspaceMemberUpdate,
    WorkspaceProjectCreate,
    WorkspaceProjectResponse,
    WorkspaceProjectUpdate,
    WorkspaceResponse,
    WorkspaceUpdate,
)
from app.services.workspace.service import WorkspaceService

router = APIRouter(prefix="/workspaces", tags=["workspaces"])


@router.get("", response_model=list[WorkspaceResponse])
async def list_workspaces(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = WorkspaceService(db)
    return await svc.list_workspaces(current_user.id)


@router.post("", response_model=WorkspaceResponse, status_code=status.HTTP_201_CREATED)
async def create_workspace(
    data: WorkspaceCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = WorkspaceService(db)
    return await svc.create_workspace(data, current_user.id)


@router.get("/{workspace_id}", response_model=WorkspaceDetailResponse)
async def get_workspace(
    workspace_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = WorkspaceService(db)
    return await svc.get_workspace(workspace_id, current_user.id)


@router.put("/{workspace_id}", response_model=WorkspaceResponse)
async def update_workspace(
    workspace_id: str,
    data: WorkspaceUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = WorkspaceService(db)
    return await svc.update_workspace(workspace_id, data, current_user.id)


@router.delete("/{workspace_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workspace(
    workspace_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = WorkspaceService(db)
    await svc.delete_workspace(workspace_id, current_user.id)


@router.get("/{workspace_id}/members", response_model=list[WorkspaceMemberResponse])
async def list_members(
    workspace_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = WorkspaceService(db)
    return await svc.list_members(workspace_id, current_user.id)


@router.post("/{workspace_id}/members", response_model=WorkspaceMemberResponse, status_code=status.HTTP_201_CREATED)
async def add_member(
    workspace_id: str,
    data: WorkspaceMemberCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = WorkspaceService(db)
    return await svc.add_member(workspace_id, data, current_user.id)


@router.patch("/{workspace_id}/members/{member_id}", response_model=WorkspaceMemberResponse)
async def update_member(
    workspace_id: str,
    member_id: str,
    data: WorkspaceMemberUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = WorkspaceService(db)
    return await svc.update_member(workspace_id, member_id, data, current_user.id)


@router.delete("/{workspace_id}/members/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(
    workspace_id: str,
    member_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = WorkspaceService(db)
    await svc.remove_member(workspace_id, member_id, current_user.id)


@router.get("/{workspace_id}/projects", response_model=list[WorkspaceProjectResponse])
async def list_projects(
    workspace_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = WorkspaceService(db)
    return await svc.list_projects(workspace_id, current_user.id)


@router.post("/{workspace_id}/projects", response_model=WorkspaceProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    workspace_id: str,
    data: WorkspaceProjectCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = WorkspaceService(db)
    return await svc.create_project(workspace_id, data, current_user.id)


@router.patch("/{workspace_id}/projects/{project_id}", response_model=WorkspaceProjectResponse)
async def update_project(
    workspace_id: str,
    project_id: str,
    data: WorkspaceProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = WorkspaceService(db)
    return await svc.update_project(workspace_id, project_id, data, current_user.id)


@router.delete("/{workspace_id}/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    workspace_id: str,
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = WorkspaceService(db)
    await svc.delete_project(workspace_id, project_id, current_user.id)


@router.get("/{workspace_id}/activity", response_model=list[WorkspaceActivityResponse])
async def list_activity(
    workspace_id: str,
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = WorkspaceService(db)
    return await svc.list_activity(workspace_id, current_user.id, limit)


@router.get("/{workspace_id}/audit-logs", response_model=list[WorkspaceAuditLogResponse])
async def list_audit_logs(
    workspace_id: str,
    limit: int = Query(100, ge=1, le=250),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = WorkspaceService(db)
    return await svc.list_audit_logs(workspace_id, current_user.id, limit)
