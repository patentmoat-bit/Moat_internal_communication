from datetime import datetime
from pydantic import BaseModel, Field


class PatentResponse(BaseModel):
    id: str
    patent_number: str
    title: str
    abstract: str | None = None
    claims: dict | None = None
    inventors: dict | None = None
    assignee: str | None = None
    filing_date: datetime | None = None
    publication_date: datetime | None = None
    status: str | None = None
    cpc_classifications: dict | None = None
    ipc_classifications: dict | None = None
    citations: dict | None = None
    patent_metadata: dict | None = Field(None, alias="metadata")
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True, "populate_by_name": True}


class PatentSearchResult(BaseModel):
    patents: list[PatentResponse]
    total: int
    page: int
    page_size: int
    took_ms: float


class PatentSearchFilters(BaseModel):
    query: str | None = None
    assignee: str | None = None
    status: str | None = None
    date_from: str | None = None
    date_to: str | None = None
    cpc_class: str | None = None
    inventor: str | None = None
