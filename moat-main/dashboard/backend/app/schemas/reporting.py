from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ReportRequest(BaseModel):
    patent_ids: list[str]
    include_ai_summary: bool = True
    include_claims: bool = True
    include_metadata: bool = True
    format: str = "pdf"


class ScheduledReportCreate(BaseModel):
    name: str
    query: Optional[str] = None
    filters: Optional[dict] = None
    schedule: str = "weekly"
    format: str = "pdf"
    recipients: list[str]


class ScheduledReportResponse(BaseModel):
    id: str
    name: str
    query: Optional[str] = None
    schedule: str
    format: str
    recipients: list[str]
    last_run_at: Optional[datetime] = None
    next_run_at: Optional[datetime] = None
    is_active: bool
    created_at: datetime


class ReportResponse(BaseModel):
    id: str
    name: str
    format: str
    status: str
    file_url: Optional[str] = None
    created_at: datetime


class ReportListResponse(BaseModel):
    reports: list[ReportResponse]
    total: int
