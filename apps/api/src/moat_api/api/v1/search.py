from __future__ import annotations

from typing import Any, Literal
from pydantic import BaseModel, Field
from fastapi import APIRouter, Query, HTTPException

from moat_api.services.ip.uspto import uspto_service

router = APIRouter(prefix="/search", tags=["search-engine"])

# In-memory storage for analyst patent annotations and notes
_patent_annotations: dict[str, dict[str, Any]] = {}


class PatentSearchRequest(BaseModel):
    query: str = Field(..., min_length=1, description="Keywords or conceptual description")
    search_scope: Literal["ALL", "TITLE", "ABSTRACT", "CLAIMS", "DESCRIPTION"] = Field(
        default="ALL", description="Target field scope for keyword evaluation"
    )
    date_type: Literal["PUBLICATION", "APPLICATION", "FILING", "PRIORITY"] = Field(
        default="PUBLICATION", description="Date criterion to filter by"
    )
    cpc_prefix: str | None = Field(default=None, description="CPC prefix e.g. G06N, H04L")
    application_number: str | None = Field(default=None, description="Filter by Application Number")
    publication_number: str | None = Field(default=None, description="Filter by Publication Number")
    applicant: str | None = Field(default=None, description="Filter by Assignee / Applicant")
    inventors: str | None = Field(default=None, description="Filter by Inventor name")
    legal_status: str | None = Field(default=None, description="Filter by Legal Status: ACTIVE, PENDING, ABANDONED, etc.")
    cited_by: str | None = Field(default=None, description="Filter by citing patent or cited reference")
    jurisdictions_include: list[str] | None = Field(default=None, description="Included country codes e.g. ['US', 'EP']")
    jurisdictions_exclude: list[str] | None = Field(default=None, description="Excluded country codes e.g. ['CN']")
    published_from: str | None = Field(default=None, description="Date start YYYY-MM-DD")
    published_to: str | None = Field(default=None, description="Date end YYYY-MM-DD")
    publication_kind: str | None = Field(default="ALL", description="'ALL', 'GRANTED', 'APPLICATIONS'")
    limit: int = Field(default=25, ge=1, le=100, description="Max results")


class PatentAnnotationRequest(BaseModel):
    notes: str = Field(default="", description="Technical analysis notes")
    tags: list[str] = Field(default_factory=list, description="Custom tags")
    claim_ratings: dict[str, str] = Field(default_factory=dict, description="Claim index to rating mapping")
    status: str = Field(default="REVIEWED", description="Analyst review status")


@router.post("/patents")
async def search_patents(req: PatentSearchRequest) -> dict[str, Any]:
    """Execute BigQuery-weighted multi-jurisdictional patent retrieval with field-specific filters."""
    hits = await uspto_service.search_patents(
        query_text=req.query,
        search_scope=req.search_scope,
        date_type=req.date_type,
        cpc_prefix=req.cpc_prefix,
        application_number=req.application_number,
        publication_number=req.publication_number,
        applicant=req.applicant,
        inventors=req.inventors,
        legal_status=req.legal_status,
        cited_by=req.cited_by,
        jurisdictions_include=req.jurisdictions_include,
        jurisdictions_exclude=req.jurisdictions_exclude,
        published_from=req.published_from,
        published_to=req.published_to,
        publication_kind=req.publication_kind,
        limit=req.limit,
    )
    return {
        "query": req.query,
        "search_scope": req.search_scope,
        "date_type": req.date_type,
        "cpc_prefix": req.cpc_prefix,
        "jurisdictions_included": req.jurisdictions_include,
        "jurisdictions_excluded": req.jurisdictions_exclude,
        "total_hits": len(hits),
        "scoring_algorithm": f"BigQuery-Weighted (Scope: {req.search_scope}, DateType: {req.date_type})",
        "results": hits,
    }


@router.get("/patents/{publication_id}")
async def get_patent_detail(publication_id: str) -> dict[str, Any]:
    """Retrieve complete full patent specification, claims tree, and legal status."""
    patent = await uspto_service.get_patent_by_id(publication_id)
    if not patent:
        raise HTTPException(status_code=404, detail=f"Patent not found: {publication_id}")
    
    # Attach any saved annotations
    annotations = _patent_annotations.get(publication_id.upper())
    result = dict(patent)
    result["user_annotations"] = annotations
    return result


@router.post("/patents/{publication_id}/annotations")
async def save_patent_annotations(publication_id: str, req: PatentAnnotationRequest) -> dict[str, Any]:
    """Save analyst annotations, notes, and claim reviews for a specific patent."""
    clean_id = publication_id.upper().strip()
    _patent_annotations[clean_id] = {
        "publication_id": clean_id,
        "notes": req.notes,
        "tags": req.tags,
        "claim_ratings": req.claim_ratings,
        "status": req.status,
    }
    return {
        "success": True,
        "publication_id": clean_id,
        "annotations": _patent_annotations[clean_id],
    }


@router.get("/patents/{publication_id}/annotations")
async def get_patent_annotations(publication_id: str) -> dict[str, Any]:
    """Get saved analyst annotations for a patent."""
    clean_id = publication_id.upper().strip()
    return _patent_annotations.get(clean_id, {
        "publication_id": clean_id,
        "notes": "",
        "tags": [],
        "claim_ratings": {},
        "status": "UNREVIEWED"
    })


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

