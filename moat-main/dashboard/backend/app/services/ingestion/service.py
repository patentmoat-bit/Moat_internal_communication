"""
Updated ingestion service using the new PatentNormalizer and 
new connector submodule that returns UnifiedPatent objects.
"""
import io
import time
import logging
from datetime import datetime, timezone
from typing import Any

from elasticsearch import AsyncElasticsearch
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.exceptions import BadRequestException, NotFoundException
from app.models.patent import Patent
from app.models.ingestion import IngestionJob, IngestionStatus, IngestionSource
from app.repositories.patent_repository import PatentRepository
from app.ingestion.pipeline import IngestionPipeline
from app.ingestion.normalizer import PatentNormalizer
from app.ingestion.indexers import ElasticsearchIndexer
from app.ingestion.connectors import PatentConnectorRegistry
from app.ai.embeddings import index_patent as index_patent_to_weaviate
from app.services.visualization.service import VisualizationService
from app.schemas.ingestion import (
    PatentIngestRequest,
    IngestionJobResponse,
    IngestionJobListResponse,
    BatchIngestResponse,
)
from app.core.cache import cache

logger = logging.getLogger(__name__)


class IngestionService:
    def __init__(self, db: AsyncSession, es_client: AsyncElasticsearch | None = None):
        self.db = db
        self.es_client = es_client
        self.patent_repo = PatentRepository(db)
        self.pipeline = IngestionPipeline()
        self.normalizer = PatentNormalizer()
        self.connectors = PatentConnectorRegistry.create_default()
        self.indexer = ElasticsearchIndexer(es_client) if es_client else None

    async def ingest_patent(self, request: PatentIngestRequest) -> dict:
        job = IngestionJob(
            patent_number=request.patent_number,
            source=request.source or "api",
            status=IngestionStatus.processing,
            job_metadata=request.metadata,
        )
        self.db.add(job)
        await self.db.flush()

        try:
            # Normalize via new pipeline
            raw_data = request.model_dump(exclude_none=True)
            normalized = await self.normalizer.normalize(raw_data)

            db_dict = normalized.to_db_dict()
            existing = await self.patent_repo.get_by_patent_number(normalized.patent_number)
            if existing:
                patent = await self.patent_repo.update(
                    existing.id,
                    **{k: v for k, v in db_dict.items()
                       if k not in ("patent_number",) and v is not None},
                )
            else:
                patent = await self.patent_repo.create(**db_dict)

            job.patent_id = patent.id
            job.status = IngestionStatus.completed

            # ── ES indexing ────────────────────────────────
            if self.indexer:
                try:
                    await self.indexer.ensure_index()
                    es_doc = {**normalized.to_es_document(), "id": str(patent.id)}
                    await self.indexer.index_patent(es_doc)
                except Exception as e:
                    logger.warning(f"ES indexing failed for {patent.id}: {e}")

            # ── Weaviate indexing ──────────────────────────
            try:
                claims_text = " ".join(c.text for c in normalized.claims[:10])
                cpc_text = ", ".join(c.symbol for c in normalized.cpc_classifications[:5])
                await index_patent_to_weaviate(
                    patent_id=str(patent.id),
                    patent_number=patent.patent_number or "",
                    title=patent.title or "",
                    abstract=patent.abstract or "",
                    claims=claims_text,
                    assignee=patent.assignee or "",
                    inventors=", ".join(
                        i.get("name", "") for i in (patent.inventors or [])
                        if isinstance(i, dict)
                    ),
                    filing_date=str(patent.filing_date or ""),
                    publication_date=str(patent.publication_date or ""),
                    cpc_classifications=cpc_text,
                    ipc_classifications=", ".join(c.symbol for c in normalized.ipc_classifications[:5]),
                    status=patent.status or "",
                    citation_count=len(patent.citations or []),
                )
            except Exception as e:
                logger.debug(f"Weaviate indexing failed for {patent.id}: {e}")

            # ── Graph sync ────────────────────────────────
            try:
                viz = VisualizationService(self.db)
                await viz.sync_patent_to_graph(patent)
            except Exception:
                pass

            # ── Invalidate cache ──────────────────────────
            await cache.delete(cache.patent_number_key(patent.patent_number))

            await self.db.flush()
            await self.db.refresh(patent)
            await self.db.refresh(job)

            return {
                "job": IngestionJobResponse.model_validate(job),
                "patent_id": patent.id,
                "patent_number": patent.patent_number,
            }

        except Exception as e:
            job.status = IngestionStatus.failed
            job.error_message = str(e)
            await self.db.flush()
            raise

    async def batch_ingest(self, requests: list[PatentIngestRequest], source: str = "batch") -> BatchIngestResponse:
        results = BatchIngestResponse(total=len(requests), success=0, failed=0, job_ids=[], errors=[])
        for req in requests:
            try:
                result = await self.ingest_patent(req)
                results.success += 1
                results.job_ids.append(result["job"].id)
            except Exception as e:
                results.failed += 1
                results.errors.append({"patent_number": req.patent_number, "error": str(e)})
        return results

    async def get_job(self, job_id: str) -> IngestionJob:
        stmt = select(IngestionJob).where(IngestionJob.id == job_id)
        result = await self.db.execute(stmt)
        job = result.scalar_one_or_none()
        if not job:
            raise NotFoundException("Ingestion job not found")
        return job

    async def list_jobs(
        self, page: int = 1, page_size: int = 20, status: str | None = None
    ) -> IngestionJobListResponse:
        stmt = select(IngestionJob)
        count_stmt = select(func.count()).select_from(IngestionJob)
        if status:
            stmt = stmt.where(IngestionJob.status == status)
            count_stmt = count_stmt.where(IngestionJob.status == status)

        total_result = await self.db.execute(count_stmt)
        total = total_result.scalar_one()
        stmt = stmt.order_by(IngestionJob.created_at.desc())
        stmt = stmt.offset((page - 1) * page_size).limit(page_size)
        result = await self.db.execute(stmt)
        jobs = list(result.scalars().all())
        return IngestionJobListResponse(
            jobs=[IngestionJobResponse.model_validate(j) for j in jobs],
            total=total, page=page, page_size=page_size,
        )

    async def retry_job(self, job_id: str) -> dict:
        job = await self.get_job(job_id)
        if job.status != IngestionStatus.failed:
            raise BadRequestException("Can only retry failed jobs")
        job.status = IngestionStatus.processing
        job.retry_count += 1
        job.error_message = None
        await self.db.flush()
        try:
            patent_data = {"patent_number": job.patent_number} if job.patent_number else {}
            if job.job_metadata:
                patent_data.update(job.job_metadata)
            normalized = await self.normalizer.normalize(patent_data)
            patent = await self.patent_repo.get_by_patent_number(normalized.patent_number)
            if not patent:
                patent = await self.patent_repo.create(**normalized.to_db_dict())
                job.patent_id = patent.id
            job.status = IngestionStatus.completed
            await self.db.flush()
            return {"status": "completed", "patent_id": str(patent.id) if patent else None}
        except Exception as e:
            job.status = IngestionStatus.failed
            job.error_message = str(e)
            await self.db.flush()
            raise

    async def search_external(self, source: str, query: str, limit: int = 20) -> list[dict]:
        connector = self.connectors.get(source)
        if not connector:
            raise BadRequestException(
                f"Unknown source: {source}. Available: {self.connectors.list_sources()}"
            )
        results = await connector.search(query, limit)
        return [p.model_dump() for p in results]

    async def fetch_external(self, source: str, patent_number: str) -> dict | None:
        connector = self.connectors.get(source)
        if not connector:
            raise BadRequestException(f"Unknown source: {source}")
        result = await connector.get_by_number(patent_number)
        if not result:
            raise NotFoundException(f"Patent {patent_number} not found in {source}")
        return result.model_dump()

    async def get_connector_sources(self) -> list[str]:
        return self.connectors.list_sources()
