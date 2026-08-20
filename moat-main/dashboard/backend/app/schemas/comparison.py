from pydantic import BaseModel
from typing import Optional


class CompareRequest(BaseModel):
    patent_ids: list[str]


class ClaimPair(BaseModel):
    source_index: int
    source_claim: str
    target_index: int
    target_claim: str
    overlap_score: float
    overlap_type: str


class ClaimComparison(BaseModel):
    source_patent_id: str
    target_patent_id: str
    total_source_claims: int
    total_target_claims: int
    overlapping_claims: int
    claim_pairs: list[ClaimPair]


class FeatureMatrixRow(BaseModel):
    feature: str
    category: str
    source_present: bool
    source_relevance: Optional[float] = None
    target_present: bool
    target_relevance: Optional[float] = None
    overlap: float


class FeatureMatrix(BaseModel):
    source_patent_id: str
    target_patent_id: str
    rows: list[FeatureMatrixRow]
    total_features: int
    overlapping_features: int


class OverlapScore(BaseModel):
    category: str
    score: float
    description: str


class SideBySidePatent(BaseModel):
    id: str
    patent_number: str
    title: str
    abstract: str
    assignee: str
    inventors: list[str]
    filing_date: str
    publication_date: str
    status: str
    cpc_classifications: list[str]
    ipc_classifications: list[str]


class CompareResponse(BaseModel):
    patents: list[SideBySidePatent]
    claim_comparison: Optional[list[ClaimComparison]] = None
    feature_matrix: Optional[list[FeatureMatrix]] = None
    overlap_scores: Optional[list[OverlapScore]] = None
    overall_similarity: float
