from pydantic import BaseModel
from typing import Optional


class SummarizationRequest(BaseModel):
    patent_id: str
    max_length: Optional[int] = 500


class SummarizationResponse(BaseModel):
    patent_id: str
    patent_number: str
    title: str
    summary: str
    key_innovations: list[str]
    technical_domain: str


class SimilarityRequest(BaseModel):
    patent_id: str
    compare_to: Optional[list[str]] = None
    limit: Optional[int] = 10
    min_score: Optional[float] = 0.0


class SimilarityResult(BaseModel):
    patent_id: str
    patent_number: str
    title: str
    similarity_score: float
    semantic_overlap: str


class SimilarityResponse(BaseModel):
    source_patent_id: str
    source_patent_number: str
    results: list[SimilarityResult]


class FeatureExtractionRequest(BaseModel):
    patent_id: str


class ExtractedFeature(BaseModel):
    feature: str
    category: str
    relevance: float
    description: str


class FeatureExtractionResponse(BaseModel):
    patent_id: str
    patent_number: str
    title: str
    features: list[ExtractedFeature]
    technology_domain: str
    innovation_level: str


class SemanticSearchRequest(BaseModel):
    query: str
    limit: Optional[int] = 20
    filters: Optional[dict] = None


class SemanticSearchResult(BaseModel):
    patent_id: str
    patent_number: str
    title: str
    abstract: str
    score: float
    explanation: Optional[str] = None


class SemanticSearchResponse(BaseModel):
    query: str
    results: list[SemanticSearchResult]
    total: int


class PriorArtRequest(BaseModel):
    patent_id: str
    limit: Optional[int] = 20
    min_year: Optional[int] = None
    max_year: Optional[int] = None


class PriorArtResult(BaseModel):
    patent_id: str
    patent_number: str
    title: str
    abstract: str
    filing_date: str
    similarity_score: float
    relevance_reason: str
    key_overlaps: list[str]


class PriorArtResponse(BaseModel):
    source_patent_id: str
    source_patent_number: str
    source_title: str
    results: list[PriorArtResult]
    total_found: int


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    patent_id: str
    messages: list[ChatMessage]


class ChatResponse(BaseModel):
    response: str


class InsightsRequest(BaseModel):
    patent_ids: list[str]
    context: str | None = None


class InsightPoint(BaseModel):
    title: str
    detail: str
    type: str  # "opportunity", "risk", "trend"


class InsightsResponse(BaseModel):
    headline: str
    points: list[InsightPoint]
    generated_at: str
