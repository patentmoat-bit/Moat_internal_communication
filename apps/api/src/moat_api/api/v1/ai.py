from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Body, Query
from pydantic import BaseModel, Field

from moat_api.services.ai.perplexity import perplexity_service

router = APIRouter(prefix="/ai", tags=["ai-intelligence"])


class NoveltyAssessmentRequest(BaseModel):
    title: str = Field(..., min_length=3, description="Invention title")
    abstract: str = Field(..., min_length=10, description="Technical abstract / summary")
    technical_field: str = Field(default="Computer Science & AI", description="Domain / classification")
    novel_features: str = Field(..., description="Key claimed inventive elements")
    jurisdiction: str = Field(default="US", description="Target patent office")
    jurisdictions_include: list[str] | None = Field(default=None, description="Included country codes")
    jurisdictions_exclude: list[str] | None = Field(default=None, description="Excluded country codes")
    bigquery_candidates: list[dict[str, Any]] | None = Field(default=None, description="BigQuery candidate patents")


class ClaimComparisonRequest(BaseModel):
    invention_claims: list[str] = Field(..., min_length=1, description="List of subject invention claims")
    reference_claim_text: str = Field(..., description="Claim text from prior-art target patent")
    reference_patent_id: str = Field(default="US10892341B2", description="Patent publication ID")


class DraftingAssistRequest(BaseModel):
    section_name: str = Field(default="DETAILED_DESCRIPTION", description="Section to draft")
    title: str = Field(..., description="Invention title")
    technical_field: str = Field(..., description="Technical field")
    summary: str = Field(..., description="Problem and solution overview")
    existing_claims: list[str] = Field(default_factory=list, description="Existing claim clauses")


@router.post("/novelty-assessment")
async def assess_novelty(req: NoveltyAssessmentRequest) -> dict[str, Any]:
    """Run live prior-art search, novelty scoring (0-100), and patentability assessment using Perplexity Pro."""
    return await perplexity_service.assess_novelty_and_prior_art(
        title=req.title,
        abstract=req.abstract,
        technical_field=req.technical_field,
        novel_features=req.novel_features,
        jurisdiction=req.jurisdiction,
        jurisdictions_include=req.jurisdictions_include,
        jurisdictions_exclude=req.jurisdictions_exclude,
        bigquery_candidates=req.bigquery_candidates,
    )


@router.post("/claim-mapping")
async def compare_claims_matrix(req: ClaimComparisonRequest) -> dict[str, Any]:
    """Generate side-by-side element-by-element claim comparison chart against prior art."""
    return await perplexity_service.compare_claims(
        invention_claims=req.invention_claims,
        reference_claim_text=req.reference_claim_text,
        reference_patent_id=req.reference_patent_id,
    )


@router.post("/draft-assist")
async def assist_drafting(req: DraftingAssistRequest) -> dict[str, Any]:
    """Generate or refine USPTO MPEP-compliant patent drafting specification sections."""
    return await perplexity_service.assist_patent_drafting(
        section_name=req.section_name,
        title=req.title,
        technical_field=req.technical_field,
        summary=req.summary,
        existing_claims=req.existing_claims,
    )


@router.get("/strategic-intelligence")
async def get_strategic_intelligence(
    topic: str = Query(default="Artificial Intelligence & Patent Engineering", description="Search domain"),
    competitors: str = Query(default="Google LLC,Apple Inc,Microsoft Corp", description="Comma-separated competitors"),
) -> dict[str, Any]:
    """Fetch live competitor filings, patent news, and regulatory developments."""
    competitor_list = [c.strip() for c in competitors.split(",") if c.strip()]
    return await perplexity_service.fetch_strategic_intelligence(topic=topic, competitors=competitor_list)
