import asyncio
import logging
from typing import Any

from celery import states
from celery.exceptions import Ignore

from app.ingestion.workers.celery_app import celery_app

logger = logging.getLogger(__name__)


def run_async(coro):
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


@celery_app.task(bind=True, name="process_patent_document", max_retries=3)
def process_patent_document(self, patent_data: dict, source: str = "upload") -> dict:
    try:
        from app.ingestion.pipeline import IngestionPipeline
        pipeline = IngestionPipeline()
        result = run_async(pipeline.process_single(patent_data))
        return {"status": "completed", "patent_id": result.get("id"), **result}
    except Exception as exc:
        logger.error(f"Failed to process patent: {exc}")
        self.update_state(state=states.FAILURE, meta={"error": str(exc)})
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))


@celery_app.task(bind=True, name="index_patent_to_es", max_retries=3)
def index_patent_to_es(self, patent_id: str) -> dict:
    try:
        from elasticsearch import AsyncElasticsearch
        from app.config import settings
        from app.ingestion.indexers import ElasticsearchIndexer

        es = AsyncElasticsearch(hosts=[settings.ELASTICSEARCH_HOST])
        indexer = ElasticsearchIndexer(es)

        from app.database import async_session_factory
        from sqlalchemy import select
        from app.models.patent import Patent

        async def _run():
            async with async_session_factory() as session:
                result = await session.execute(select(Patent).where(Patent.id == patent_id))
                patent = result.scalar_one_or_none()
                if not patent:
                    raise ValueError(f"Patent {patent_id} not found")

                patent_dict = {
                    "id": patent.id,
                    "patent_number": patent.patent_number,
                    "title": patent.title,
                    "abstract": patent.abstract,
                    "claims": patent.claims,
                    "inventors": patent.inventors,
                    "assignee": patent.assignee,
                    "filing_date": str(patent.filing_date) if patent.filing_date else None,
                    "publication_date": str(patent.publication_date) if patent.publication_date else None,
                    "status": patent.status,
                    "cpc_classifications": patent.cpc_classifications,
                    "ipc_classifications": patent.ipc_classifications,
                    "citations": patent.citations,
                    "patent_metadata": patent.patent_metadata,
                    "source": "internal",
                    "created_at": patent.created_at.isoformat() if patent.created_at else None,
                    "updated_at": patent.updated_at.isoformat() if patent.updated_at else None,
                }

                await indexer.ensure_index()
                result = await indexer.index_patent(patent_dict)
                return {"status": "indexed", "patent_id": patent_id, "es_result": result.get("result")}

        return run_async(_run())
    except Exception as exc:
        logger.error(f"Failed to index patent {patent_id}: {exc}")
        self.update_state(state=states.FAILURE, meta={"error": str(exc)})
        raise self.retry(exc=exc, countdown=60)


@celery_app.task(bind=True, name="batch_ingest")
def batch_ingest(self, patent_list: list[dict], source: str = "batch") -> dict:
    from app.ingestion.pipeline import IngestionPipeline

    results = {"total": len(patent_list), "success": 0, "failed": 0, "errors": []}

    for i, patent_data in enumerate(patent_list):
        try:
            pipeline = IngestionPipeline()
            run_async(pipeline.process_single(patent_data))
            results["success"] += 1
            self.update_state(
                state=states.STARTED,
                meta={
                    "current": i + 1,
                    "total": len(patent_list),
                    "success": results["success"],
                    "failed": results["failed"],
                },
            )
        except Exception as exc:
            results["failed"] += 1
            results["errors"].append({"index": i, "error": str(exc)})

    return results
