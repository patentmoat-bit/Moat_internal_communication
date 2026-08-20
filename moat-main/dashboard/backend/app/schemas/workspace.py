from datetime import datetime
from pydantic import BaseModel, EmailStr, Field

from app.models.workspace import WorkspaceProjectStatus, WorkspaceRole


class WorkspaceBase(BaseModel):
    name: str = Field(..., max_length=255)
    description: str | None = Field(None, max_length=1024)
    notes: str | None = None


class WorkspaceCreate(WorkspaceBase):
    pass


class WorkspaceUpdate(BaseModel):
    name: str | None = Field(None, max_length=255)
    description: str | None = Field(None, max_length=1024)
    notes: str | None = None


class WorkspaceMemberCreate(BaseModel):
    user_id: str | None = None
    email: EmailStr | None = None
    role: WorkspaceRole = WorkspaceRole.viewer


class WorkspaceMemberUpdate(BaseModel):
    role: WorkspaceRole


class WorkspaceMemberResponse(BaseModel):
    id: str
    workspace_id: str
    user_id: str
    role: WorkspaceRole
    joined_at: datetime
    user_name: str | None = None
    user_email: str | None = None

    class Config:
        from_attributes = True


class WorkspaceProjectBase(BaseModel):
    name: str = Field(..., max_length=255)
    description: str | None = None
    status: WorkspaceProjectStatus = WorkspaceProjectStatus.active
    owner_id: str | None = None
    due_date: datetime | None = None


class WorkspaceProjectCreate(WorkspaceProjectBase):
    pass


class WorkspaceProjectUpdate(BaseModel):
    name: str | None = Field(None, max_length=255)
    description: str | None = None
    status: WorkspaceProjectStatus | None = None
    owner_id: str | None = None
    due_date: datetime | None = None


class WorkspaceProjectResponse(WorkspaceProjectBase):
    id: str
    workspace_id: str
    created_at: datetime
    updated_at: datetime
    owner_name: str | None = None

    class Config:
        from_attributes = True


class WorkspaceActivityResponse(BaseModel):
    id: str
    workspace_id: str
    actor_id: str | None = None
    action: str
    entity_type: str
    entity_id: str | None = None
    message: str
    created_at: datetime
    actor_name: str | None = None

    class Config:
        from_attributes = True


class WorkspaceAuditLogResponse(BaseModel):
    id: str
    user_id: str | None = None
    action: str
    resource_type: str
    resource_id: str | None = None
    details: dict | None = None
    ip_address: str | None = None
    created_at: datetime | None = None
    user_name: str | None = None

    class Config:
        from_attributes = True


class WorkspaceResponse(WorkspaceBase):
    id: str
    owner_id: str
    created_at: datetime
    updated_at: datetime
    role: WorkspaceRole = WorkspaceRole.owner
    member_count: int = 0
    project_count: int = 0

    class Config:
        from_attributes = True


class WorkspaceDetailResponse(WorkspaceResponse):
    collections: list = []
    members: list[WorkspaceMemberResponse] = []
    projects: list[WorkspaceProjectResponse] = []
    activity: list[WorkspaceActivityResponse] = []
    audit_logs: list[WorkspaceAuditLogResponse] = []

    class Config:
        from_attributes = True
