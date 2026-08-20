"""
Patent normalization pipeline.

Transforms raw source data (dict from any connector) into a UnifiedPatent.
Runs all sub-parsers (claims, CPC, IPC, citations) to enrich the record.
"""
from __future__ import annotations

import logging
from typing import Any

from app.schemas.unified_patent import (
    UnifiedPatent, InventorModel, AssigneeModel,
    ClaimModel, CPCClassification, IPCClassification, CitationModel,
)
from app.ingestion.parsers.claims_parser import ClaimsParser
from app.ingestion.parsers.cpc_parser import CPCParser
from app.ingestion.parsers.ipc_parser import IPCParser
from app.ingestion.extractors.citation_extractor import CitationExtractor
from app.ingestion.extractors.metadata_extractor import MetadataExtractor

logger = logging.getLogger(__name__)

_claims_parser = ClaimsParser()
_cpc_parser = CPCParser()
_ipc_parser = IPCParser()


class PatentNormalizer:
    """
    Converts any raw patent dict (from XML parser, API connector, or upload)
    into a UnifiedPatent with all sub-fields structured and validated.
    """

    async def normalize(self, raw: dict[str, Any]) -> UnifiedPatent:
        """Main entry point — always returns a UnifiedPatent."""
        # If it's already a UnifiedPatent, pass through
        if isinstance(raw, UnifiedPatent):
            return raw

        # ── Run metadata extraction on raw_text if present ──
        raw_text = raw.get("raw_text") or raw.get("full_text") or ""
        if raw_text and not raw.get("patent_number"):
            meta = MetadataExtractor()
            extracted = await meta.extract(raw_text, raw)
            for k, v in extracted.items():
                if v is not None and not raw.get(k):
                    raw[k] = v

        # ── Claims ──────────────────────────────────────────
        claims = await self._build_claims(raw, raw_text)

        # ── CPC ─────────────────────────────────────────────
        cpc = await self._build_cpc(raw, raw_text)

        # ── IPC ─────────────────────────────────────────────
        ipc = await self._build_ipc(raw, raw_text)

        # ── Citations ───────────────────────────────────────
        citations = await self._build_citations(raw, raw_text)

        # ── Inventors ───────────────────────────────────────
        inventors = self._build_inventors(raw)

        # ── Assignees ───────────────────────────────────────
        assignees = self._build_assignees(raw)

        # ── Status ──────────────────────────────────────────
        status = self._infer_status(raw)

        patent_number = str(raw.get("patent_number") or "").strip() or "UNKNOWN"

        return UnifiedPatent(
            patent_number=patent_number,
            kind_code=raw.get("kind_code"),
            country_code=raw.get("country_code") or patent_number[:2] if len(patent_number) >= 2 else None,
            application_number=raw.get("application_number"),
            title=str(raw.get("title") or "Untitled Patent").strip()[:1024],
            abstract=raw.get("abstract"),
            description=raw.get("description"),
            inventors=inventors,
            assignees=assignees,
            assignee=assignees[0].name if assignees else raw.get("assignee"),
            filing_date=self._clean_date(raw.get("filing_date")),
            publication_date=self._clean_date(raw.get("publication_date")),
            grant_date=self._clean_date(raw.get("grant_date")),
            priority_date=self._clean_date(raw.get("priority_date")),
            status=status,
            is_granted=status == "granted",
            cpc_classifications=cpc,
            ipc_classifications=ipc,
            claims=claims,
            claim_count=len(claims),
            independent_claim_count=sum(1 for c in claims if c.claim_type == "independent"),
            citations=citations,
            citation_count=len(citations),
            forward_citation_count=int(raw.get("forward_citation_count") or 0),
            source=raw.get("source") or "unknown",
            source_format=raw.get("source_format"),
            source_url=raw.get("source_url"),
            patent_metadata=raw.get("patent_metadata") or raw.get("metadata") or {},
        )

    # ── Sub-builders ─────────────────────────────────────

    async def _build_claims(self, raw: dict, raw_text: str) -> list[ClaimModel]:
        existing = raw.get("claims") or []
        if existing and isinstance(existing, list):
            if existing and isinstance(existing[0], dict):
                return await _claims_parser.parse_from_xml_elements(existing)
            if existing and isinstance(existing[0], ClaimModel):
                return existing
        if raw_text:
            return await _claims_parser.parse(raw_text)
        return []

    async def _build_cpc(self, raw: dict, raw_text: str) -> list[CPCClassification]:
        existing = raw.get("cpc_classifications") or []
        if existing:
            if all(isinstance(c, CPCClassification) for c in existing):
                return existing
            return await _cpc_parser.parse_from_dict_list(existing)
        if raw_text:
            return await _cpc_parser.parse_from_text(raw_text)
        return []

    async def _build_ipc(self, raw: dict, raw_text: str) -> list[IPCClassification]:
        existing = raw.get("ipc_classifications") or []
        if existing:
            if all(isinstance(c, IPCClassification) for c in existing):
                return existing
            return await _ipc_parser.parse_from_dict_list(existing)
        if raw_text:
            return await _ipc_parser.parse_from_text(raw_text)
        return []

    async def _build_citations(self, raw: dict, raw_text: str) -> list[CitationModel]:
        existing_raw = raw.get("citations") or []
        if existing_raw and all(isinstance(c, CitationModel) for c in existing_raw):
            return existing_raw
        # Convert legacy dicts
        citations: list[CitationModel] = []
        for c in existing_raw:
            if isinstance(c, dict):
                try:
                    citations.append(CitationModel(**{
                        k: v for k, v in c.items()
                        if k in CitationModel.model_fields
                    }))
                except Exception:
                    pass
        # Extract additional citations from raw text
        if raw_text:
            extractor = CitationExtractor()
            result = await extractor.extract(raw_text, [c.model_dump() for c in citations])
            for c_dict in result.get("citations") or []:
                if isinstance(c_dict, dict):
                    pat_num = c_dict.get("patent_number")
                    title = c_dict.get("title")
                    citation_type = c_dict.get("type", "patent")
                    if pat_num or title:
                        try:
                            citations.append(CitationModel(
                                patent_number=pat_num,
                                title=title,
                                category=c_dict.get("category", "cited"),
                                citation_type=citation_type,
                                country=c_dict.get("country"),
                            ))
                        except Exception:
                            pass
        return citations

    def _build_inventors(self, raw: dict) -> list[InventorModel]:
        existing = raw.get("inventors") or []
        if all(isinstance(i, InventorModel) for i in existing):
            return existing
        result: list[InventorModel] = []
        for inv in existing:
            if isinstance(inv, dict):
                name = inv.get("name") or ""
                if name:
                    try:
                        result.append(InventorModel(**{k: v for k, v in inv.items() if k in InventorModel.model_fields}))
                    except Exception:
                        result.append(InventorModel(name=name))
            elif isinstance(inv, str):
                result.append(InventorModel(name=inv))
        return result

    def _build_assignees(self, raw: dict) -> list[AssigneeModel]:
        existing = raw.get("assignees") or []
        if all(isinstance(a, AssigneeModel) for a in existing):
            return existing
        result: list[AssigneeModel] = []
        for ass in existing:
            if isinstance(ass, dict):
                name = ass.get("name") or ""
                if name:
                    try:
                        result.append(AssigneeModel(**{k: v for k, v in ass.items() if k in AssigneeModel.model_fields}))
                    except Exception:
                        result.append(AssigneeModel(name=name))
        # Single assignee field fallback
        if not result and raw.get("assignee"):
            result.append(AssigneeModel(name=raw["assignee"], type="organization"))
        return result

    def _infer_status(self, raw: dict) -> str:
        status = raw.get("status") or ""
        status_lower = status.lower()
        if status_lower in ("granted", "published", "pending", "expired", "withdrawn", "revoked"):
            return status_lower
        if raw.get("is_granted") or status_lower in ("grant", "b1", "b2"):
            return "granted"
        if status_lower in ("a1", "a2", "published", "pub"):
            return "published"
        return "unknown"

    @staticmethod
    def _clean_date(val: Any) -> str | None:
        if not val:
            return None
        s = str(val).strip()
        if not s or s in ("None", "null", ""):
            return None
        # Convert YYYYMMDD → YYYY-MM-DD
        import re
        if re.match(r'^\d{8}$', s):
            return f"{s[:4]}-{s[4:6]}-{s[6:]}"
        return s
