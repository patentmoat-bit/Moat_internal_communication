from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import date
from typing import Any

from opensearchpy.exceptions import OpenSearchException

from moat_api.services.search import embeddings
from moat_api.services.search.client import client
from moat_api.services.search.schema import HYBRID_PIPELINE, PUBLICATIONS_ALIAS

MAX_SIZE = 50
# Caps query complexity before it reaches the cluster. An unbounded boolean
# query is a denial-of-service vector, not a power feature (design doc §8).
MAX_TERMS = 64
MAX_QUERY_CHARS = 2000


class SearchUnavailable(RuntimeError):
    """Retrieval could not run.

    Raised rather than returning an empty list: zero results and "the search
    engine is down" mean opposite things to someone deciding whether to file.
    """


@dataclass(slots=True)
class Filters:
    jurisdictions: list[str] = field(default_factory=list)
    cpc_prefixes: list[str] = field(default_factory=list)
    published_from: date | None = None
    published_to: date | None = None


@dataclass(frozen=True, slots=True)
class SearchHit:
    publication_id: str
    title: str
    abstract: str
    claims_text: str
    applicant: str
    jurisdiction: str
    kind_code: str
    published_on: str | None
    classifications: list[str]
    score: float
    highlights: list[str]


def validate_query(text: str) -> str:
    cleaned = text.strip()
    if not cleaned:
        raise ValueError("Search text is required.")
    if len(cleaned) > MAX_QUERY_CHARS:
        raise ValueError(f"Search text is limited to {MAX_QUERY_CHARS} characters.")
    if len(re.findall(r"\w+", cleaned)) > MAX_TERMS:
        raise ValueError(f"Search is limited to {MAX_TERMS} terms.")
    return cleaned


def _filter_clauses(filters: Filters) -> list[dict[str, Any]]:
    clauses: list[dict[str, Any]] = []
    if filters.jurisdictions:
        clauses.append({"terms": {"jurisdiction": filters.jurisdictions[:20]}})
    if filters.cpc_prefixes:
        clauses.append({"terms": {"cpc_prefixes": [c.upper() for c in filters.cpc_prefixes[:20]]}})
    if filters.published_from or filters.published_to:
        published_range: dict[str, str] = {}
        if filters.published_from:
            published_range["gte"] = filters.published_from.isoformat()
        if filters.published_to:
            published_range["lte"] = filters.published_to.isoformat()
        clauses.append({"range": {"published_on": published_range}})
    return clauses


def _bm25_query(text: str, filters: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "bool": {
            "must": [
                {
                    "multi_match": {
                        "query": text,
                        # Title carries the most signal per word; claims the
                        # least per word but the most coverage.
                        "fields": ["title^3", "abstract^2", "claims_text", "applicant"],
                        "type": "best_fields",
                    }
                }
            ],
            "filter": filters,
        }
    }


def _knn_query(vector: list[float], size: int, filters: list[dict[str, Any]]) -> dict[str, Any]:
    knn: dict[str, Any] = {"vector": vector, "k": size}
    if filters:
        # Filter inside the kNN clause so the engine prunes during graph
        # traversal rather than discarding neighbours after the fact, which
        # would silently return fewer than k results.
        knn["filter"] = {"bool": {"filter": filters}}
    return {"knn": {"embedding": knn}}


async def search(
    text: str,
    *,
    filters: Filters | None = None,
    size: int = 10,
) -> tuple[list[SearchHit], str]:
    """Run retrieval. Returns hits and the retrieval version that produced them.

    Hybrid when embeddings are available: BM25 finds documents that use the
    same words, vectors find documents that describe the same thing in
    different words. Patent prose does both, which is why neither alone is
    enough.
    """
    cleaned = validate_query(text)
    size = max(1, min(size, MAX_SIZE))
    filter_clauses = _filter_clauses(filters or Filters())
    vector = embeddings.encode_one(cleaned)

    body: dict[str, Any] = {
        "size": size,
        "_source": {"excludes": ["embedding"]},
        "highlight": {
            "fields": {"abstract": {}, "claims_text": {}, "title": {}},
            "fragment_size": 260,
            "number_of_fragments": 1,
            "pre_tags": [""],
            "post_tags": [""],
        },
    }
    params: dict[str, Any] = {}

    if vector is not None:
        body["query"] = {
            "hybrid": {
                "queries": [
                    _bm25_query(cleaned, filter_clauses),
                    _knn_query(vector, size, filter_clauses),
                ]
            }
        }
        params["search_pipeline"] = HYBRID_PIPELINE
        version = "hybrid-bm25+knn@1.0"
    else:
        body["query"] = _bm25_query(cleaned, filter_clauses)
        version = "opensearch-bm25@1.0"

    try:
        response = await client().search(index=PUBLICATIONS_ALIAS, body=body, params=params)
    except OpenSearchException as error:
        raise SearchUnavailable(str(error)) from error

    hits: list[SearchHit] = []
    for raw in response.get("hits", {}).get("hits", []):
        source = raw.get("_source", {})
        highlight = raw.get("highlight", {})
        fragments = [
            fragment
            for key in ("abstract", "claims_text", "title")
            for fragment in highlight.get(key, [])
        ]
        hits.append(
            SearchHit(
                publication_id=source.get("publication_id", raw.get("_id", "")),
                title=source.get("title", ""),
                abstract=source.get("abstract", ""),
                claims_text=source.get("claims_text", ""),
                applicant=source.get("applicant", ""),
                jurisdiction=source.get("jurisdiction", ""),
                kind_code=source.get("kind_code", ""),
                published_on=source.get("published_on"),
                classifications=list(source.get("classifications", [])),
                score=round(float(raw.get("_score") or 0.0), 4),
                highlights=fragments[:2],
            )
        )
    return hits, version
