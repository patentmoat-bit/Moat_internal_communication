from datetime import datetime
from pydantic import BaseModel, Field


SearchMode = str


class RankingWeights(BaseModel):
    semantic: float = 0.35
    relevance: float = 0.35
    citation: float = 0.15
    novelty: float = 0.15


class SearchScores(BaseModel):
    semantic_score: float = 0.0
    citation_score: float = 0.0
    novelty_score: float = 0.0
    relevance_score: float = 0.0
    hybrid_score: float = 0.0


class RankedPatentResult(BaseModel):
    patent_id: str
    patent_number: str | None = None
    scores: SearchScores
    matched_fields: list[str] = []
    highlights: dict[str, list[str]] = {}
    explanation: str | None = None


class SearchSuggestionResponse(BaseModel):
    suggestions: list[str]
    expanded_terms: list[str] = []
    synonyms: dict[str, list[str]] = {}


class AdvancedSearchResult(BaseModel):
    patents: list[dict]
    total: int
    page: int
    page_size: int
    took_ms: float
    query: str | None = None
    expanded_query: str | None = None
    expanded_terms: list[str] = []
    search_modes: list[str] = []
    ranking: list[RankedPatentResult] = []
    suggestions: list[str] = []
    filters_applied: dict = {}
    facets: dict = {}
    analytics: dict = {}


class AdvancedSearchFilters(BaseModel):
    query: str | None = None
    boolean_query: str | None = None
    concept_query: str | None = None
    claim_query: str | None = None
    document_query: str | None = None
    image_query: str | None = None
    drawing_query: str | None = None
    technology: str | None = None
    assignee: str | None = None
    inventor: str | None = None
    status: str | None = None
    country: str | None = None
    date_from: str | None = None
    date_to: str | None = None
    pub_date_from: str | None = None
    pub_date_to: str | None = None
    cpc_class: str | None = None
    ipc_class: str | None = None
    patent_number: str | None = None
    patent_family: str | None = None
    citation: str | None = None
    source: str | None = None
    language: str | None = None
    search_modes: list[str] = Field(default_factory=lambda: ["keyword"])
    expand_query: bool = True
    include_synonyms: bool = True
    include_semantic: bool = True
    include_vectors: bool = True
    include_citations: bool = True
    include_family: bool = True
    ranking_weights: RankingWeights = Field(default_factory=RankingWeights)
    sort: str | None = Field(default=None, description="Sort field and direction, e.g. 'filing_date:desc'")


class SearchHistoryResponse(BaseModel):
    id: str
    query: str | None = None
    filters: dict | None = None
    result_count: int | None = None
    took_ms: float | None = None
    search_type: str | None = None
    created_at: datetime
    model_config = {"from_attributes": True}


class SearchHistoryListResponse(BaseModel):
    history: list[SearchHistoryResponse]
    total: int


class SavedSearchCreate(BaseModel):
    name: str
    query: str | None = None
    filters: dict | None = None
    notify_on_new: bool = False
    schedule: str | None = None


class SavedSearchUpdate(BaseModel):
    name: str | None = None
    query: str | None = None
    filters: dict | None = None
    notify_on_new: bool | None = None
    schedule: str | None = None


class SavedSearchResponse(BaseModel):
    id: str
    name: str
    query: str | None = None
    filters: dict | None = None
    notify_on_new: bool = False
    schedule: str | None = None
    last_run_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


class SearchAnalyticsResponse(BaseModel):
    total_searches: int
    unique_queries: int
    avg_results: float
    top_queries: list[dict] = []
    searches_by_day: list[dict] = []
    status_distribution: list[dict] = []
    source_distribution: list[dict] = []
    cpc_class_distribution: list[dict] = []
    mode_distribution: list[dict] = []
    avg_latency_ms: float = 0.0
    zero_result_rate: float = 0.0
    saved_search_count: int = 0
