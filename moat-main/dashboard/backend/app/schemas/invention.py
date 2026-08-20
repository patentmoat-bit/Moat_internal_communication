from datetime import datetime
from pydantic import BaseModel, Field

from app.models.invention import InventionDocumentType, InventionStatus


class InventionCreate(BaseModel):
    workspace_id: str | None = None
    matter_id: str | None = None
    title: str = Field(..., max_length=255)
    description: str | None = None
    status: InventionStatus = InventionStatus.draft


class InventionUpdate(BaseModel):
    workspace_id: str | None = None
    matter_id: str | None = None
    title: str | None = Field(None, max_length=255)
    description: str | None = None
    status: InventionStatus | None = None


class InventionDocumentResponse(BaseModel):
    id: str
    invention_id: str
    file_name: str
    file_type: InventionDocumentType
    content_type: str | None = None
    storage_url: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class InventionAnalysisResponse(BaseModel):
    id: str
    invention_id: str
    technical_summary: str | None = None
    innovation_summary: str | None = None
    key_components: list = []
    technical_domains: list = []
    differentiators: list = []
    workflows: list = []
    technical_architecture: dict | None = None
    innovation_highlights: list = []
    confidence_score: float = 0.0
    model_name: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class InventionResponse(BaseModel):
    id: str
    workspace_id: str | None = None
    matter_id: str | None = None
    title: str
    description: str | None = None
    status: InventionStatus
    created_by: str
    created_at: datetime
    updated_at: datetime
    documents: list[InventionDocumentResponse] = []
    latest_analysis: InventionAnalysisResponse | None = None

    class Config:
        from_attributes = True


class InventionAnalyzeRequest(BaseModel):
    force: bool = False


class InventionAnalyzeResponse(BaseModel):
    invention: InventionResponse
    analysis: InventionAnalysisResponse
    task_id: str | None = None
