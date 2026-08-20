"""
Semantic Search API — Production-grade endpoints.

Routes:
  POST /api/v1/semantic/search          Hybrid keyword + vector search
  POST /api/v1/semantic/prior-art       Prior art discovery with claim matching
  POST /api/v1/semantic/similar         Similar patent search by patent_id
  POST /api/v1/semantic/embed           Generate embedding for a text snippet
  POST /api/v1/semantic/ingest          Ingest a single patent into vector store
  POST /api/v1/semantic/ingest/batch    Batch ingest patents
  POST /api/v1/semantic/reindex         Re-index all DB patents (admin only)
  GET  /api/v1/semantic/health          Vector store / embedding health check
  GET  /api/v1/semantic/stats           Collection object counts
"""

from __future__ import annotations

from typing import Any

from elasticsearch import AsyncElasticsearch
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db, get_elasticsearch_client
from app.models.user import User, UserRole
from app.repositories.patent_repository import PatentRepository
from app.semantic.embedding_provider import get_embedding_provider
from app.semantic.ingestion import VectorIngestionPipeline, get_pipeline
from app.semantic.prior_art import PriorArtSearchEngine, get_prior_art_engine
from app.semantic.search import HybridSearchEngine, SearchRequest, get_search_engine
from app.semantic.vector_store import collection_stats, delete_patent
from app.core.logging import logger

router = APIRouter(prefix="/semantic", tags=["semantic-search"])


# ─── Request / Response Schemas ───────────────────────────────────────────────

class HybridSearchBody(BaseModel):
    query: str = Field(..., min_length=2, description="Natural-language search query")
    limit: int = Field(20, ge=1, le=100)
    assignee: str | None = None
    source: list[str] | None = None
    cpc_codes: list[str] | None = None
    date_from: str | None = Field(None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    date_to: str | None = Field(None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    include_keyword: bool = True
    include_vector: bool = True
    include_claim_search: bool = False
    weights: dict[str, float] | None = None


class PriorArtBody(BaseModel):
    patent_id: str | None = None
    patent_number: str | None = None
    # Or supply inline text directly
    title: str | None = None
    abstract: str | None = None
    claims: list[dict] | None = None
    filing_date: str | None = Field(None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    cpc_codes: list[str] | None = None
    limit: int = Field(20, ge=1, le=100)
    enrich_top_n: int = Field(5, ge=0, le=20)


class SimilarPatentsBody(BaseModel):
    patent_id: str
    limit: int = Field(10, ge=1, le=50)
    min_score: float = Field(0.0, ge=0.0, le=1.0)


class EmbedBody(BaseModel):
    text: str = Field(..., max_length=8000, description="Text to embed")


class IngestPatentBody(BaseModel):
    id: str | None = None
    patent_number: str
    title: str
    abstract: str | None = None
    claims: list[dict] | None = None
    assignee: str | None = None
    filing_date: str | None = None
    publication_date: str | None = None
    source: str | None = None
    cpc_classifications: list[dict] | None = None
    citation_count: int = 0


class BatchIngestBody(BaseModel):
    patents: list[IngestPatentBody]
    concurrency: int = Field(4, ge=1, le=16)


# ─── Routes ───────────────────────────────────────────────────────────────────

@router.post("/search")
async def hybrid_search(
    body: HybridSearchBody,
    current_user: User = Depends(get_current_user),
    es: AsyncElasticsearch = Depends(get_elasticsearch_client),
):
    """
    Hybrid patent search combining Elasticsearch BM25 + Weaviate vector search.
    Results are re-ranked via Reciprocal Rank Fusion with four signals:
    semantic similarity, keyword relevance, citation impact, and novelty.
    """
    engine = get_search_engine(es_client=es)
    req = SearchRequest(
        query=body.query,
        limit=body.limit,
        assignee=body.assignee,
        source=body.source,
        cpc_codes=body.cpc_codes,
        date_from=body.date_from,
        date_to=body.date_to,
        include_keyword=body.include_keyword,
        include_vector=body.include_vector,
        include_claim_search=body.include_claim_search,
        weights=body.weights,
    )
    response = await engine.search(req)
    return response.to_dict()


@router.post("/prior-art")
async def prior_art_search(
    body: PriorArtBody,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    es: AsyncElasticsearch = Depends(get_elasticsearch_client),
):
    """
    Comprehensive prior-art discovery with four search strategies:
    abstract vector, claim-level vector, full-text vector, and keyword.
    Date-bounded to the source patent's filing date.
    """
    # Resolve patent data
    title = body.title or ""
    abstract = body.abstract or ""
    claims = body.claims or []
    filing_date = body.filing_date
    source_id = ""
    source_number = body.patent_number or ""

    if body.patent_id:
        patent_repo = PatentRepository(db)
        patent = await patent_repo.get(body.patent_id)
        if not patent:
            raise HTTPException(status_code=404, detail="Patent not found")
        title = title or (patent.title or "")
        abstract = abstract or (patent.abstract or "")
        claims = claims or (patent.claims if isinstance(patent.claims, list) else [])
        filing_date = filing_date or str(patent.filing_date or "")
        source_id = str(patent.id)
        source_number = patent.patent_number or source_number

    if not title and not abstract:
        raise HTTPException(
            status_code=422,
            detail="Provide either patent_id or title+abstract",
        )

    engine = get_prior_art_engine(es_client=es)
    response = await engine.search(
        source_patent_number=source_number,
        title=title,
        abstract=abstract,
        claims=claims,
        filing_date=filing_date or None,
        cpc_codes=body.cpc_codes,
        limit=body.limit,
        source_patent_id=source_id,
        enrich_top_n=body.enrich_top_n,
    )
    return response.to_dict()


@router.post("/similar")
async def similar_patents(
    body: SimilarPatentsBody,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    es: AsyncElasticsearch = Depends(get_elasticsearch_client),
):
    """
    Find patents semantically similar to a given patent (by DB id).
    Uses the full combined embedding (title + abstract + top claims).
    """
    patent_repo = PatentRepository(db)
    patent = await patent_repo.get(body.patent_id)
    if not patent:
        raise HTTPException(status_code=404, detail="Patent not found")

    title = patent.title or ""
    abstract = patent.abstract or ""
    claims_list = patent.claims or []
    top_claims = " ".join(
        (c.get("text", "") if isinstance(c, dict) else str(c))
        for c in (claims_list[:5] if isinstance(claims_list, list) else [])
    )
    full_text = f"{title}\n{abstract}\n{top_claims}".strip()

    provider = get_embedding_provider()
    vec = await provider.embed(full_text)

    from app.semantic.vector_store import vector_search, COLLECTION_FULL
    raw = await vector_search(
        collection_name=COLLECTION_FULL,
        vector=vec,
        limit=body.limit + 1,
    )

    results = []
    for r in raw:
        props = r.get("properties", {})
        pid = props.get("patent_id", "")
        if pid and pid == str(patent.id):
            continue
        score = float(r.get("score", 0.0))
        if score < body.min_score:
            continue
        results.append({
            "patent_id": pid,
            "patent_number": props.get("patent_number", ""),
            "title": props.get("title", ""),
            "abstract": props.get("abstract", ""),
            "assignee": props.get("assignee", ""),
            "publication_date": props.get("publication_date", ""),
            "source": props.get("source", ""),
            "semantic_score": round(score, 4),
        })

    return {
        "source_patent_id": str(patent.id),
        "source_patent_number": patent.patent_number or "",
        "results": results[: body.limit],
        "total": len(results),
    }


@router.post("/embed")
async def generate_embedding(
    body: EmbedBody,
    current_user: User = Depends(get_current_user),
):
    """Generate and return the embedding vector for a text snippet."""
    provider = get_embedding_provider()
    vec = await provider.embed(body.text)
    return {
        "text": body.text[:100] + ("..." if len(body.text) > 100 else ""),
        "vector_length": len(vec),
        "backend": provider.backend,
        "model": provider._model_name,
        "sample": vec[:8],  # first 8 dims as preview
    }


@router.post("/ingest")
async def ingest_patent(
    body: IngestPatentBody,
    current_user: User = Depends(get_current_user),
):
    """Ingest a single patent into the vector store (all three collections)."""
    pipeline = get_pipeline()
    if not pipeline._ready:
        await pipeline.setup()

    result = await pipeline.ingest_one(body.model_dump())
    if not result.success and result.error:
        raise HTTPException(status_code=500, detail=result.error)
    return result.to_dict()


@router.post("/ingest/batch")
async def ingest_batch(
    body: BatchIngestBody,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
):
    """
    Batch ingest up to 500 patents into the vector store.
    Large batches run in the background; a report URL is returned.
    """
    if len(body.patents) > 500:
        raise HTTPException(status_code=422, detail="Maximum 500 patents per batch")

    pipeline = get_pipeline()
    if not pipeline._ready:
        await pipeline.setup()

    patents = [p.model_dump() for p in body.patents]

    if len(patents) <= 20:
        # Small batch — run synchronously
        report = await pipeline.ingest_batch(patents, concurrency=body.concurrency)
        return report.to_dict()

    # Large batch — run in background
    async def _bg_ingest() -> None:
        await pipeline.ingest_batch(patents, concurrency=body.concurrency)
        logger.info(f"Background batch ingestion complete for {len(patents)} patents")

    background_tasks.add_task(_bg_ingest)
    return {
        "message": f"Batch ingestion of {len(patents)} patents started in background",
        "status": "accepted",
    }


@router.post("/reindex")
async def reindex_all(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Re-index all patents from the database into the vector store.
    Admin only. Runs synchronously for up to 1000 patents; otherwise async.
    """
    if current_user.role not in (UserRole.admin,):
        raise HTTPException(status_code=403, detail="Admin role required")

    pipeline = get_pipeline()
    if not pipeline._ready:
        await pipeline.setup()

    report = await pipeline.reindex_all(db_session=db, batch_size=50)
    return report.to_dict()


@router.delete("/patents/{patent_id}")
async def remove_from_vector_store(
    patent_id: str,
    current_user: User = Depends(get_current_user),
):
    """Remove all vector representations of a patent."""
    ok = await delete_patent(patent_id)
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to remove patent from vector store")
    return {"patent_id": patent_id, "removed": True}


@router.get("/health")
async def semantic_health():
    """Check embedding backend and Weaviate connectivity."""
    from app.ai.client import get_weaviate_client
    provider = get_embedding_provider()
    weaviate = get_weaviate_client()
    weaviate_ok = weaviate is not None and weaviate.is_ready()

    return {
        "embedding_backend": provider.backend,
        "embedding_model": provider._model_name,
        "embedding_dimension": provider.dimension,
        "weaviate_connected": weaviate_ok,
        "openai_configured": bool(__import__("app.config", fromlist=["settings"]).settings.OPENAI_API_KEY),
    }


@router.get("/stats")
async def semantic_stats(
    current_user: User = Depends(get_current_user),
):
    """Return object counts per Weaviate collection."""
    stats = await collection_stats()
    return {"collections": stats}
