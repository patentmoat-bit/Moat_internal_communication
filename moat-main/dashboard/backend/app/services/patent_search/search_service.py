import math
import re
import time
import logging
from typing import Any

from elasticsearch import AsyncElasticsearch
from sqlalchemy import String, cast, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.embeddings import search_semantic
from app.core.exceptions import NotFoundException
from app.models.patent import Patent
from app.models.search_history import SearchHistory
from app.models.saved_search import SavedSearch
from app.repositories.patent_repository import PatentRepository
from app.ingestion.indexers import ElasticsearchIndexer
from app.schemas.patent import PatentResponse, PatentSearchResult
from app.schemas.search import (
    AdvancedSearchFilters,
    AdvancedSearchResult,
    RankedPatentResult,
    SearchAnalyticsResponse,
    SearchHistoryListResponse,
    SearchHistoryResponse,
    SearchScores,
    SearchSuggestionResponse,
    SavedSearchCreate,
    SavedSearchResponse,
    SavedSearchUpdate,
)

logger = logging.getLogger(__name__)

SYNONYMS: dict[str, list[str]] = {
    "ai": ["artificial intelligence", "machine learning", "neural network", "model"],
    "ml": ["machine learning", "model", "classifier", "prediction"],
    "battery": ["cell", "electrode", "electrolyte", "separator", "charging"],
    "sensor": ["detector", "transducer", "measurement", "monitor"],
    "wearable": ["body-worn", "portable", "physiological monitor"],
    "drone": ["uav", "unmanned aerial vehicle", "autonomous aircraft"],
    "vehicle": ["automobile", "transport", "mobility", "autonomous vehicle"],
    "network": ["wireless", "communication", "protocol", "packet"],
    "image": ["vision", "camera", "figure", "drawing", "diagram"],
    "claim": ["limitation", "element", "wherein", "configured to"],
}

MODE_FIELDS: dict[str, list[str]] = {
    "keyword": ["title", "abstract", "patent_number", "assignee"],
    "boolean": ["title", "abstract", "claims", "patent_number", "assignee"],
    "concept": ["title", "abstract", "claims"],
    "claim": ["claims"],
    "inventor": ["inventors"],
    "assignee": ["assignee"],
    "technology": ["title", "abstract", "cpc_classifications", "ipc_classifications"],
    "family": ["patent_number", "citations"],
    "citation": ["citations"],
    "classification": ["cpc_classifications", "ipc_classifications"],
    "image": ["patent_metadata", "abstract"],
    "drawing": ["patent_metadata", "abstract"],
    "document": ["title", "abstract", "claims"],
    "multilanguage": ["title", "abstract", "claims"],
    "semantic": ["title", "abstract", "claims"],
    "hybrid": ["title", "abstract", "claims", "patent_number", "assignee"],
}


class SearchService:
    def __init__(self, db: AsyncSession, es_client: AsyncElasticsearch | None = None):
        self.db = db
        self.es_client = es_client
        self.patent_repo = PatentRepository(db)
        self.es_indexer = ElasticsearchIndexer(es_client) if es_client else None

    async def advanced_search(
        self, filters: AdvancedSearchFilters, page: int = 1, page_size: int = 20
    ) -> AdvancedSearchResult:
        start = time.perf_counter()
        filters = self._normalize_filters(filters)
        query = self._primary_query(filters)
        expanded_terms, synonym_map = self.expand_query(query, filters.include_synonyms)
        expanded_query = self._expanded_query(query, expanded_terms) if filters.expand_query else query

        patents: list[Patent] = []
        total = 0
        es_scores: dict[str, float] = {}

        if self.es_client and self.es_indexer:
            try:
                result = await self._search_es(filters, expanded_query, page, page_size)
                patents = result["patents"]
                total = result["total"]
                es_scores = result.get("scores", {})
            except Exception as e:
                logger.warning("ES advanced search failed, falling back to DB: %s", e)

        if not patents:
            patents, total = await self._search_db_advanced(filters, expanded_query, page, page_size)

        semantic_scores: dict[str, float] = {}
        if filters.include_semantic and ("semantic" in filters.search_modes or "hybrid" in filters.search_modes or "concept" in filters.search_modes):
            semantic_scores = await self._semantic_scores(expanded_query, filters)

        ranking = [self._rank_patent(p, filters, expanded_terms, es_scores, semantic_scores) for p in patents]
        ranking.sort(key=lambda item: item.scores.hybrid_score, reverse=True)
        patent_map = {p.id: p for p in patents}
        ranked_patents = [patent_map[item.patent_id] for item in ranking if item.patent_id in patent_map]

        took_ms = (time.perf_counter() - start) * 1000
        facets = self._facets(ranked_patents)
        suggestions = self._suggestions(query, expanded_terms, facets)

        return AdvancedSearchResult(
            patents=[self._serialize_patent(p) for p in ranked_patents],
            total=total,
            page=page,
            page_size=page_size,
            took_ms=took_ms,
            query=query,
            expanded_query=expanded_query,
            expanded_terms=expanded_terms,
            search_modes=filters.search_modes,
            ranking=ranking,
            suggestions=suggestions,
            filters_applied=filters.model_dump(exclude_none=True),
            facets=facets,
            analytics={
                "mode_count": len(filters.search_modes),
                "hybrid": "hybrid" in filters.search_modes,
                "semantic_enabled": filters.include_semantic,
                "vector_enabled": filters.include_vectors,
                "query_expanded": bool(expanded_terms),
                "synonym_count": sum(len(v) for v in synonym_map.values()),
            },
        )

    async def legacy_advanced_search(
        self, filters: AdvancedSearchFilters, page: int = 1, page_size: int = 20
    ) -> PatentSearchResult:
        result = await self.advanced_search(filters, page, page_size)
        return PatentSearchResult(
            patents=[PatentResponse.model_validate(item) for item in result.patents],
            total=result.total,
            page=result.page,
            page_size=result.page_size,
            took_ms=result.took_ms,
        )

    def _normalize_filters(self, filters: AdvancedSearchFilters) -> AdvancedSearchFilters:
        if not filters.search_modes:
            filters.search_modes = ["keyword"]
        normalized = []
        for mode in filters.search_modes:
            m = mode.lower().strip().replace("_", "-")
            aliases = {
                "vector": "semantic",
                "embedding": "semantic",
                "family": "family",
                "patent-family": "family",
                "classification": "classification",
                "multi-language": "multilanguage",
            }
            normalized.append(aliases.get(m, m))
        filters.search_modes = list(dict.fromkeys(normalized))
        return filters

    def _primary_query(self, filters: AdvancedSearchFilters) -> str:
        parts = [
            filters.query,
            filters.boolean_query,
            filters.concept_query,
            filters.claim_query,
            filters.document_query,
            filters.image_query,
            filters.drawing_query,
            filters.technology,
            filters.patent_number,
            filters.patent_family,
            filters.citation,
        ]
        return " ".join(part.strip() for part in parts if part and part.strip())

    def expand_query(self, query: str | None, include_synonyms: bool = True) -> tuple[list[str], dict[str, list[str]]]:
        if not query:
            return [], {}
        tokens = [t.lower() for t in re.findall(r"[a-zA-Z][a-zA-Z0-9-]{2,}", query)]
        expanded: list[str] = []
        synonym_map: dict[str, list[str]] = {}
        for token in tokens:
            if token in SYNONYMS and include_synonyms:
                synonym_map[token] = SYNONYMS[token]
                expanded.extend(SYNONYMS[token])
        return list(dict.fromkeys(expanded))[:24], synonym_map

    def _expanded_query(self, query: str | None, expanded_terms: list[str]) -> str | None:
        if not query:
            return " ".join(expanded_terms) if expanded_terms else None
        if not expanded_terms:
            return query
        return f"{query} {' '.join(expanded_terms[:12])}"

    async def _search_es(self, filters: AdvancedSearchFilters, query: str | None, page: int, page_size: int) -> dict:
        es_filters: dict[str, Any] = {}
        for key in ["assignee", "status", "cpc_class", "ipc_class", "inventor", "date_from", "date_to", "pub_date_from", "pub_date_to", "source"]:
            value = getattr(filters, key, None)
            if value:
                es_filters[key] = value
        result = await self.es_indexer.search(query=query, filters=es_filters or None, page=page, page_size=page_size, sort=filters.sort)
        hits = result["hits"]
        patent_ids = [h["_id"] for h in hits]
        scores = {h["_id"]: float(h.get("_score") or 0.0) for h in hits}
        patents: list[Patent] = []
        if patent_ids:
            stmt = select(Patent).where(Patent.id.in_(patent_ids))
            db_result = await self.db.execute(stmt)
            patents_map = {p.id: p for p in db_result.scalars().all()}
            patents = [patents_map[pid] for pid in patent_ids if pid in patents_map]
        return {"patents": patents, "total": result["total"], "took_ms": result["took_ms"], "scores": scores}

    async def _search_db_advanced(self, filters: AdvancedSearchFilters, query: str | None, page: int, page_size: int) -> tuple[list[Patent], int]:
        stmt = select(Patent)
        count_stmt = select(func.count()).select_from(Patent)
        conditions = []

        query_conditions = self._query_conditions(filters, query)
        if query_conditions:
            conditions.append(or_(*query_conditions))

        if filters.assignee:
            conditions.append(Patent.assignee.ilike(f"%{filters.assignee}%"))
        if filters.inventor:
            conditions.append(cast(Patent.inventors, String).ilike(f"%{filters.inventor}%"))
        if filters.status:
            conditions.append(Patent.status.ilike(f"%{filters.status}%"))
        if filters.country:
            conditions.append(Patent.patent_number.ilike(f"{filters.country}%"))
        if filters.date_from:
            conditions.append(Patent.filing_date >= filters.date_from)
        if filters.date_to:
            conditions.append(Patent.filing_date <= filters.date_to)
        if filters.pub_date_from:
            conditions.append(Patent.publication_date >= filters.pub_date_from)
        if filters.pub_date_to:
            conditions.append(Patent.publication_date <= filters.pub_date_to)
        if filters.cpc_class:
            conditions.append(cast(Patent.cpc_classifications, String).ilike(f"%{filters.cpc_class}%"))
        if filters.ipc_class:
            conditions.append(cast(Patent.ipc_classifications, String).ilike(f"%{filters.ipc_class}%"))
        if filters.patent_number:
            conditions.append(Patent.patent_number.ilike(f"%{filters.patent_number}%"))
        if filters.patent_family:
            family_root = re.sub(r"[A-Z]\d?$", "", filters.patent_family, flags=re.IGNORECASE)
            conditions.append(Patent.patent_number.ilike(f"%{family_root}%"))
        if filters.citation:
            conditions.append(cast(Patent.citations, String).ilike(f"%{filters.citation}%"))
        if filters.technology:
            pattern = f"%{filters.technology}%"
            conditions.append(or_(Patent.title.ilike(pattern), Patent.abstract.ilike(pattern), cast(Patent.cpc_classifications, String).ilike(pattern), cast(Patent.ipc_classifications, String).ilike(pattern)))

        if conditions:
            stmt = stmt.where(*conditions)
            count_stmt = count_stmt.where(*conditions)

        count_result = await self.db.execute(count_stmt)
        total = count_result.scalar_one()

        stmt = self._apply_sort(stmt, filters.sort)
        stmt = stmt.offset((page - 1) * page_size).limit(page_size)
        result = await self.db.execute(stmt)
        return list(result.scalars().all()), total

    def _query_conditions(self, filters: AdvancedSearchFilters, query: str | None) -> list[Any]:
        clauses = []
        if query:
            for term in self._boolean_terms(query if "boolean" in filters.search_modes else self._strip_boolean(query)):
                pattern = f"%{term}%"
                clauses.extend([Patent.title.ilike(pattern), Patent.abstract.ilike(pattern), Patent.patent_number.ilike(pattern), Patent.assignee.ilike(pattern)])
                if "claim" in filters.search_modes or filters.claim_query:
                    clauses.append(cast(Patent.claims, String).ilike(pattern))
        if filters.claim_query:
            clauses.append(cast(Patent.claims, String).ilike(f"%{filters.claim_query}%"))
        if filters.document_query:
            pattern = f"%{filters.document_query}%"
            clauses.extend([Patent.title.ilike(pattern), Patent.abstract.ilike(pattern), cast(Patent.claims, String).ilike(pattern)])
        if filters.image_query or filters.drawing_query:
            pattern = f"%{filters.image_query or filters.drawing_query}%"
            clauses.extend([cast(Patent.patent_metadata, String).ilike(pattern), Patent.abstract.ilike(pattern)])
        return clauses

    def _strip_boolean(self, query: str) -> str:
        return re.sub(r"(AND|OR|NOT|NEAR/\d+|ADJ|TTL|ASGN|INV|ACLM|IPC)|[():]", " ", query, flags=re.IGNORECASE)

    def _boolean_terms(self, query: str) -> list[str]:
        cleaned = self._strip_boolean(query)
        terms = [t.strip(' "') for t in re.split(r"\s+", cleaned) if len(t.strip(' "')) > 1]
        return list(dict.fromkeys(terms))[:24]

    def _apply_sort(self, stmt: Any, sort: str | None) -> Any:
        if sort == "filing_date:asc" or sort == "oldest":
            return stmt.order_by(Patent.filing_date.asc().nullslast())
        if sort == "publication_date:desc" or sort == "newest":
            return stmt.order_by(Patent.publication_date.desc().nullslast())
        if sort == "citations":
            return stmt.order_by(cast(Patent.citations, String).desc().nullslast())
        return stmt.order_by(Patent.filing_date.desc().nullslast())

    async def _semantic_scores(self, query: str | None, filters: AdvancedSearchFilters) -> dict[str, float]:
        if not query:
            return {}
        try:
            results = await search_semantic(query=query, limit=50, filters={"assignee": filters.assignee, "status": filters.status, "cpc_classifications": filters.cpc_class, "ipc_classifications": filters.ipc_class})
            return {str(r.get("patent_id")): float(r.get("score") or 0.0) for r in results if r.get("patent_id")}
        except Exception as e:
            logger.debug("Semantic scoring unavailable: %s", e)
            return {}

    def _rank_patent(self, patent: Patent, filters: AdvancedSearchFilters, expanded_terms: list[str], es_scores: dict[str, float], semantic_scores: dict[str, float]) -> RankedPatentResult:
        relevance, matched = self._text_relevance(patent, filters, expanded_terms)
        citation = self._citation_score(patent)
        semantic = min(1.0, semantic_scores.get(patent.id, 0.0) or self._normalize_es_score(es_scores.get(patent.id, 0.0)))
        novelty = self._novelty_proxy(patent, relevance, citation)
        weights = filters.ranking_weights
        hybrid = (semantic * weights.semantic) + (relevance * weights.relevance) + (citation * weights.citation) + (novelty * weights.novelty)
        scores = SearchScores(
            semantic_score=round(semantic * 100, 2),
            citation_score=round(citation * 100, 2),
            novelty_score=round(novelty * 100, 2),
            relevance_score=round(relevance * 100, 2),
            hybrid_score=round(hybrid * 100, 2),
        )
        return RankedPatentResult(
            patent_id=patent.id,
            patent_number=patent.patent_number,
            scores=scores,
            matched_fields=matched,
            highlights=self._highlights(patent, filters, expanded_terms),
            explanation=f"Hybrid rank blends semantic, relevance, citation, and novelty signals. Matched: {', '.join(matched) or 'metadata'}."
        )

    def _text_relevance(self, patent: Patent, filters: AdvancedSearchFilters, expanded_terms: list[str]) -> tuple[float, list[str]]:
        terms = self._boolean_terms(self._primary_query(filters) or "") + expanded_terms
        if not terms:
            return 0.2, []
        fields = {
            "title": patent.title or "",
            "abstract": patent.abstract or "",
            "claims": str(patent.claims or ""),
            "assignee": patent.assignee or "",
            "inventors": str(patent.inventors or ""),
            "classifications": f"{patent.cpc_classifications or ''} {patent.ipc_classifications or ''}",
            "citations": str(patent.citations or ""),
        }
        score = 0.0
        matched: list[str] = []
        for name, value in fields.items():
            lower = value.lower()
            hits = sum(1 for term in terms if term.lower() in lower)
            if hits:
                matched.append(name)
                boost = {"title": 2.5, "abstract": 1.7, "claims": 1.5, "assignee": 1.2}.get(name, 1.0)
                score += hits * boost
        return min(1.0, score / max(4.0, len(terms) * 1.6)), matched

    def _citation_score(self, patent: Patent) -> float:
        citations = patent.citations or {}
        if isinstance(citations, dict):
            count = len(citations.get("cited_by", []) or citations.get("backward", []) or citations.get("forward", []) or citations)
        elif isinstance(citations, list):
            count = len(citations)
        else:
            count = 0
        return min(1.0, math.log1p(count) / math.log(75)) if count else 0.05

    def _novelty_proxy(self, patent: Patent, relevance: float, citation: float) -> float:
        age_penalty = 0.0
        if patent.filing_date:
            try:
                age_penalty = max(0.0, min(0.35, (2026 - patent.filing_date.year) / 70))
            except Exception:
                age_penalty = 0.0
        return max(0.05, min(1.0, 0.72 - (relevance * 0.35) + (citation * 0.18) - age_penalty))

    def _normalize_es_score(self, score: float) -> float:
        return min(1.0, math.log1p(score) / math.log(12)) if score else 0.0

    def _highlights(self, patent: Patent, filters: AdvancedSearchFilters, expanded_terms: list[str]) -> dict[str, list[str]]:
        terms = self._boolean_terms(self._primary_query(filters) or "") + expanded_terms
        out: dict[str, list[str]] = {}
        for field, value in {"title": patent.title, "abstract": patent.abstract, "claims": str(patent.claims or "")}.items():
            if not value:
                continue
            snippets = []
            lower = value.lower()
            for term in terms[:8]:
                idx = lower.find(term.lower())
                if idx >= 0:
                    snippets.append(value[max(0, idx - 45): idx + len(term) + 90].strip())
            if snippets:
                out[field] = snippets[:3]
        return out

    def _facets(self, patents: list[Patent]) -> dict[str, list[dict[str, Any]]]:
        def counts(values: list[str]) -> list[dict[str, Any]]:
            bag: dict[str, int] = {}
            for value in values:
                if value:
                    bag[value] = bag.get(value, 0) + 1
            return [{"value": k, "count": v} for k, v in sorted(bag.items(), key=lambda x: x[1], reverse=True)[:12]]
        countries = [(p.patent_number or "")[:2] for p in patents]
        assignees = [p.assignee or "" for p in patents]
        statuses = [p.status or "" for p in patents]
        return {"country": counts(countries), "assignee": counts(assignees), "status": counts(statuses)}

    def _suggestions(self, query: str | None, expanded_terms: list[str], facets: dict) -> list[str]:
        suggestions = []
        if query:
            suggestions.append(f"{query} claims")
            suggestions.append(f"{query} prior art")
            suggestions.append(f"{query} patent family")
        suggestions.extend(expanded_terms[:5])
        for facet in facets.get("assignee", [])[:3]:
            suggestions.append(f"assignee:{facet['value']}")
        return list(dict.fromkeys([s for s in suggestions if s]))[:10]

    def _serialize_patent(self, patent: Patent) -> dict:
        return PatentResponse.model_validate(patent).model_dump(mode="json", by_alias=True)

    async def get_suggestions(self, query: str | None, limit: int = 10) -> SearchSuggestionResponse:
        expanded, synonyms = self.expand_query(query or "", True)
        suggestions = []
        if query:
            suggestions.extend([f"{query} claims", f"{query} prior art", f"{query} FTO", f"{query} patent family"])
        suggestions.extend(expanded)
        if query:
            stmt = select(Patent.title).where(Patent.title.ilike(f"%{query}%")).limit(limit)
            result = await self.db.execute(stmt)
            suggestions.extend([row[0] for row in result.all() if row[0]])
        return SearchSuggestionResponse(suggestions=list(dict.fromkeys(suggestions))[:limit], expanded_terms=expanded, synonyms=synonyms)

    async def save_search_history(self, user_id: str, query: str | None, filters: dict | None, result_count: int | None = None, took_ms: float | None = None, search_type: str = "fulltext") -> SearchHistory:
        entry = SearchHistory(user_id=user_id, query=query, filters=filters, result_count=result_count, took_ms=took_ms, search_type=search_type)
        self.db.add(entry)
        await self.db.flush()
        await self.db.refresh(entry)
        return entry

    async def get_search_history(self, user_id: str, limit: int = 50) -> SearchHistoryListResponse:
        stmt = select(SearchHistory).where(SearchHistory.user_id == user_id).order_by(SearchHistory.created_at.desc()).limit(limit)
        result = await self.db.execute(stmt)
        history = list(result.scalars().all())
        count_stmt = select(func.count()).select_from(SearchHistory).where(SearchHistory.user_id == user_id)
        count_result = await self.db.execute(count_stmt)
        total = count_result.scalar_one()
        return SearchHistoryListResponse(history=[SearchHistoryResponse.model_validate(h) for h in history], total=total)

    async def clear_search_history(self, user_id: str) -> None:
        stmt = select(SearchHistory).where(SearchHistory.user_id == user_id)
        result = await self.db.execute(stmt)
        for entry in list(result.scalars().all()):
            await self.db.delete(entry)
        await self.db.flush()

    async def create_saved_search(self, user_id: str, data: SavedSearchCreate) -> SavedSearch:
        saved = SavedSearch(user_id=user_id, name=data.name, query=data.query, filters=data.filters, notify_on_new=data.notify_on_new, schedule=data.schedule)
        self.db.add(saved)
        await self.db.flush()
        await self.db.refresh(saved)
        return saved

    async def get_saved_searches(self, user_id: str) -> list[SavedSearch]:
        stmt = select(SavedSearch).where(SavedSearch.user_id == user_id).order_by(SavedSearch.created_at.desc())
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def update_saved_search(self, user_id: str, search_id: str, data: SavedSearchUpdate) -> SavedSearch:
        saved = await self._get_saved_search(user_id, search_id)
        for key, value in data.model_dump(exclude_none=True).items():
            setattr(saved, key, value)
        await self.db.flush()
        await self.db.refresh(saved)
        return saved

    async def delete_saved_search(self, user_id: str, search_id: str) -> None:
        saved = await self._get_saved_search(user_id, search_id)
        await self.db.delete(saved)
        await self.db.flush()

    async def _get_saved_search(self, user_id: str, search_id: str) -> SavedSearch:
        stmt = select(SavedSearch).where(SavedSearch.id == search_id, SavedSearch.user_id == user_id)
        result = await self.db.execute(stmt)
        saved = result.scalar_one_or_none()
        if not saved:
            raise NotFoundException("Saved search not found")
        return saved

    async def get_search_analytics(self, user_id: str) -> SearchAnalyticsResponse:
        history_stmt = select(SearchHistory).where(SearchHistory.user_id == user_id)
        result = await self.db.execute(history_stmt)
        all_history = list(result.scalars().all())
        total_searches = len(all_history)
        unique_queries = len({h.query for h in all_history if h.query})
        results_counts = [h.result_count for h in all_history if h.result_count is not None]
        avg_results = sum(results_counts) / len(results_counts) if results_counts else 0
        latency = [h.took_ms for h in all_history if h.took_ms is not None]
        avg_latency = sum(latency) / len(latency) if latency else 0
        zero_result_rate = len([h for h in all_history if h.result_count == 0]) / total_searches if total_searches else 0
        query_counts: dict[str, int] = {}
        mode_counts: dict[str, int] = {}
        searches_by_day: dict[str, int] = {}
        for h in all_history:
            if h.query:
                query_counts[h.query] = query_counts.get(h.query, 0) + 1
            if h.search_type:
                mode_counts[h.search_type] = mode_counts.get(h.search_type, 0) + 1
            day = h.created_at.strftime("%Y-%m-%d") if h.created_at else "unknown"
            searches_by_day[day] = searches_by_day.get(day, 0) + 1
        top_queries = [{"query": q, "count": c} for q, c in sorted(query_counts.items(), key=lambda x: x[1], reverse=True)[:10]]
        searches_by_day_list = [{"date": d, "count": c} for d, c in sorted(searches_by_day.items())]
        mode_distribution = [{"mode": m, "count": c} for m, c in sorted(mode_counts.items(), key=lambda x: x[1], reverse=True)]
        status_dist: list[dict] = []
        source_dist: list[dict] = []
        cpc_dist: list[dict] = []
        if self.es_indexer and self.es_client:
            try:
                aggs = await self.es_indexer.get_aggregations()
                status_dist = [{"status": b["key"], "count": b["doc_count"]} for b in aggs.get("statuses", {}).get("buckets", [])]
                source_dist = [{"source": b["key"], "count": b["doc_count"]} for b in aggs.get("sources", {}).get("buckets", [])]
                cpc_dist = [{"class": b["key"], "count": b["doc_count"]} for b in aggs.get("cpc_classes", {}).get("classes", {}).get("buckets", [])]
            except Exception:
                pass
        saved_count_result = await self.db.execute(select(func.count()).select_from(SavedSearch).where(SavedSearch.user_id == user_id))
        return SearchAnalyticsResponse(
            total_searches=total_searches,
            unique_queries=unique_queries,
            avg_results=avg_results,
            top_queries=top_queries,
            searches_by_day=searches_by_day_list,
            status_distribution=status_dist,
            source_distribution=source_dist,
            cpc_class_distribution=cpc_dist,
            mode_distribution=mode_distribution,
            avg_latency_ms=avg_latency,
            zero_result_rate=zero_result_rate,
            saved_search_count=saved_count_result.scalar_one(),
        )
