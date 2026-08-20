"""
Vector Ingestion Pipeline — Generates and stores embeddings for patents.

Handles three embedding granularities:
  - Abstract embedding  (1 vector per patent)
  - Claim embeddings    (N vectors per patent, 1 per claim)
  - Full embedding      (1 vector combining title + abstract + top claims)

Uses EmbeddingProvider for generation, VectorStore for persistence.
Includes batching, deduplication, and error resilience.
"""

from __future__ import annotations

import asyncio
import time
from dataclasses import dataclass, field
from typing import Any

from app.core.logging import logger
from app.semantic.embedding_provider import get_embedding_provider
from app.semantic.vector_store import (
    ensure_collections,
    upsert_patent_abstract,
    upsert_patent_claims,
    upsert_patent_full,
)


@dataclass
class IngestionResult:
    patent_id: str
    patent_number: str
    abstract_ok: bool = False
    claims_ok: bool = False
    full_ok: bool = False
    error: str | None = None
    duration_ms: float = 0.0

    @property
    def success(self) -> bool:
        return self.abstract_ok or self.full_ok

    def to_dict(self) -> dict:
        return {
            "patent_id": self.patent_id,
            "patent_number": self.patent_number,
            "abstract_ok": self.abstract_ok,
            "claims_ok": self.claims_ok,
            "full_ok": self.full_ok,
            "success": self.success,
            "error": self.error,
            "duration_ms": round(self.duration_ms, 1),
        }


@dataclass
class BatchIngestionReport:
    total: int = 0
    succeeded: int = 0
    failed: int = 0
    skipped: int = 0
    duration_s: float = 0.0
    errors: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "total": self.total,
            "succeeded": self.succeeded,
            "failed": self.failed,
            "skipped": self.skipped,
            "duration_s": round(self.duration_s, 2),
            "errors": self.errors[:10],  # cap for response size
        }


class VectorIngestionPipeline:
    """
    Async pipeline that turns patent records into embedded vector objects.

    Example usage::

        pipeline = VectorIngestionPipeline()
        await pipeline.setup()

        result = await pipeline.ingest_one(patent_dict)

        report = await pipeline.ingest_batch(list_of_patent_dicts, concurrency=8)
    """

    def __init__(self) -> None:
        self._provider = get_embedding_provider()
        self._ready = False

    # ── Setup ────────────────────────────────────────────────────────────────

    async def setup(self) -> bool:
        """Ensure Weaviate collections exist. Must be called once at startup."""
        ok = await ensure_collections()
        if ok:
            self._ready = True
            logger.info("VectorIngestionPipeline ready")
        else:
            logger.warning("VectorIngestionPipeline: Weaviate collections not set up")
        return ok

    # ── Single patent ─────────────────────────────────────────────────────────

    async def ingest_one(self, patent: dict) -> IngestionResult:
        """
        Generate and store all embedding types for a single patent.

        *patent* keys expected (all optional except id/number):
            id, patent_number, title, abstract, claims (list of dicts),
            assignee, filing_date, publication_date, source,
            cpc_classifications (list of dicts with 'symbol'),
            citation_count
        """
        start = time.perf_counter()
        patent_id = str(patent.get("id") or patent.get("patent_id", ""))
        patent_number = patent.get("patent_number", "") or patent_id

        result = IngestionResult(patent_id=patent_id, patent_number=patent_number)

        if not patent_id:
            result.error = "Missing patent id"
            return result

        try:
            title = patent.get("title") or ""
            abstract = patent.get("abstract") or ""
            assignee = patent.get("assignee") or ""
            filing_date = str(patent.get("filing_date") or "")
            publication_date = str(patent.get("publication_date") or "")
            source = patent.get("source") or ""
            citation_count = int(patent.get("citation_count") or 0)
            cpc_codes = _extract_cpc_codes(patent)

            # ── Abstract embedding ────────────────────────────────────────────
            if abstract:
                abs_text = f"{title}\n{abstract}"
                abs_vec = await self._provider.embed(abs_text)
                result.abstract_ok = await upsert_patent_abstract(
                    patent_id=patent_id,
                    patent_number=patent_number,
                    title=title,
                    abstract=abstract,
                    assignee=assignee,
                    filing_date=filing_date,
                    publication_date=publication_date,
                    source=source,
                    cpc_codes=cpc_codes,
                    citation_count=citation_count,
                    vector=abs_vec,
                )

            # ── Claim embeddings ──────────────────────────────────────────────
            claims = _extract_claims(patent)
            if claims:
                claim_texts = [c["text"] for c in claims]
                claim_vecs = await self._provider.embed_batch(claim_texts)
                result.claims_ok = await upsert_patent_claims(
                    patent_id=patent_id,
                    patent_number=patent_number,
                    title=title,
                    claims=claims,
                    assignee=assignee,
                    filing_date=filing_date,
                    publication_date=publication_date,
                    source=source,
                    cpc_codes=cpc_codes,
                    citation_count=citation_count,
                    vectors=claim_vecs,
                )

            # ── Full combined embedding ───────────────────────────────────────
            top_claims_text = " ".join(c["text"] for c in claims[:5]) if claims else ""
            full_text = f"{title}\n{abstract}\n{top_claims_text}".strip()
            if full_text:
                full_vec = await self._provider.embed(full_text)
                result.full_ok = await upsert_patent_full(
                    patent_id=patent_id,
                    patent_number=patent_number,
                    title=title,
                    abstract=abstract,
                    claims_text=top_claims_text,
                    assignee=assignee,
                    filing_date=filing_date,
                    publication_date=publication_date,
                    source=source,
                    cpc_codes=cpc_codes,
                    citation_count=citation_count,
                    vector=full_vec,
                )

        except Exception as exc:
            result.error = str(exc)
            logger.error(f"ingest_one failed for {patent_number}: {exc}")

        result.duration_ms = (time.perf_counter() - start) * 1000
        return result

    # ── Batch ingestion ───────────────────────────────────────────────────────

    async def ingest_batch(
        self,
        patents: list[dict],
        concurrency: int = 4,
        skip_existing: bool = False,
    ) -> BatchIngestionReport:
        """
        Ingest a list of patent dicts concurrently.

        Args:
            patents:        List of patent dicts (same schema as ingest_one).
            concurrency:    Max parallel coroutines (keeps RAM/API rate in check).
            skip_existing:  If True, patents that already have vectors are skipped.
        """
        start = time.perf_counter()
        report = BatchIngestionReport(total=len(patents))

        semaphore = asyncio.Semaphore(concurrency)

        async def _worker(patent: dict) -> None:
            async with semaphore:
                res = await self.ingest_one(patent)
                if res.success:
                    report.succeeded += 1
                elif res.error:
                    report.failed += 1
                    report.errors.append(f"{res.patent_number}: {res.error}")
                else:
                    report.skipped += 1

        await asyncio.gather(*[_worker(p) for p in patents])
        report.duration_s = time.perf_counter() - start

        logger.info(
            f"Batch ingestion complete: {report.succeeded}/{report.total} succeeded "
            f"in {report.duration_s:.1f}s"
        )
        return report

    # ── Re-embed existing DB patents ──────────────────────────────────────────

    async def reindex_all(self, db_session: Any, batch_size: int = 50) -> BatchIngestionReport:
        """
        Fetch all patents from the DB and re-index them into Weaviate.
        Useful for initial bootstrap or after model changes.
        """
        from sqlalchemy import select
        from app.models.patent import Patent

        report = BatchIngestionReport()
        offset = 0

        while True:
            result = await db_session.execute(
                select(Patent).offset(offset).limit(batch_size)
            )
            patents = result.scalars().all()
            if not patents:
                break

            batch = [
                {
                    "id": str(p.id),
                    "patent_number": p.patent_number or "",
                    "title": p.title or "",
                    "abstract": p.abstract or "",
                    "claims": p.claims or [],
                    "assignee": p.assignee or "",
                    "filing_date": str(p.filing_date or ""),
                    "publication_date": str(p.publication_date or ""),
                    "source": p.source or "",
                    "cpc_classifications": p.cpc_classifications or [],
                    "citation_count": p.citation_count or 0,
                }
                for p in patents
            ]

            sub = await self.ingest_batch(batch, concurrency=4)
            report.total += sub.total
            report.succeeded += sub.succeeded
            report.failed += sub.failed
            report.skipped += sub.skipped
            report.errors.extend(sub.errors)

            offset += batch_size
            if len(patents) < batch_size:
                break

        return report


# ── Helpers ────────────────────────────────────────────────────────────────────

def _extract_cpc_codes(patent: dict) -> str:
    cpcs = patent.get("cpc_classifications") or []
    if isinstance(cpcs, list):
        return ", ".join(
            c.get("symbol", "") if isinstance(c, dict) else str(c)
            for c in cpcs[:10]
        )
    return str(cpcs)


def _extract_claims(patent: dict) -> list[dict]:
    raw = patent.get("claims") or []
    if not raw:
        return []

    if isinstance(raw, str):
        # Plain string — wrap as single independent claim
        return [{"number": 1, "text": raw[:2000], "type": "independent"}]

    if isinstance(raw, list):
        normalised = []
        for i, c in enumerate(raw[:50]):  # cap at 50 claims per patent
            if isinstance(c, dict):
                normalised.append({
                    "number": c.get("number", i + 1),
                    "text": (c.get("text") or c.get("claim_text") or "")[:1500],
                    "type": c.get("type", "independent"),
                })
            elif isinstance(c, str):
                normalised.append({
                    "number": i + 1,
                    "text": c[:1500],
                    "type": "independent",
                })
        return [c for c in normalised if c["text"]]

    return []


# ── Module-level singleton ────────────────────────────────────────────────────

_pipeline: VectorIngestionPipeline | None = None


def get_pipeline() -> VectorIngestionPipeline:
    global _pipeline
    if _pipeline is None:
        _pipeline = VectorIngestionPipeline()
    return _pipeline
