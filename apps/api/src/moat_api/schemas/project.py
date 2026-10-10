from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

class ProjectAssignmentBase(BaseModel):
    invention_id: UUID
    assigner_id: UUID | None = None
    drafter_id: UUID | None = None
    instructions: str = ""
    due_date: datetime | None = None

class ProjectAssignmentCreate(ProjectAssignmentBase):
    pass

class ProjectAssignmentOut(ProjectAssignmentBase):
    id: UUID
    project_status: str
    assignment_status: str
    tenant_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

class ProjectTransitionRequest(BaseModel):
    to_status: str
    reason: str = ""
