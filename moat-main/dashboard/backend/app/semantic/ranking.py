"""
Semantic Ranking Engine — Composite multi-signal patent scoring.

Combines four orthogonal signals:

  1. semantic_score   : cosine similarity from vector search (0–1)
  2. keyword_score    : BM25 / TF-IDF relevance from Elasticsearch (0–1)
  3. citation_score   : normalised forward citation count (proxy for impact)
  4. novelty_score    : how semantically distinct a patent is from its neighbors

Final score = weighted sum → Reciprocal Rank Fusion → re-ranked list.

All public functions are pure / deterministic given the same inputs.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Any


# ── Config ─────────────────────────────────────────────────────────────────────

DEFAULT_WEIGHTS = {
    "semantic":  0.45,
    "keyword":   0.30,
    "citation":  0.15,
    "novelty":   0.10,
}

# Reciprocal Rank Fusion constant (higher → less steep penalty for low ranks)
RRF_K = 60


@dataclass
class RankedResult:
    patent_id: str
    patent_number: str
    title: str
    abstract: str = ""
    assignee: str = ""
    filing_date: str = ""
    publication_date: str = ""
    source: str = ""
    cpc_codes: str = ""
    citation_count: int = 0

    # per-signal scores
    semantic_score: float = 0.0
    keyword_score: float = 0.0
    citation_score: float = 0.0
    novelty_score: float = 0.0

    # composite
    composite_score: float = 0.0
    rrf_score: float = 0.0

    # provenance
    matched_by: list[str] = field(default_factory=list)   # ["vector","keyword",...]
    search_strategy: str = "hybrid"
    snippet: str = ""

    def to_dict(self) -> dict:
        return {
            "patent_id": self.patent_id,
            "patent_number": self.patent_number,
            "title": self.title,
            "abstract": self.abstract,
            "assignee": self.assignee,
            "filing_date": self.filing_date,
            "publication_date": self.publication_date,
            "source": self.source,
            "cpc_codes": self.cpc_codes,
            "citation_count": self.citation_count,
            "semantic_score": round(self.semantic_score, 4),
            "keyword_score": round(self.keyword_score, 4),
            "citation_score": round(self.citation_score, 4),
            "novelty_score": round(self.novelty_score, 4),
            "composite_score": round(self.composite_score, 4),
            "rrf_score": round(self.rrf_score, 4),
            "matched_by": self.matched_by,
            "search_strategy": self.search_strategy,
            "snippet": self.snippet,
        }


# ── Main ranking entrypoint ───────────────────────────────────────────────────

def rank_results(
    vector_hits: list[dict],
    keyword_hits: list[dict],
    weights: dict[str, float] | None = None,
    max_citation_count: int | None = None,
    deduplicate: bool = True,
) -> list[RankedResult]:
    """
    Merge vector + keyword search results and compute composite scores.

    Args:
        vector_hits:   Results from Weaviate near-vector search.
                       Expected keys: patent_id/patent_number/title/...
                       plus 'score' (certainty 0-1).
        keyword_hits:  Results from Elasticsearch BM25 search.
                       Expected keys: same, plus 'score' (ES _score).
        weights:       Override DEFAULT_WEIGHTS.
        max_citation_count: Used to normalise citation scores.
        deduplicate:   Remove duplicate patent_numbers.

    Returns:
        List of RankedResult sorted by rrf_score descending.
    """
    w = {**DEFAULT_WEIGHTS, **(weights or {})}

    # Normalise keyword scores to 0-1
    max_kw = max((h.get("score", 0.0) for h in keyword_hits), default=1.0) or 1.0
    max_cit = max_citation_count or max(
        (h.get("citation_count", 0) for h in vector_hits + keyword_hits), default=1
    ) or 1

    merged: dict[str, RankedResult] = {}

    # ── Consume vector hits ──────────────────────────────────────────────────
    for rank, hit in enumerate(vector_hits):
        key = _dedup_key(hit)
        props = hit.get("properties", hit)
        r = _get_or_create(merged, key, props)
        r.semantic_score = float(hit.get("score", 0.0))
        r.citation_score = _normalise_citation(props.get("citation_count", 0), max_cit)
        if "vector" not in r.matched_by:
            r.matched_by.append("vector")
        # Partial RRF contribution from vector rank
        r.rrf_score += 1.0 / (RRF_K + rank + 1)

    # ── Consume keyword hits ─────────────────────────────────────────────────
    for rank, hit in enumerate(keyword_hits):
        key = _dedup_key(hit)
        props = hit.get("_source", hit)
        r = _get_or_create(merged, key, props)
        r.keyword_score = float(hit.get("score", 0.0)) / max_kw
        if r.citation_score == 0.0:
            r.citation_score = _normalise_citation(props.get("citation_count", 0), max_cit)
        if "keyword" not in r.matched_by:
            r.matched_by.append("keyword")
        # Partial RRF contribution from keyword rank
        r.rrf_score += 1.0 / (RRF_K + rank + 1)

    # ── Compute novelty scores ──────────────────────────────────────────────
    all_results = list(merged.values())
    _assign_novelty_scores(all_results)

    # ── Compute composite scores ────────────────────────────────────────────
    for r in all_results:
        r.composite_score = (
            w["semantic"] * r.semantic_score
            + w["keyword"]  * r.keyword_score
            + w["citation"] * r.citation_score
            + w["novelty"]  * r.novelty_score
        )
        # Blend composite into RRF
        r.rrf_score = 0.7 * r.rrf_score + 0.3 * r.composite_score

        # Set search_strategy label
        if len(r.matched_by) > 1:
            r.search_strategy = "hybrid"
        elif "vector" in r.matched_by:
            r.search_strategy = "semantic"
        else:
            r.search_strategy = "keyword"

    # ── Sort & return ───────────────────────────────────────────────────────
    all_results.sort(key=lambda x: x.rrf_score, reverse=True)
    return all_results


# ── Prior-art ranking ─────────────────────────────────────────────────────────

def rank_prior_art(
    results: list[dict],
    source_filing_date: str | None = None,
) -> list[dict]:
    """
    Special ranking for prior-art results.

    Penalties:
      - Patents published AFTER the source filing date are demoted.
      - Low semantic similarity demoted further.
    Extra credit:
      - High citation count (often more authoritative prior art).
    """
    max_cit = max((r.get("citation_count", 0) for r in results), default=1) or 1

    scored: list[tuple[float, dict]] = []
    for r in results:
        base = r.get("semantic_score", r.get("score", 0.0))
        cit = _normalise_citation(r.get("citation_count", 0), max_cit)

        # Date penalty
        date_penalty = 1.0
        if source_filing_date:
            pub = r.get("publication_date") or r.get("filing_date") or ""
            if pub and pub > source_filing_date:
                date_penalty = 0.1  # published after → not valid prior art

        final = (0.65 * base + 0.25 * cit + 0.10) * date_penalty
        r["prior_art_score"] = round(final, 4)
        r["date_penalty"] = date_penalty
        scored.append((final, r))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [item for _, item in scored]


# ── Score extraction helpers ──────────────────────────────────────────────────

def extract_keyword_score_from_es(hit: dict) -> float:
    """Normalise raw Elasticsearch _score to 0-1 (log-based)."""
    raw = float(hit.get("_score", 0.0))
    if raw <= 0:
        return 0.0
    # log1p normalisation (unbounded ES scores → bounded 0-1)
    return min(1.0, math.log1p(raw) / math.log1p(100.0))


# ── Internal helpers ──────────────────────────────────────────────────────────

def _dedup_key(hit: dict) -> str:
    props = hit.get("properties", hit.get("_source", hit))
    return (
        props.get("patent_id")
        or props.get("patent_number")
        or hit.get("_id", "")
        or "unknown"
    )


def _get_or_create(merged: dict[str, RankedResult], key: str, props: dict) -> RankedResult:
    if key not in merged:
        merged[key] = RankedResult(
            patent_id=props.get("patent_id", key),
            patent_number=props.get("patent_number", key),
            title=props.get("title", ""),
            abstract=props.get("abstract", ""),
            assignee=props.get("assignee", ""),
            filing_date=props.get("filing_date", ""),
            publication_date=props.get("publication_date", ""),
            source=props.get("source", ""),
            cpc_codes=props.get("cpc_codes", props.get("cpc_classifications", "")),
            citation_count=int(props.get("citation_count", 0)),
        )
    return merged[key]


def _normalise_citation(count: int, max_count: int) -> float:
    if max_count <= 0 or count <= 0:
        return 0.0
    # log-normalised so that a patent with 1000 cites is only ~2× a patent with 10
    return min(1.0, math.log1p(count) / math.log1p(max_count))


def _assign_novelty_scores(results: list[RankedResult]) -> None:
    """
    Assign novelty_score: patents semantically distinct from other results
    in the set receive a higher novelty bonus.

    We approximate this with rank-based diversity: top semantic hits are
    presumed similar → lower novelty; outliers get higher novelty.
    """
    if not results:
        return

    sem_scores = [r.semantic_score for r in results]
    mean_sem = sum(sem_scores) / len(sem_scores) if sem_scores else 0.5

    for r in results:
        # Divergence from the mean → higher novelty
        divergence = abs(r.semantic_score - mean_sem)
        r.novelty_score = min(1.0, divergence * 2.0)
