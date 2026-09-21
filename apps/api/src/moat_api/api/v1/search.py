from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field

from moat_api.services.ip.uspto import uspto_service

router = APIRouter(prefix="/search", tags=["search-engine"])


class PatentSearchRequest(BaseModel):
    query: str = Field(..., min_length=1, description="Keywords or conceptual description")
    cpc_prefix: str | None = Field(default=None, description="CPC prefix e.g. G06N, H04L")
    applicant: str | None = Field(default=None, description="Filter by company / assignee")
    jurisdictions_include: list[str] | None = Field(default=None, description="Included country codes e.g. ['US', 'EP']")
    jurisdictions_exclude: list[str] | None = Field(default=None, description="Excluded country codes e.g. ['CN']")
    published_from: str | None = Field(default=None, description="Publication date start YYYY-MM-DD")
    published_to: str | None = Field(default=None, description="Publication date end YYYY-MM-DD")
    publication_kind: str | None = Field(default="ALL", description="'ALL', 'GRANTED', 'APPLICATIONS'")
    limit: int = Field(default=25, ge=1, le=100, description="Max results")


@router.post("/patents")
async def search_patents(req: PatentSearchRequest) -> dict[str, Any]:
    """Execute BigQuery-weighted multi-jurisdictional patent retrieval with country include/exclude filters."""
    hits = await uspto_service.search_patents(
        query_text=req.query,
        cpc_prefix=req.cpc_prefix,
        applicant=req.applicant,
        jurisdictions_include=req.jurisdictions_include,
        jurisdictions_exclude=req.jurisdictions_exclude,
        published_from=req.published_from,
        published_to=req.published_to,
        publication_kind=req.publication_kind,
        limit=req.limit,
    )
    return {
        "query": req.query,
        "cpc_prefix": req.cpc_prefix,
        "jurisdictions_included": req.jurisdictions_include,
        "jurisdictions_excluded": req.jurisdictions_exclude,
        "total_hits": len(hits),
        "scoring_algorithm": "BigQuery-Weighted (3x Title + 2x Abstract + 1x Claims + CPC Boost)",
        "results": hits,
    }


@router.get("/patents/{publication_id}")
async def get_patent_detail(publication_id: str) -> dict[str, Any]:
    """Retrieve complete full patent specification, claims tree, and legal status."""
    patent = await uspto_service.get_patent_by_id(publication_id)
    if not patent:
        return {"error": "Patent not found", "publication_id": publication_id}
    return patent


@router.get("/expand-keywords")
async def expand_keywords(q: str = Query(..., min_length=1, description="Keywords to expand with patent synonyms and CPC")) -> dict[str, Any]:
    """Generate technical synonyms, IPC/CPC suggestions, truncation patterns, and Boolean queries."""
    return uspto_service.expand_keywords(q)




@router.get("/trademarks")
async def search_trademarks(
    q: str = Query(..., min_length=1, description="Trademark name or mark query"),
) -> dict[str, Any]:
    results = await uspto_service.search_trademarks(q)
    return {"query": q, "total_hits": len(results), "results": results}


@router.get("/copyrights")
async def search_copyrights(
    q: str = Query(..., min_length=1, description="Work title or author"),
) -> dict[str, Any]:
    results = await uspto_service.search_copyrights(q)
    return {"query": q, "total_hits": len(results), "results": results}
