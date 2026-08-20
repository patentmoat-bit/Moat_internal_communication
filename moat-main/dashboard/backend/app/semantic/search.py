"""
Hybrid Search Engine — Keyword + Vector + Ranking in one pipeline.

Search flow:
    User Query
    → keyword search  (Elasticsearch BM25)
    → vector search   (Weaviate near-vector, using EmbeddingProvider)
    → ranking engine  (RRF + composite score)
    → combined results

Optional filters:
    assignee, source, cpc_codes, date_from, date_to
"""

from __future__ import annotations

import asyncio
import time
from dataclasses import dataclass
from typing import Any

from elasticsearch import AsyncElasticsearch

from app.core.logging import logger
from app.semantic.embedding_provider import get_embedding_provider
from app.semantic.ranking import (
    RankedResult,
    extract_keyword_score_from_es,
    rank_results,
)
from app.semantic.vector_store import (
    COLLECTION_ABSTRACT,
    COLLECTION_CLAIM,
    COLLECTION_FULL,
    vector_search,
)


@dataclass
class SearchRequest:
    query: str
    limit: int = 20
    # Filters
    assignee: str | None = None
    source: list[str] | None = None
    cpc_codes: list[str] | None = None
    date_from: str | None = None     # YYYY-MM-DD
    date_to: str | None = None       # YYYY-MM-DD
    # Strategy flags
    include_keyword: bool = True
    include_vector: bool = True
    include_claim_search: bool = False  # search claim-level collection too
    # Ranking weights override
    weights: dict | None = None

    def to_cache_key(self) -> str:
        import hashlib, json
        blob = json.dumps(self.__dict__, sort_keys=True, default=str)
        return "semantic:search:" + hashlib.sha256(blob.encode()).hexdigest()[:24]


@dataclass
class SearchResponse:
    query: str
    results: list[RankedResult]
    total: int
    took_ms: float
    strategies_used: list[str]
    vector_backend: str
    cached: bool = False

    def to_dict(self) -> dict:
        return {
            "query": self.query,
            "results": [r.to_dict() for r in self.results],
            "total": self.total,
            "took_ms": round(self.took_ms, 1),
            "strategies_used": self.strategies_used,
            "vector_backend": self.vector_backend,
            "cached": self.cached,
        }


class HybridSearchEngine:
    """
    Orchestrates keyword + vector search and merges results via RRF ranking.
    """

    def __init__(self, es_client: AsyncElasticsearch | None = None) -> None:
        self._es = es_client
        self._provider = get_embedding_provider()

    async def search(self, request: SearchRequest) -> SearchResponse:
        start = time.perf_counter()
        strategies_used: list[str] = []

        kw_hits: list[dict] = []
        vec_hits: list[dict] = []

        # ── Run keyword and vector searches in parallel ────────────────────
        async def _empty() -> list:
            return []

        tasks = []
        if request.include_keyword and self._es:
            tasks.append(self._keyword_search(request))
        else:
            tasks.append(_empty())

        if request.include_vector:
            tasks.append(self._vector_search(request))
        else:
            tasks.append(_empty())

        results = await asyncio.gather(*tasks, return_exceptions=True)

        kw_hits = results[0] if not isinstance(results[0], Exception) else []
        vec_hits = results[1] if not isinstance(results[1], Exception) else []

        if kw_hits:
            strategies_used.append("keyword")
        if vec_hits:
            strategies_used.append("vector")

        # ── Optional: also search claim collection ─────────────────────────
        if request.include_claim_search and request.include_vector:
            try:
                claim_hits = await self._claim_vector_search(request)
                if claim_hits:
                    vec_hits = _merge_vector_hits(vec_hits, claim_hits)
                    if "claim" not in strategies_used:
                        strategies_used.append("claim")
            except Exception as exc:
                logger.warning(f"Claim vector search error: {exc}")

        # ── Rank & merge ───────────────────────────────────────────────────
        ranked = rank_results(
            vector_hits=vec_hits,
            keyword_hits=kw_hits,
            weights=request.weights,
        )
        ranked = ranked[: request.limit]

        took_ms = (time.perf_counter() - start) * 1000
        return SearchResponse(
            query=request.query,
            results=ranked,
            total=len(ranked),
            took_ms=took_ms,
            strategies_used=strategies_used,
            vector_backend=self._provider.backend,
        )

    # ── Keyword search ─────────────────────────────────────────────────────────

    async def _keyword_search(self, req: SearchRequest) -> list[dict]:
        if not self._es:
            return []
        try:
            body = _build_es_query(req)
            resp = await self._es.search(index="patents", body=body)
            hits = []
            for h in resp["hits"]["hits"]:
                src = h.get("_source", {})
                hits.append({
                    "patent_id": src.get("id") or h["_id"],
                    "patent_number": src.get("patent_number", ""),
                    "title": src.get("title", ""),
                    "abstract": src.get("abstract", ""),
                    "assignee": src.get("assignee", ""),
                    "filing_date": src.get("filing_date", ""),
                    "publication_date": src.get("publication_date", ""),
                    "source": src.get("source", ""),
                    "citation_count": src.get("citation_count", 0),
                    "cpc_codes": _flatten_cpc(src.get("cpc_classifications")),
                    "score": extract_keyword_score_from_es(h),
                    "_source": src,
                    "_id": h["_id"],
                })
            return hits
        except Exception as exc:
            logger.warning(f"ES keyword search failed: {exc}")
            return []

    # ── Vector search ──────────────────────────────────────────────────────────

    async def _vector_search(self, req: SearchRequest) -> list[dict]:
        try:
            vec = await self._provider.embed(req.query)
            wv_filters = _build_wv_filters(req)
            raw = await vector_search(
                collection_name=COLLECTION_FULL,
                vector=vec,
                limit=req.limit * 2,  # over-fetch for RRF
                filters=wv_filters,
            )
            return [_wv_hit_to_dict(r) for r in raw]
        except Exception as exc:
            logger.warning(f"Vector search failed: {exc}")
            return []

    async def _claim_vector_search(self, req: SearchRequest) -> list[dict]:
        try:
            vec = await self._provider.embed(req.query)
            raw = await vector_search(
                collection_name=COLLECTION_CLAIM,
                vector=vec,
                limit=req.limit,
            )
            return [_wv_hit_to_dict(r) for r in raw]
        except Exception as exc:
            logger.warning(f"Claim vector search failed: {exc}")
            return []


# ── ES query builder ───────────────────────────────────────────────────────────

def _build_es_query(req: SearchRequest) -> dict:
    must = [
        {
            "multi_match": {
                "query": req.query,
                "fields": ["title^4", "abstract^2", "claims^2", "full_text"],
                "type": "best_fields",
                "fuzziness": "AUTO",
            }
        }
    ]
    filters: list[dict] = []

    if req.assignee:
        filters.append({"match": {"assignee": req.assignee}})
    if req.source:
        filters.append({"terms": {"source": req.source}})
    if req.cpc_codes:
        for cpc in req.cpc_codes:
            filters.append({
                "nested": {
                    "path": "cpc_classifications",
                    "query": {"prefix": {"cpc_classifications.symbol": cpc}},
                }
            })
    if req.date_from:
        filters.append({"range": {"publication_date": {"gte": req.date_from}}})
    if req.date_to:
        filters.append({"range": {"publication_date": {"lte": req.date_to}}})

    return {
        "query": {"bool": {"must": must, "filter": filters}},
        "size": 50,
        "_source": [
            "id", "patent_number", "title", "abstract", "assignee",
            "filing_date", "publication_date", "source",
            "cpc_classifications", "citation_count",
        ],
    }


# ── Weaviate filter builder ───────────────────────────────────────────────────

def _build_wv_filters(req: SearchRequest) -> dict | None:
    filters: dict = {}
    if req.assignee:
        filters["assignee"] = req.assignee
    if req.source:
        filters["source"] = req.source
    if req.date_from:
        filters["publication_date"] = f">={req.date_from}"
    if req.date_to:
        filters["publication_date"] = f"<={req.date_to}"
    return filters or None


# ── Hit normalisation ─────────────────────────────────────────────────────────

def _wv_hit_to_dict(raw: dict) -> dict:
    props = raw.get("properties", raw)
    return {
        "patent_id": props.get("patent_id", ""),
        "patent_number": props.get("patent_number", ""),
        "title": props.get("title", ""),
        "abstract": props.get("abstract", ""),
        "assignee": props.get("assignee", ""),
        "filing_date": props.get("filing_date", ""),
        "publication_date": props.get("publication_date", ""),
        "source": props.get("source", ""),
        "cpc_codes": props.get("cpc_codes", ""),
        "citation_count": int(props.get("citation_count", 0)),
        "score": raw.get("score", 0.0),
        "properties": props,
    }


def _merge_vector_hits(primary: list[dict], secondary: list[dict]) -> list[dict]:
    """Merge secondary (claim) hits into primary, boosting if already present."""
    seen = {h.get("patent_id") or h.get("patent_number") for h in primary}
    for h in secondary:
        key = h.get("patent_id") or h.get("patent_number")
        if key not in seen:
            primary.append(h)
        # else: primary already has it — claim match implicitly boosts via RRF
    return primary


def _flatten_cpc(cpcs: Any) -> str:
    if not cpcs:
        return ""
    if isinstance(cpcs, str):
        return cpcs
    if isinstance(cpcs, list):
        return ", ".join(
            c.get("symbol", str(c)) if isinstance(c, dict) else str(c)
            for c in cpcs[:10]
        )
    return str(cpcs)


# ── Module-level engine singleton ─────────────────────────────────────────────

_engine: HybridSearchEngine | None = None


def get_search_engine(es_client: AsyncElasticsearch | None = None) -> HybridSearchEngine:
    global _engine
    if _engine is None or es_client is not None:
        _engine = HybridSearchEngine(es_client=es_client)
    return _engine
