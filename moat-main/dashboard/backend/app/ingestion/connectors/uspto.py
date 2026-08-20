"""
USPTO Open Data API connector.

Docs: https://developer.uspto.gov/api-catalog/patent-examination-data-system
Uses: PatentsView API (search.patentsview.org) for reliable bulk access.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta

import httpx

from app.schemas.unified_patent import (
    UnifiedPatent, InventorModel, AssigneeModel,
    CitationModel, CPCClassification,
)
from .base import BasePatentConnector

logger = logging.getLogger(__name__)

# PatentsView is the official USPTO-backed query API with Open Data
PATENTSVIEW_BASE = "https://search.patentsview.org/api/v1"

# USPTO Open Data API (for individual patents + full-text)
USPTO_OPEN_API = "https://api.uspto.gov/api/v1"


class USPTOConnector(BasePatentConnector):
    BASE_URL = PATENTSVIEW_BASE

    PATENT_FIELDS = [
        "patent_id", "patent_number", "patent_title", "patent_abstract",
        "patent_date", "patent_type", "patent_kind",
        "patent_num_claims", "patent_num_cited_by_us_patents",
        "inventor_first_name", "inventor_last_name", "inventor_country",
        "assignee_organization", "assignee_individual_name_first",
        "assignee_individual_name_last", "assignee_country",
        "cpc_section_id", "cpc_subsection_id", "cpc_group_id", "cpc_subgroup_id",
        "ipc_section", "ipc_class", "ipc_subclass", "ipc_main_group", "ipc_subgroup",
        "cited_patent_number", "cited_patent_date",
        "application_number", "app_date",
    ]

    def __init__(self, api_key: str | None = None) -> None:
        super().__init__(self.BASE_URL)
        self.api_key = api_key
        self.headers: dict[str, str] = {
            "Accept": "application/json",
            "X-Api-Key": api_key or "",
        }

    async def search(self, query: str, limit: int = 20) -> list[UnifiedPatent]:
        payload = {
            "q": {"_or": [
                {"_text_any": {"patent_title": query}},
                {"_text_any": {"patent_abstract": query}},
            ]},
            "f": self.PATENT_FIELDS,
            "o": {"per_page": min(limit, 100), "page": 1},
            "s": [{"patent_date": "desc"}],
        }
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.post(
                    f"{self.base_url}/patent/query",
                    json=payload,
                    headers=self.headers,
                )
                resp.raise_for_status()
                data = resp.json()
            return [self._normalise(p) for p in data.get("patents", []) or []]
        except Exception as e:
            logger.error(f"USPTO search failed: {e}")
            return []

    async def get_by_number(self, patent_number: str) -> UnifiedPatent | None:
        clean = patent_number.replace("US", "").strip()
        payload = {
            "q": {"_eq": {"patent_number": clean}},
            "f": self.PATENT_FIELDS,
            "o": {"per_page": 1},
        }
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.post(
                    f"{self.base_url}/patent/query",
                    json=payload,
                    headers=self.headers,
                )
                resp.raise_for_status()
                data = resp.json()
            patents = data.get("patents") or []
            return self._normalise(patents[0]) if patents else None
        except Exception as e:
            logger.error(f"USPTO get_by_number {patent_number} failed: {e}")
            return None

    async def get_recent(self, days: int = 7, limit: int = 50) -> list[UnifiedPatent]:
        date_from = (datetime.utcnow() - timedelta(days=days)).strftime("%Y-%m-%d")
        payload = {
            "q": {"_gte": {"patent_date": date_from}},
            "f": self.PATENT_FIELDS,
            "o": {"per_page": min(limit, 100), "page": 1},
            "s": [{"patent_date": "desc"}],
        }
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.post(
                    f"{self.base_url}/patent/query",
                    json=payload,
                    headers=self.headers,
                )
                resp.raise_for_status()
                data = resp.json()
            return [self._normalise(p) for p in data.get("patents", []) or []]
        except Exception as e:
            logger.error(f"USPTO get_recent failed: {e}")
            return []

    # ── Normaliser ───────────────────────────────────────

    def _normalise(self, item: dict) -> UnifiedPatent:
        pat_num = item.get("patent_number") or ""

        # Inventors
        inventors: list[InventorModel] = []
        raw_inv = item.get("inventors") or []
        if raw_inv:
            for inv in raw_inv:
                first = inv.get("inventor_first_name") or ""
                last = inv.get("inventor_last_name") or ""
                name = f"{first} {last}".strip()
                if name:
                    inventors.append(InventorModel(
                        name=name, first_name=first, last_name=last,
                        country=inv.get("inventor_country"),
                    ))
        elif item.get("inventor_first_name") or item.get("inventor_last_name"):
            first = item.get("inventor_first_name") or ""
            last = item.get("inventor_last_name") or ""
            name = f"{first} {last}".strip()
            if name:
                inventors.append(InventorModel(name=name, first_name=first, last_name=last))

        # Assignees
        assignees: list[AssigneeModel] = []
        raw_ass = item.get("assignees") or []
        if raw_ass:
            for ass in raw_ass:
                org = ass.get("assignee_organization")
                first = ass.get("assignee_individual_name_first", "")
                last = ass.get("assignee_individual_name_last", "")
                name = org or f"{first} {last}".strip()
                if name:
                    assignees.append(AssigneeModel(
                        name=name,
                        type="organization" if org else "person",
                        country=ass.get("assignee_country"),
                    ))
        elif item.get("assignee_organization"):
            assignees.append(AssigneeModel(
                name=item["assignee_organization"], type="organization",
            ))

        # CPC
        cpc_list: list[CPCClassification] = []
        raw_cpc = item.get("cpcs") or []
        for cpc in raw_cpc:
            symbol = "".join(filter(None, [
                cpc.get("cpc_section_id"),
                cpc.get("cpc_subsection_id"),
                cpc.get("cpc_group_id"),
                "/" if cpc.get("cpc_subgroup_id") else "",
                cpc.get("cpc_subgroup_id", ""),
            ]))
            if symbol:
                cpc_list.append(CPCClassification(
                    symbol=symbol,
                    section=cpc.get("cpc_section_id"),
                    cls=cpc.get("cpc_subsection_id", "")[:2] if cpc.get("cpc_subsection_id") else None,
                    subclass=cpc.get("cpc_subsection_id", "")[-1] if cpc.get("cpc_subsection_id") else None,
                    group=cpc.get("cpc_group_id"),
                ))

        # Citations
        citations: list[CitationModel] = []
        for cited in item.get("cited_patents") or []:
            num = cited.get("cited_patent_number")
            if num:
                citations.append(CitationModel(
                    patent_number=f"US{num}",
                    country="US",
                    category="cited",
                    citation_type="patent",
                    date=cited.get("cited_patent_date"),
                ))

        claim_count = int(item.get("patent_num_claims") or 0)
        forward_count = int(item.get("patent_num_cited_by_us_patents") or 0)

        return UnifiedPatent(
            patent_number=f"US{pat_num}",
            kind_code=item.get("patent_kind"),
            country_code="US",
            application_number=item.get("application_number"),
            title=item.get("patent_title") or "",
            abstract=item.get("patent_abstract"),
            inventors=inventors,
            assignees=assignees,
            assignee=assignees[0].name if assignees else None,
            filing_date=item.get("app_date") or item.get("patent_date"),
            publication_date=item.get("patent_date"),
            status="granted" if item.get("patent_type") == "utility" else "published",
            is_granted=True,
            cpc_classifications=cpc_list,
            citations=citations,
            claim_count=claim_count,
            citation_count=len(citations),
            forward_citation_count=forward_count,
            source="uspto",
            source_format="patentsview_api",
        )
