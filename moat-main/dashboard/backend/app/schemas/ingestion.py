from datetime import datetime
from pydantic import BaseModel, Field


class IngestionJobCreate(BaseModel):
    patent_number: str | None = None
    source: str = "api"
    source_url: str | None = None
    file_name: str | None = None
    metadata: dict | None = None


class IngestionJobResponse(BaseModel):
    id: str
    patent_id: str | None = None
    patent_number: str | None = None
    source: str
    status: str
    pipeline_time_ms: float | None = None
    error_message: str | None = None
    error_details: dict | None = None
    retry_count: int = 0
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


class IngestionJobListResponse(BaseModel):
    jobs: list[IngestionJobResponse]
    total: int
    page: int
    page_size: int


class PatentIngestRequest(BaseModel):
    patent_number: str
    title: str | None = None
    abstract: str | None = None
    claims: list | None = None
    inventors: list | None = None
    assignee: str | None = None
    filing_date: str | None = None
    publication_date: str | None = None
    status: str | None = None
    cpc_classifications: list | None = None
    ipc_classifications: list | None = None
    citations: list | None = None
    raw_text: str | None = None
    source: str = "api"
    metadata: dict | None = Field(None, alias="metadata")


class BatchIngestRequest(BaseModel):
    patents: list[PatentIngestRequest]
    source: str = "batch"


class BatchIngestResponse(BaseModel):
    total: int
    success: int
    failed: int
    job_ids: list[str]
    errors: list[dict] = []


class ConnectorSearchRequest(BaseModel):
    source: str
    query: str
    limit: int = 20


class ConnectorFetchRequest(BaseModel):
    source: str
    patent_number: str
