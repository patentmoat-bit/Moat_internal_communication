from datetime import datetime
from pydantic import BaseModel, EmailStr, Field

from app.models.matter import MatterDocumentType, MatterMemberRole, MatterPriority, MatterStatus


class MatterBase(BaseModel):
    title: str = Field(..., max_length=255)
    description: str | None = None
    workspace_id: str | None = None
    client_name: str | None = Field(None, max_length=255)
    technology_area: str | None = Field(None, max_length=255)
    notes: str | None = None
    status: MatterStatus = MatterStatus.intake
    priority: MatterPriority = MatterPriority.medium
    due_date: datetime | None = None
    tags: list[str] = []


class MatterCreate(MatterBase):
    matter_number: str | None = Field(None, max_length=64)


class MatterUpdate(BaseModel):
    title: str | None = Field(None, max_length=255)
    description: str | None = None
    workspace_id: str | None = None
    client_name: str | None = Field(None, max_length=255)
    technology_area: str | None = Field(None, max_length=255)
    notes: str | None = None
    status: MatterStatus | None = None
    priority: MatterPriority | None = None
    due_date: datetime | None = None
    tags: list[str] | None = None


class MatterStatusUpdate(BaseModel):
    status: MatterStatus
    note: str | None = None


class MatterNotesUpdate(BaseModel):
    notes: str | None = None


class MatterMemberCreate(BaseModel):
    user_id: str | None = None
    email: EmailStr | None = None
    role: MatterMemberRole = MatterMemberRole.viewer


class MatterMemberUpdate(BaseModel):
    role: MatterMemberRole


class MatterShareRequest(MatterMemberCreate):
    message: str | None = None


class MatterDocumentCreate(BaseModel):
    filename: str = Field(..., max_length=255)
    document_type: MatterDocumentType = MatterDocumentType.other
    content_type: str | None = Field(None, max_length=120)
    size_bytes: int = Field(0, ge=0)
    storage_url: str | None = Field(None, max_length=1024)
    description: str | None = None


class MatterMemberResponse(BaseModel):
    id: str
    matter_id: str
    user_id: str
    role: MatterMemberRole
    joined_at: datetime
    user_name: str | None = None
    user_email: str | None = None

    class Config:
        from_attributes = True


class MatterDocumentResponse(BaseModel):
    id: str
    matter_id: str
    uploaded_by_id: str | None = None
    filename: str
    document_type: MatterDocumentType
    content_type: str | None = None
    size_bytes: int
    storage_url: str | None = None
    description: str | None = None
    created_at: datetime
    uploaded_by_name: str | None = None

    class Config:
        from_attributes = True


class MatterActivityResponse(BaseModel):
    id: str
    matter_id: str
    actor_id: str | None = None
    actor_name: str | None = None
    action: str
    entity_type: str
    entity_id: str | None = None
    message: str
    details: dict | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class MatterStatusHistoryResponse(BaseModel):
    id: str
    matter_id: str
    from_status: MatterStatus | None = None
    to_status: MatterStatus
    changed_by_id: str | None = None
    changed_by_name: str | None = None
    note: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class MatterResponse(MatterBase):
    id: str
    matter_number: str
    owner_id: str
    owner_name: str | None = None
    created_at: datetime
    updated_at: datetime
    role: MatterMemberRole = MatterMemberRole.owner
    member_count: int = 0
    document_count: int = 0
    activity_count: int = 0

    class Config:
        from_attributes = True


class MatterDetailResponse(MatterResponse):
    members: list[MatterMemberResponse] = []
    documents: list[MatterDocumentResponse] = []
    activity: list[MatterActivityResponse] = []
    status_history: list[MatterStatusHistoryResponse] = []

    class Config:
        from_attributes = True
