"""
Background patent ingestion tasks (Celery + APScheduler).

Scheduled jobs:
  - fetch_recent_uspto   : every 6 hours
  - fetch_recent_epo     : every 12 hours
  - fetch_recent_wipo    : every 12 hours
  - fetch_recent_lens    : every 24 hours

All jobs:
  1. Call the relevant connector.get_recent()
  2. Run each patent through PatentNormalizer
  3. Store in PostgreSQL via PatentRepository
  4. Index in Elasticsearch
  5. Index in Weaviate (vector)
"""
from __future__ import annotations

import asyncio
import logging

from app.celery_app import celery_app

logger = logging.getLogger(__name__)


# ── Celery task helpers ──────────────────────────────────────────

def _run_async(coro):
    """Run an async coroutine inside a Celery (sync) task."""
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


async def _ingest_source(source_name: str, days: int = 7, limit: int = 100) -> dict:
    """Core async ingestion pipeline for a single source."""
    from app.database import async_session_factory
    from app.ingestion.connectors import PatentConnectorRegistry
    from app.ingestion.normalizer import PatentNormalizer
    from app.repositories.patent_repository import PatentRepository
    from app.ingestion.indexers import ElasticsearchIndexer
    from app.api.deps import get_elasticsearch_client
    from app.ai.embeddings import index_patent as index_weaviate

    connector_registry = PatentConnectorRegistry.create_default()
    connector = connector_registry.get(source_name)
    if not connector:
        logger.warning(f"No connector found for source: {source_name}")
        return {"source": source_name, "fetched": 0, "ingested": 0, "errors": 0}

    logger.info(f"Fetching recent patents from {source_name} (last {days} days, limit={limit})")

    try:
        patents = await connector.get_recent(days=days, limit=limit)
    except Exception as e:
        logger.error(f"Failed to fetch from {source_name}: {e}")
        return {"source": source_name, "fetched": 0, "ingested": 0, "errors": 1}

    if not patents:
        logger.info(f"{source_name}: no recent patents found")
        return {"source": source_name, "fetched": 0, "ingested": 0, "errors": 0}

    normalizer = PatentNormalizer()
    es = await get_elasticsearch_client()
    indexer = ElasticsearchIndexer(es)

    ingested = 0
    errors = 0

    async with async_session_factory() as db:
        repo = PatentRepository(db)

        for unified_patent in patents:
            try:
                # Normalize (in case connector already returns UnifiedPatent, this is a passthrough)
                normalized = await normalizer.normalize(unified_patent.model_dump())

                # Upsert to PostgreSQL
                db_dict = normalized.to_db_dict()
                existing = await repo.get_by_patent_number(normalized.patent_number)
                if existing:
                    patent = await repo.update(existing.id, **{
                        k: v for k, v in db_dict.items()
                        if k not in ("patent_number",) and v is not None
                    })
                else:
                    patent = await repo.create(**db_dict)

                # Index in Elasticsearch
                try:
                    es_doc = {**normalized.to_es_document(), "id": str(patent.id)}
                    await indexer.ensure_index()
                    await indexer.index_patent(es_doc)
                except Exception as es_err:
                    logger.warning(f"ES indexing failed for {normalized.patent_number}: {es_err}")

                # Index in Weaviate
                try:
                    claims_text = " ".join(c.text for c in normalized.claims[:5])
                    cpc_text = ", ".join(c.symbol for c in normalized.cpc_classifications[:5])
                    await index_weaviate(
                        patent_id=str(patent.id),
                        patent_number=normalized.patent_number,
                        title=normalized.title,
                        abstract=normalized.abstract or "",
                        claims=claims_text,
                        assignee=normalized.assignee or "",
                        inventors=", ".join(i.name for i in normalized.inventors),
                        filing_date=normalized.filing_date or "",
                        publication_date=normalized.publication_date or "",
                        cpc_classifications=cpc_text,
                        ipc_classifications=", ".join(c.symbol for c in normalized.ipc_classifications[:5]),
                        status=normalized.status,
                        citation_count=normalized.citation_count,
                    )
                except Exception as w_err:
                    logger.debug(f"Weaviate indexing failed for {normalized.patent_number}: {w_err}")

                ingested += 1

            except Exception as e:
                logger.error(f"Failed to process patent from {source_name}: {e}")
                errors += 1

        await db.commit()

    logger.info(f"{source_name}: fetched={len(patents)}, ingested={ingested}, errors={errors}")
    return {
        "source": source_name,
        "fetched": len(patents),
        "ingested": ingested,
        "errors": errors,
    }


# ── Celery tasks ─────────────────────────────────────────────────

@celery_app.task(name="tasks.ingest_recent_uspto", bind=True, max_retries=3)
def ingest_recent_uspto(self, days: int = 7, limit: int = 200):
    """Fetch and ingest recent USPTO grants."""
    try:
        return _run_async(_ingest_source("uspto", days=days, limit=limit))
    except Exception as exc:
        logger.error(f"ingest_recent_uspto failed: {exc}")
        raise self.retry(exc=exc, countdown=300)


@celery_app.task(name="tasks.ingest_recent_epo", bind=True, max_retries=3)
def ingest_recent_epo(self, days: int = 7, limit: int = 100):
    """Fetch and ingest recent EPO publications."""
    try:
        return _run_async(_ingest_source("epo", days=days, limit=limit))
    except Exception as exc:
        logger.error(f"ingest_recent_epo failed: {exc}")
        raise self.retry(exc=exc, countdown=600)


@celery_app.task(name="tasks.ingest_recent_wipo", bind=True, max_retries=3)
def ingest_recent_wipo(self, days: int = 7, limit: int = 100):
    """Fetch and ingest recent WIPO PCT publications."""
    try:
        return _run_async(_ingest_source("wipo", days=days, limit=limit))
    except Exception as exc:
        logger.error(f"ingest_recent_wipo failed: {exc}")
        raise self.retry(exc=exc, countdown=600)


@celery_app.task(name="tasks.ingest_recent_lens", bind=True, max_retries=3)
def ingest_recent_lens(self, days: int = 7, limit: int = 200):
    """Fetch and ingest recent patents from Lens.org."""
    try:
        return _run_async(_ingest_source("lens", days=days, limit=limit))
    except Exception as exc:
        logger.error(f"ingest_recent_lens failed: {exc}")
        raise self.retry(exc=exc, countdown=600)


@celery_app.task(name="tasks.ingest_source_on_demand")
def ingest_source_on_demand(source: str, query: str, limit: int = 50) -> dict:
    """
    Triggered on-demand (e.g. from the admin UI or ingestion API).
    Searches a given source for a keyword and ingests all results.
    """
    async def _run():
        from app.database import async_session_factory
        from app.ingestion.connectors import PatentConnectorRegistry
        from app.ingestion.normalizer import PatentNormalizer
        from app.repositories.patent_repository import PatentRepository
        from app.ingestion.indexers import ElasticsearchIndexer
        from app.api.deps import get_elasticsearch_client

        connector = PatentConnectorRegistry.create_default().get(source)
        if not connector:
            return {"error": f"Unknown source: {source}"}

        patents = await connector.search(query, limit=limit)
        normalizer = PatentNormalizer()
        es = await get_elasticsearch_client()
        indexer = ElasticsearchIndexer(es)
        ingested = 0

        async with async_session_factory() as db:
            repo = PatentRepository(db)
            for p in patents:
                try:
                    normalized = await normalizer.normalize(p.model_dump())
                    existing = await repo.get_by_patent_number(normalized.patent_number)
                    if not existing:
                        patent = await repo.create(**normalized.to_db_dict())
                        await indexer.index_patent({**normalized.to_es_document(), "id": str(patent.id)})
                        ingested += 1
                except Exception as e:
                    logger.error(f"on-demand ingestion error: {e}")
            await db.commit()

        return {"source": source, "query": query, "fetched": len(patents), "ingested": ingested}

    return _run_async(_run())


# ── Celery Beat schedule ─────────────────────────────────────────

CELERY_BEAT_SCHEDULE = {
    "ingest-recent-uspto-6h": {
        "task": "tasks.ingest_recent_uspto",
        "schedule": 21600,   # 6 hours
        "kwargs": {"days": 7, "limit": 200},
    },
    "ingest-recent-epo-12h": {
        "task": "tasks.ingest_recent_epo",
        "schedule": 43200,   # 12 hours
        "kwargs": {"days": 7, "limit": 100},
    },
    "ingest-recent-wipo-12h": {
        "task": "tasks.ingest_recent_wipo",
        "schedule": 43200,   # 12 hours
        "kwargs": {"days": 7, "limit": 100},
    },
    "ingest-recent-lens-24h": {
        "task": "tasks.ingest_recent_lens",
        "schedule": 86400,   # 24 hours
        "kwargs": {"days": 7, "limit": 200},
    },
}
