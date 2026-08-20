"""
Prior Art Search API.

POST /api/v1/prior-art/search
  → Multi-strategy prior art search combining:
    1. Elasticsearch full-text (BM25 keyword)
    2. Weaviate semantic (vector similarity)
    3. CPC/IPC class filtering
    4. Date-bounded results (before filing date)

Results are ranked by relevance score and deduplicated.
"""
from __future__ import annotations

import time
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from elasticsearch import AsyncElasticsearch

from app.api.deps import get_db, get_current_user, get_elasticsearch_client
from app.models.user import User
from app.core.cache import cache, TTL_PRIOR_ART

router = APIRouter(prefix="/prior-art", tags=["prior-art"])


# ── Request / Response models ────────────────────────────

class PriorArtSearchRequest(BaseModel):
    query: str = Field(..., min_length=3, description="Technology description or claim text to find prior art for")
    filing_date: str | None = Field(None, description="Cutoff date (YYYY-MM-DD) — only return patents before this date")
    cpc_classes: list[str] = Field(default_factory=list, description="Filter by CPC classification symbols")
    ipc_classes: list[str] = Field(default_factory=list, description="Filter by IPC classification symbols")
    assignees: list[str] = Field(default_factory=list, description="Exclude assignees (e.g., your own company)")
    limit: int = Field(20, ge=1, le=100)
    include_semantic: bool = Field(True, description="Include vector-based semantic search results")
    sources: list[str] = Field(
        default_factory=lambda: ["uspto", "epo", "wipo", "lens"],
        description="Restrict to specific patent sources",
    )


class PriorArtHit(BaseModel):
    patent_id: str | None = None
    patent_number: str
    title: str
    abstract: str | None = None
    assignee: str | None = None
    filing_date: str | None = None
    publication_date: str | None = None
    cpc_symbols: list[str] = []
    source: str | None = None
    score: float
    search_strategy: str   # "keyword", "semantic", "classification"
    source_url: str | None = None


class PriorArtSearchResponse(BaseModel):
    query: str
    total: int
    hits: list[PriorArtHit]
    took_ms: float
    strategies_used: list[str]
    cached: bool = False


# ── Router ─────────────────────────────────────────────

@router.post("/search", response_model=PriorArtSearchResponse)
async def prior_art_search(
    request: PriorArtSearchRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    es: AsyncElasticsearch = Depends(get_elasticsearch_client),
) -> PriorArtSearchResponse:
    """
    Comprehensive prior art search across all indexed patents.

    Combines keyword BM25 search (Elasticsearch) with optional
    semantic vector search (Weaviate) for maximum recall.
    Results are deduplicated and ranked by composite relevance score.
    """
    start = time.perf_counter()

    # ── Cache check ──────────────────────────────────────
    cache_key = cache.prior_art_key(
        f"{request.query}:{request.filing_date}:{','.join(request.cpc_classes)}",
        request.limit,
    )
    cached = await cache.get(cache_key)
    if cached:
        return PriorArtSearchResponse(**{**cached, "cached": True})

    strategies_used: list[str] = []
    all_hits: dict[str, PriorArtHit] = {}  # patent_number → hit (dedup)

    # ── Strategy 1: Elasticsearch keyword search ─────────
    try:
        es_hits = await _es_prior_art_search(es, request)
        for hit in es_hits:
            all_hits[hit.patent_number] = hit
        if es_hits:
            strategies_used.append("keyword")
    except Exception as e:
        pass  # ES unavailable — continue with other strategies

    # ── Strategy 2: Weaviate semantic search ─────────────
    if request.include_semantic:
        try:
            semantic_hits = await _semantic_prior_art_search(request)
            for hit in semantic_hits:
                if hit.patent_number not in all_hits:
                    all_hits[hit.patent_number] = hit
                else:
                    # Boost score if found in both strategies
                    all_hits[hit.patent_number].score = (
                        all_hits[hit.patent_number].score * 0.6 + hit.score * 0.4
                    )
                    all_hits[hit.patent_number].search_strategy = "keyword+semantic"
            if semantic_hits:
                strategies_used.append("semantic")
        except Exception:
            pass

    # ── Strategy 3: CPC/IPC class-based search ───────────
    if request.cpc_classes or request.ipc_classes:
        try:
            class_hits = await _classification_prior_art_search(es, request)
            for hit in class_hits:
                if hit.patent_number not in all_hits:
                    all_hits[hit.patent_number] = hit
            if class_hits:
                strategies_used.append("classification")
        except Exception:
            pass

    # ── Sort by score, apply limit ────────────────────────
    sorted_hits = sorted(all_hits.values(), key=lambda h: h.score, reverse=True)[:request.limit]
    took_ms = (time.perf_counter() - start) * 1000

    result = PriorArtSearchResponse(
        query=request.query,
        total=len(sorted_hits),
        hits=sorted_hits,
        took_ms=took_ms,
        strategies_used=strategies_used,
        cached=False,
    )

    # Cache result
    await cache.set(cache_key, result.model_dump(), ttl=TTL_PRIOR_ART)

    return result


# ── Sub-search functions ─────────────────────────────────

async def _es_prior_art_search(es: Any, req: PriorArtSearchRequest) -> list[PriorArtHit]:
    must: list[dict] = [
        {
            "multi_match": {
                "query": req.query,
                "fields": ["title^3", "abstract^2", "claims", "full_text"],
                "type": "best_fields",
                "fuzziness": "AUTO",
            }
        }
    ]
    filters: list[dict] = []

    # Date filter (only before filing_date for prior art)
    if req.filing_date:
        filters.append({"range": {"publication_date": {"lte": req.filing_date}}})

    # Source filter
    if req.sources:
        filters.append({"terms": {"source": req.sources}})

    # CPC filter
    for cpc in req.cpc_classes:
        filters.append({
            "nested": {
                "path": "cpc_classifications",
                "query": {"prefix": {"cpc_classifications.symbol": cpc}},
            }
        })

    body: dict = {
        "query": {"bool": {"must": must, "filter": filters}},
        "size": 50,
        "_source": [
            "id", "patent_number", "title", "abstract", "assignee",
            "filing_date", "publication_date", "cpc_classifications",
            "source", "source_url",
        ],
    }

    resp = await es.search(index="patents", body=body)
    hits: list[PriorArtHit] = []
    for h in resp["hits"]["hits"]:
        src = h["_source"]
        cpc_syms = [c.get("symbol", "") for c in (src.get("cpc_classifications") or [])]
        hits.append(PriorArtHit(
            patent_id=h["_id"],
            patent_number=src.get("patent_number") or h["_id"],
            title=src.get("title") or "",
            abstract=src.get("abstract"),
            assignee=src.get("assignee"),
            filing_date=src.get("filing_date"),
            publication_date=src.get("publication_date"),
            cpc_symbols=cpc_syms,
            source=src.get("source"),
            score=h["_score"] or 0.0,
            search_strategy="keyword",
            source_url=src.get("source_url"),
        ))
    return hits


async def _semantic_prior_art_search(req: PriorArtSearchRequest) -> list[PriorArtHit]:
    """Query Weaviate for semantically similar patents."""
    from app.ai.client import get_weaviate_client
    weaviate = get_weaviate_client()
    if not weaviate or not weaviate.is_ready():
        return []

    try:
        collection = weaviate.collections.get("Patent")
        response = collection.query.near_text(
            query=req.query,
            limit=30,
            return_properties=["patent_number", "title", "abstract", "assignee",
                               "filing_date", "publication_date", "source"],
            return_metadata=["distance"],
        )

        hits: list[PriorArtHit] = []
        for obj in response.objects:
            props = obj.properties
            # Filter by date if specified
            pub_date = props.get("publication_date") or ""
            if req.filing_date and pub_date and pub_date > req.filing_date:
                continue
            distance = obj.metadata.distance if obj.metadata else 1.0
            score = max(0.0, 1.0 - float(distance or 1.0))
            hits.append(PriorArtHit(
                patent_number=props.get("patent_number") or str(obj.uuid),
                title=props.get("title") or "",
                abstract=props.get("abstract"),
                assignee=props.get("assignee"),
                filing_date=props.get("filing_date"),
                publication_date=pub_date or None,
                source=props.get("source"),
                score=score,
                search_strategy="semantic",
            ))
        return hits
    except Exception:
        return []


async def _classification_prior_art_search(es: Any, req: PriorArtSearchRequest) -> list[PriorArtHit]:
    """Find patents sharing CPC/IPC classification codes."""
    filters: list[dict] = []

    if req.cpc_classes:
        cpc_queries = [
            {"nested": {"path": "cpc_classifications",
                        "query": {"prefix": {"cpc_classifications.symbol": cpc}}}}
            for cpc in req.cpc_classes
        ]
        filters.append({"bool": {"should": cpc_queries, "minimum_should_match": 1}})

    if req.ipc_classes:
        ipc_queries = [
            {"nested": {"path": "ipc_classifications",
                        "query": {"prefix": {"ipc_classifications.symbol": ipc}}}}
            for ipc in req.ipc_classes
        ]
        filters.append({"bool": {"should": ipc_queries, "minimum_should_match": 1}})

    if req.filing_date:
        filters.append({"range": {"publication_date": {"lte": req.filing_date}}})

    if not filters:
        return []

    body = {
        "query": {"bool": {"filter": filters}},
        "size": 30,
        "_source": ["id", "patent_number", "title", "abstract", "assignee",
                    "filing_date", "publication_date", "cpc_classifications", "source"],
    }
    resp = await es.search(index="patents", body=body)
    hits: list[PriorArtHit] = []
    for h in resp["hits"]["hits"]:
        src = h["_source"]
        cpc_syms = [c.get("symbol", "") for c in (src.get("cpc_classifications") or [])]
        hits.append(PriorArtHit(
            patent_id=h["_id"],
            patent_number=src.get("patent_number") or h["_id"],
            title=src.get("title") or "",
            abstract=src.get("abstract"),
            assignee=src.get("assignee"),
            filing_date=src.get("filing_date"),
            publication_date=src.get("publication_date"),
            cpc_symbols=cpc_syms,
            source=src.get("source"),
            score=0.5,  # Classification matches get base score
            search_strategy="classification",
        ))
    return hits
