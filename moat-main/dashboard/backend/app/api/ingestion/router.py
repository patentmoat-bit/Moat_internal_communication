from fastapi import APIRouter, Depends, Query, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user, get_current_admin_user, get_elasticsearch_client
from app.models.user import User
from app.schemas.ingestion import (
    PatentIngestRequest,
    IngestionJobResponse,
    IngestionJobListResponse,
    BatchIngestRequest,
    BatchIngestResponse,
    ConnectorSearchRequest,
    ConnectorFetchRequest,
)
from app.services.ingestion.service import IngestionService

router = APIRouter(prefix="/ingestion", tags=["ingestion"])


@router.post("/patents", response_model=dict, status_code=201)
async def ingest_patent(
    request: PatentIngestRequest,
    current_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    es = await get_elasticsearch_client()
    service = IngestionService(db, es)
    return await service.ingest_patent(request)


@router.post("/patents/batch", response_model=BatchIngestResponse)
async def batch_ingest(
    request: BatchIngestRequest,
    current_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
) -> BatchIngestResponse:
    es = await get_elasticsearch_client()
    service = IngestionService(db, es)
    return await service.batch_ingest(request.patents, request.source)


@router.post("/upload", response_model=dict, status_code=201)
async def upload_patent(
    file: UploadFile = File(...),
    source: str = Form("upload"),
    current_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    content = await file.read()
    text_content = content.decode("utf-8", errors="replace")

    request = PatentIngestRequest(
        patent_number="",
        title=f"Uploaded: {file.filename}",
        raw_text=text_content,
        source=source,
        metadata={"filename": file.filename, "size": len(content)},
    )

    es = await get_elasticsearch_client()
    service = IngestionService(db, es)
    result = await service.ingest_patent(request)
    result["filename"] = file.filename
    result["file_size"] = len(content)
    return result


@router.get("/jobs", response_model=IngestionJobListResponse)
async def list_ingestion_jobs(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: str | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IngestionJobListResponse:
    service = IngestionService(db)
    return await service.list_jobs(page, page_size, status)


@router.get("/jobs/{job_id}", response_model=IngestionJobResponse)
async def get_ingestion_job(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IngestionJobResponse:
    service = IngestionService(db)
    job = await service.get_job(job_id)
    return IngestionJobResponse.model_validate(job)


@router.post("/jobs/{job_id}/retry", response_model=dict)
async def retry_ingestion_job(
    job_id: str,
    current_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    service = IngestionService(db)
    return await service.retry_job(job_id)


@router.get("/connectors", response_model=list[str])
async def list_connectors(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[str]:
    service = IngestionService(db)
    return await service.get_connector_sources()


@router.post("/connectors/search", response_model=list[dict])
async def search_external(
    request: ConnectorSearchRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    service = IngestionService(db)
    return await service.search_external(request.source, request.query, request.limit)


@router.post("/connectors/fetch", response_model=dict)
async def fetch_external(
    request: ConnectorFetchRequest,
    current_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    service = IngestionService(db)
    result = await service.fetch_external(request.source, request.patent_number)
    if result is None:
        return {"detail": "Patent not found"}
    return result
