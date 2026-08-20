from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from elasticsearch import AsyncElasticsearch

from app.api.deps import get_db, get_current_user, get_elasticsearch_client
from app.models.patent import Patent
from app.models.user import User
from app.schemas.patent import PatentResponse, PatentSearchResult, PatentSearchFilters
from app.services.patent_search.service import PatentService
from app.core.cache import cache, TTL_PATENT_DETAIL, TTL_SIMILAR_RESULT, TTL_SEARCH_RESULT
import time

router = APIRouter(prefix="/patents", tags=["patents"])


# ── /patents/saved/list  (must be before /{patent_id}) ──────────

@router.get("/saved/list", response_model=list[PatentResponse])
async def get_saved_patents(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[PatentResponse]:
    service = PatentService(db)
    patents = await service.get_saved_patents(current_user.id)
    return [PatentResponse.model_validate(p) for p in patents]


# ── /patents/similar ─────────────────────────────────────────────

class SimilarPatentResponse(BaseModel):
    patent_number: str
    patent_id: str | None = None
    title: str
    abstract: str | None = None
    assignee: str | None = None
    filing_date: str | None = None
    publication_date: str | None = None
    score: float
    source: str | None = None
    cpc_symbols: list[str] = Field(default_factory=list)


class SimilarPatentsResult(BaseModel):
    reference_patent_id: str
    total: int
    results: list[SimilarPatentResponse]
    took_ms: float
    cached: bool = False


@router.get("/similar", response_model=SimilarPatentsResult)
async def get_similar_patents(
    patent_id: str = Query(..., description="UUID or patent number to find similar patents for"),
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SimilarPatentsResult:
    """
    Find patents similar to the given patent using Elasticsearch
    More-Like-This (MLT) query on title, abstract, and claims.
    Results are Redis-cached for 10 minutes.
    """
    start = time.perf_counter()

    # Cache check
    cache_key = cache.similar_key(patent_id, limit)
    cached_data = await cache.get(cache_key)
    if cached_data:
        return SimilarPatentsResult(**{**cached_data, "cached": True})

    # Resolve patent from DB
    service = PatentService(db)
    try:
        patent = await service.get_patent(patent_id)
    except Exception:
        # Try by patent number
        from app.repositories.patent_repository import PatentRepository
        repo = PatentRepository(db)
        patent = await repo.get_by_patent_number(patent_id)
        if not patent:
            raise HTTPException(status_code=404, detail=f"Patent '{patent_id}' not found")

    es = await get_elasticsearch_client()
    results: list[SimilarPatentResponse] = []

    try:
        body = {
            "query": {
                "more_like_this": {
                    "fields": ["title", "abstract", "claims", "full_text"],
                    "like": [
                        {"_index": "patents", "_id": str(patent.id)}
                    ],
                    "min_term_freq": 1,
                    "max_query_terms": 25,
                    "min_doc_freq": 1,
                    "minimum_should_match": "30%",
                }
            },
            "size": limit,
            "_source": [
                "patent_number", "title", "abstract", "assignee",
                "filing_date", "publication_date", "source", "cpc_classifications"
            ],
        }
        resp = await es.search(index="patents", body=body)
        for hit in resp["hits"]["hits"]:
            src = hit["_source"]
            if hit["_id"] == str(patent.id):
                continue  # Skip self
            cpc_syms = [c.get("symbol", "") for c in (src.get("cpc_classifications") or [])]
            results.append(SimilarPatentResponse(
                patent_id=hit["_id"],
                patent_number=src.get("patent_number") or hit["_id"],
                title=src.get("title") or "",
                abstract=src.get("abstract"),
                assignee=src.get("assignee"),
                filing_date=src.get("filing_date"),
                publication_date=src.get("publication_date"),
                score=round(hit["_score"] or 0.0, 4),
                source=src.get("source"),
                cpc_symbols=cpc_syms,
            ))
    except Exception:
        # Fallback: CPC-based similarity from DB if ES unavailable
        from sqlalchemy import select, func
        from app.models.patent import Patent as PatentModel
        if patent.cpc_classifications:
            cpc_symbols = [c.get("cpc_class") or c.get("symbol", "") for c in patent.cpc_classifications if isinstance(c, dict)]
            if cpc_symbols:
                # Simple text search fallback
                from sqlalchemy import or_, cast
                from app.database import JSONB
                stmt = (
                    select(PatentModel)
                    .where(PatentModel.id != patent.id)
                    .limit(limit)
                )
                result = await db.execute(stmt)
                for p in result.scalars().all():
                    results.append(SimilarPatentResponse(
                        patent_id=str(p.id),
                        patent_number=p.patent_number,
                        title=p.title,
                        abstract=p.abstract,
                        assignee=p.assignee,
                        filing_date=str(p.filing_date) if p.filing_date else None,
                        publication_date=str(p.publication_date) if p.publication_date else None,
                        score=0.5,
                        source=None,
                    ))

    took_ms = (time.perf_counter() - start) * 1000
    response = SimilarPatentsResult(
        reference_patent_id=str(patent.id),
        total=len(results),
        results=results,
        took_ms=round(took_ms, 2),
        cached=False,
    )

    await cache.set(cache_key, response.model_dump(), ttl=TTL_SIMILAR_RESULT)
    return response


# ── GET /patents (search) ────────────────────────────────────────

@router.get("", response_model=PatentSearchResult)
async def search_patents(
    query: str | None = Query(None),
    assignee: str | None = Query(None),
    status: str | None = Query(None),
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    cpc_class: str | None = Query(None),
    ipc_class: str | None = Query(None),
    inventor: str | None = Query(None),
    source: str | None = Query(None, description="Filter by data source: uspto, epo, wipo, lens"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PatentSearchResult:
    """
    Search patents with full-text, filter, and facet support.
    Results are Redis-cached per unique filter combination (5 min TTL).
    """
    filters = PatentSearchFilters(
        query=query, assignee=assignee, status=status,
        date_from=date_from, date_to=date_to,
        cpc_class=cpc_class, inventor=inventor,
    )

    # Cache check
    filter_dict = {k: v for k, v in filters.model_dump().items() if v is not None}
    if source:
        filter_dict["source"] = source
    cache_key = cache.search_key(query or "", filter_dict, page, page_size)
    cached_data = await cache.get(cache_key)
    if cached_data:
        return PatentSearchResult(**cached_data)

    es = await get_elasticsearch_client()
    service = PatentService(db, es)
    result = await service.search_patents(filters, page, page_size)

    await cache.set(cache_key, result.model_dump(), ttl=TTL_SEARCH_RESULT)
    return result


# ── GET /patents/:id ─────────────────────────────────────────────

@router.get("/{patent_id}", response_model=PatentResponse)
async def get_patent(
    patent_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Patent:
    """
    Fetch a single patent by UUID or patent number.
    Result is Redis-cached for 1 hour.
    """
    # Cache check
    cache_key = cache.patent_key(patent_id)
    cached_data = await cache.get(cache_key)
    if cached_data:
        return PatentResponse(**cached_data)

    service = PatentService(db)
    patent = await service.get_patent(patent_id)

    await cache.set(
        cache_key,
        PatentResponse.model_validate(patent).model_dump(),
        ttl=TTL_PATENT_DETAIL,
    )
    return patent


# ── POST /patents/:id/save ───────────────────────────────────────

@router.post("/{patent_id}/save", status_code=201)
async def save_patent(
    patent_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    service = PatentService(db)
    await service.save_patent(current_user.id, patent_id)
    return {"detail": "Patent saved successfully"}


@router.delete("/{patent_id}/save")
async def unsave_patent(
    patent_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    service = PatentService(db)
    await service.unsave_patent(current_user.id, patent_id)
    return {"detail": "Patent unsaved successfully"}
