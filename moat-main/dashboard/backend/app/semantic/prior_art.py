"""
Prior Art Similarity — Dedicated prior-art retrieval and analysis.

Extends the hybrid search engine with patent-specific logic:
  - Multi-strategy retrieval (vector + keyword + CPC classification)
  - Date-bounded results (only before the filing/priority date)
  - Per-result AI enrichment (relevance reason + overlapping concepts)
  - Claim-level matching for deeper prior-art analysis
"""

from __future__ import annotations

import asyncio
import time
from dataclasses import dataclass, field
from typing import Any

from app.config import settings
from app.core.logging import logger
from app.semantic.embedding_provider import get_embedding_provider
from app.semantic.ranking import rank_prior_art, _normalise_citation
from app.semantic.vector_store import (
    COLLECTION_ABSTRACT,
    COLLECTION_CLAIM,
    COLLECTION_FULL,
    vector_search,
)


@dataclass
class PriorArtHit:
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

    # Similarity scores
    semantic_score: float = 0.0
    prior_art_score: float = 0.0
    date_penalty: float = 1.0

    # Enrichment
    relevance_reason: str = ""
    overlapping_concepts: list[str] = field(default_factory=list)
    matched_claims: list[int] = field(default_factory=list)   # claim numbers matched

    search_strategy: str = "vector"

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
            "prior_art_score": round(self.prior_art_score, 4),
            "relevance_reason": self.relevance_reason,
            "overlapping_concepts": self.overlapping_concepts,
            "matched_claims": self.matched_claims,
            "search_strategy": self.search_strategy,
        }


@dataclass
class PriorArtSearchResponse:
    source_patent_number: str
    hits: list[PriorArtHit]
    total: int
    took_ms: float
    strategies_used: list[str]
    filing_date_cutoff: str | None = None
    cached: bool = False

    def to_dict(self) -> dict:
        return {
            "source_patent_number": self.source_patent_number,
            "hits": [h.to_dict() for h in self.hits],
            "total": self.total,
            "took_ms": round(self.took_ms, 1),
            "strategies_used": self.strategies_used,
            "filing_date_cutoff": self.filing_date_cutoff,
            "cached": self.cached,
        }


class PriorArtSearchEngine:
    """
    Specialised engine for prior-art discovery using multiple strategies.

    Strategy 1 — Abstract vector search
        Embeds the source patent's title+abstract and searches COLLECTION_ABSTRACT.

    Strategy 2 — Claim vector search
        Embeds each independent claim and searches COLLECTION_CLAIM.
        Effective for granular "element-by-element" prior-art matching.

    Strategy 3 — Full-text vector search
        Searches COLLECTION_FULL with combined embedding.

    Strategy 4 — AI enrichment
        Optionally calls LLM to explain relevance and extract overlapping concepts.
    """

    def __init__(self, es_client: Any | None = None) -> None:
        self._es = es_client
        self._provider = get_embedding_provider()

    async def search(
        self,
        *,
        source_patent_number: str,
        title: str,
        abstract: str,
        claims: list[dict] | None = None,
        filing_date: str | None = None,
        cpc_codes: list[str] | None = None,
        limit: int = 20,
        source_patent_id: str = "",
        enrich_top_n: int = 5,
    ) -> PriorArtSearchResponse:
        """
        Find prior art for the given patent.

        Args:
            source_patent_number: Patent number of the source patent.
            title:                Title of the source patent.
            abstract:             Abstract text.
            claims:               List of claim dicts {number, text, type}.
            filing_date:          Only return results published on/before this date.
            cpc_codes:            CPC classification codes to guide search.
            limit:                Maximum results to return.
            source_patent_id:     DB id to exclude from results.
            enrich_top_n:         How many top results to enrich with AI.
        """
        start = time.perf_counter()
        strategies_used: list[str] = []
        hits_by_id: dict[str, PriorArtHit] = {}

        # ── Strategy 1: abstract search ──────────────────────────────────────
        abs_text = f"{title}\n{abstract}"
        abs_vec = await self._provider.embed(abs_text)
        date_filter = {"publication_date": f"<={filing_date}"} if filing_date else None

        abstract_raw = await vector_search(
            collection_name=COLLECTION_ABSTRACT,
            vector=abs_vec,
            limit=limit + 10,
            filters=date_filter,
        )
        if abstract_raw:
            strategies_used.append("abstract_vector")
        for raw in abstract_raw:
            hit = _raw_to_hit(raw, "abstract_vector")
            if _should_include(hit, source_patent_id, filing_date):
                _merge_hit(hits_by_id, hit)

        # ── Strategy 2: claim-level search (independent claims only) ─────────
        ind_claims = [c for c in (claims or []) if c.get("type") == "independent"][:5]
        if ind_claims:
            claim_vecs = await self._provider.embed_batch([c["text"] for c in ind_claims])
            tasks = [
                vector_search(
                    collection_name=COLLECTION_CLAIM,
                    vector=cv,
                    limit=10,
                    filters=date_filter,
                )
                for cv in claim_vecs
            ]
            claim_results = await asyncio.gather(*tasks, return_exceptions=True)
            for claim_idx, res in enumerate(claim_results):
                if isinstance(res, Exception):
                    continue
                if res:
                    strategies_used_label = "claim_vector"
                    if strategies_used_label not in strategies_used:
                        strategies_used.append(strategies_used_label)
                for raw in res:
                    hit = _raw_to_hit(raw, "claim_vector")
                    hit.matched_claims.append(ind_claims[claim_idx]["number"])
                    if _should_include(hit, source_patent_id, filing_date):
                        _merge_hit(hits_by_id, hit)

        # ── Strategy 3: full combined search ─────────────────────────────────
        top_claims_text = " ".join(c["text"] for c in (claims or [])[:3])
        full_text = f"{title}\n{abstract}\n{top_claims_text}".strip()
        full_vec = await self._provider.embed(full_text)
        full_raw = await vector_search(
            collection_name=COLLECTION_FULL,
            vector=full_vec,
            limit=limit,
            filters=date_filter,
        )
        if full_raw:
            if "full_vector" not in strategies_used:
                strategies_used.append("full_vector")
        for raw in full_raw:
            hit = _raw_to_hit(raw, "full_vector")
            if _should_include(hit, source_patent_id, filing_date):
                _merge_hit(hits_by_id, hit)

        # ── Strategy 4: Elasticsearch keyword search ──────────────────────────
        if self._es:
            try:
                kw_hits = await self._es_prior_art_search(title, abstract, filing_date, cpc_codes, limit)
                if kw_hits:
                    strategies_used.append("keyword")
                for kw in kw_hits:
                    hit = _es_to_hit(kw)
                    if _should_include(hit, source_patent_id, filing_date):
                        _merge_hit(hits_by_id, hit)
            except Exception as exc:
                logger.warning(f"ES prior-art search failed: {exc}")

        # ── Rank ──────────────────────────────────────────────────────────────
        all_hits = list(hits_by_id.values())
        raw_for_ranking = [
            {
                "semantic_score": h.semantic_score,
                "citation_count": h.citation_count,
                "publication_date": h.publication_date,
                "filing_date": h.filing_date,
            }
            for h in all_hits
        ]
        ranked_raw = rank_prior_art(raw_for_ranking, source_filing_date=filing_date)
        # Apply scores back
        for i, h in enumerate(all_hits):
            if i < len(ranked_raw):
                h.prior_art_score = ranked_raw[i].get("prior_art_score", h.semantic_score)
                h.date_penalty = ranked_raw[i].get("date_penalty", 1.0)

        all_hits.sort(key=lambda x: x.prior_art_score, reverse=True)
        top_hits = all_hits[:limit]

        # ── AI enrichment ────────────────────────────────────────────────────
        if enrich_top_n > 0 and settings.OPENAI_API_KEY:
            await _enrich_hits(
                hits=top_hits[:enrich_top_n],
                source_title=title,
                source_abstract=abstract,
            )

        took_ms = (time.perf_counter() - start) * 1000
        return PriorArtSearchResponse(
            source_patent_number=source_patent_number,
            hits=top_hits,
            total=len(top_hits),
            took_ms=took_ms,
            strategies_used=strategies_used,
            filing_date_cutoff=filing_date,
        )

    async def _es_prior_art_search(
        self,
        title: str,
        abstract: str,
        filing_date: str | None,
        cpc_codes: list[str] | None,
        limit: int,
    ) -> list[dict]:
        filters: list[dict] = []
        if filing_date:
            filters.append({"range": {"publication_date": {"lte": filing_date}}})
        if cpc_codes:
            for cpc in cpc_codes:
                filters.append({
                    "nested": {
                        "path": "cpc_classifications",
                        "query": {"prefix": {"cpc_classifications.symbol": cpc}},
                    }
                })
        body = {
            "query": {
                "bool": {
                    "must": [
                        {
                            "multi_match": {
                                "query": f"{title} {abstract[:300]}",
                                "fields": ["title^3", "abstract^2", "claims"],
                                "fuzziness": "AUTO",
                            }
                        }
                    ],
                    "filter": filters,
                }
            },
            "size": limit,
            "_source": [
                "id", "patent_number", "title", "abstract", "assignee",
                "filing_date", "publication_date", "source",
                "cpc_classifications", "citation_count",
            ],
        }
        resp = await self._es.search(index="patents", body=body)
        return resp["hits"]["hits"]


# ── Helpers ───────────────────────────────────────────────────────────────────

def _raw_to_hit(raw: dict, strategy: str) -> PriorArtHit:
    props = raw.get("properties", raw)
    return PriorArtHit(
        patent_id=props.get("patent_id", ""),
        patent_number=props.get("patent_number", ""),
        title=props.get("title", ""),
        abstract=props.get("abstract", ""),
        assignee=props.get("assignee", ""),
        filing_date=props.get("filing_date", ""),
        publication_date=props.get("publication_date", ""),
        source=props.get("source", ""),
        cpc_codes=props.get("cpc_codes", ""),
        citation_count=int(props.get("citation_count", 0)),
        semantic_score=float(raw.get("score", 0.0)),
        search_strategy=strategy,
    )


def _es_to_hit(raw: dict) -> PriorArtHit:
    src = raw.get("_source", {})
    score = float(raw.get("_score", 0.0))
    # log-normalise ES score
    import math
    norm_score = min(1.0, math.log1p(score) / math.log1p(100.0))
    cpcs = src.get("cpc_classifications", [])
    cpc_str = ", ".join(
        c.get("symbol", "") if isinstance(c, dict) else str(c)
        for c in (cpcs if isinstance(cpcs, list) else [])[:10]
    )
    return PriorArtHit(
        patent_id=src.get("id", raw.get("_id", "")),
        patent_number=src.get("patent_number", ""),
        title=src.get("title", ""),
        abstract=src.get("abstract", ""),
        assignee=src.get("assignee", ""),
        filing_date=src.get("filing_date", ""),
        publication_date=src.get("publication_date", ""),
        source=src.get("source", ""),
        cpc_codes=cpc_str,
        citation_count=int(src.get("citation_count", 0)),
        semantic_score=norm_score,
        search_strategy="keyword",
    )


def _merge_hit(store: dict[str, PriorArtHit], new: PriorArtHit) -> None:
    key = new.patent_number or new.patent_id
    if not key:
        return
    if key in store:
        existing = store[key]
        existing.semantic_score = max(existing.semantic_score, new.semantic_score)
        existing.matched_claims = list(set(existing.matched_claims + new.matched_claims))
        if new.search_strategy not in existing.search_strategy:
            existing.search_strategy += f"+{new.search_strategy}"
    else:
        store[key] = new


def _should_include(hit: PriorArtHit, exclude_id: str, cutoff_date: str | None) -> bool:
    if exclude_id and (hit.patent_id == exclude_id or hit.patent_number == exclude_id):
        return False
    if not hit.patent_number:
        return False
    if cutoff_date and hit.publication_date:
        if hit.publication_date > cutoff_date:
            return False
    return True


async def _enrich_hits(
    hits: list[PriorArtHit],
    source_title: str,
    source_abstract: str,
) -> None:
    """Call OpenAI to explain why each hit is relevant prior art."""
    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

        async def _enrich_one(hit: PriorArtHit) -> None:
            prompt = (
                f"You are a patent examiner. Source patent: '{source_title}'. "
                f"Abstract: {source_abstract[:300]}.\n\n"
                f"Prior art candidate '{hit.patent_number}': '{hit.title}'. "
                f"Abstract: {hit.abstract[:300]}.\n\n"
                f"In JSON: {{\"reason\": \"<one sentence>\", \"concepts\": [\"<up to 3 overlap concepts>\"]}}"
            )
            resp = await client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=150,
                temperature=0.2,
            )
            import json, re
            content = resp.choices[0].message.content or ""
            m = re.search(r"\{.*\}", content, re.DOTALL)
            if m:
                parsed = json.loads(m.group())
                hit.relevance_reason = parsed.get("reason", "")
                hit.overlapping_concepts = parsed.get("concepts", [])

        await asyncio.gather(*[_enrich_one(h) for h in hits], return_exceptions=True)
    except Exception as exc:
        logger.warning(f"AI enrichment failed: {exc}")


# ── Module-level singleton ────────────────────────────────────────────────────

_engine: PriorArtSearchEngine | None = None


def get_prior_art_engine(es_client: Any | None = None) -> PriorArtSearchEngine:
    global _engine
    if _engine is None or es_client is not None:
        _engine = PriorArtSearchEngine(es_client=es_client)
    return _engine
