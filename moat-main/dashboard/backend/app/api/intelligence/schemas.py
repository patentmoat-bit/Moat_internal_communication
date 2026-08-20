from pydantic import BaseModel
from typing import Optional, List

class NoveltyRequest(BaseModel):
    invention_id: str
    target_claims: Optional[List[str]] = None
    description: Optional[str] = None

class ClaimOverlap(BaseModel):
    element: str
    found_in_prior_art: bool
    confidence_score: float
    prior_art_reference: Optional[str] = None
    snippet: Optional[str] = None

class NoveltyResponse(BaseModel):
    invention_id: str
    novelty_score: float
    similarity_score: float
    risk_level: str  # "Low", "Medium", "High"
    white_space_opportunities: List[str]
    claim_overlaps: List[ClaimOverlap]
    closest_prior_art_ids: List[str]

class PatentabilityRequest(BaseModel):
    invention_id: str
    include_commercial_value: bool = True

class PatentabilityResponse(BaseModel):
    invention_id: str
    patentability_score: float
    novelty_assessment: str
    utility_assessment: str
    non_obviousness_assessment: str
    defensibility_score: float
    commercial_value_score: float
    filing_recommendation: str
    overall_risk: str
