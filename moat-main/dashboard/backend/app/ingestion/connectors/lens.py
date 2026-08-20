"""
Lens.org connector.

Docs: https://docs.api.lens.org/
Free tier: 10,000 requests/month with free API key.
Sign up at: https://www.lens.org/lens/user/subscriptions#developer
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta

import httpx

from app.schemas.unified_patent import (
    UnifiedPatent, InventorModel, AssigneeModel,
    CPCClassification, IPCClassification, CitationModel, FamilyMemberModel,
)
from .base import BasePatentConnector

logger = logging.getLogger(__name__)

LENS_API_URL = "https://api.lens.org/patent/search"


class LensConnector(BasePatentConnector):
    """
    Lens.org is one of the most comprehensive free patent databases,
    covering USPTO, EPO, WIPO, CNIPA, and many others.
    Provides CPC, IPC, family data, and forward citations.
    """

    def __init__(self, api_key: str | None = None) -> None:
        super().__init__(LENS_API_URL)
        self.api_key = api_key
        self.headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}" if api_key else "",
        }

    async def search(self, query: str, limit: int = 20) -> list[UnifiedPatent]:
        payload = {
            "query": {"match": {"title": query}},
            "size": min(limit, 100),
            "include": self._include_fields(),
            "sort": [{"date_published": "desc"}],
        }
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.post(
                    self.base_url,
                    json=payload,
                    headers=self.headers,
                )
                resp.raise_for_status()
                data = resp.json()
            return [self._normalise(r) for r in data.get("data", [])]
        except Exception as e:
            logger.error(f"Lens search failed (key configured: {bool(self.api_key)}): {e}")
            return []

    async def search_advanced(self, query_body: dict, limit: int = 20) -> list[UnifiedPatent]:
        """Full Lens query DSL for power users."""
        payload = {
            **query_body,
            "size": min(limit, 100),
            "include": self._include_fields(),
        }
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.post(self.base_url, json=payload, headers=self.headers)
                resp.raise_for_status()
                data = resp.json()
            return [self._normalise(r) for r in data.get("data", [])]
        except Exception as e:
            logger.error(f"Lens advanced search failed: {e}")
            return []

    async def get_by_number(self, patent_number: str) -> UnifiedPatent | None:
        # Lens uses lens_id OR patent_number in query
        payload = {
            "query": {"match": {"publication_number": patent_number}},
            "size": 1,
            "include": self._include_fields(),
        }
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.post(self.base_url, json=payload, headers=self.headers)
                resp.raise_for_status()
                data = resp.json()
            results = data.get("data", [])
            return self._normalise(results[0]) if results else None
        except Exception as e:
            logger.error(f"Lens get_by_number {patent_number} failed: {e}")
            return None

    async def get_recent(self, days: int = 7, limit: int = 50) -> list[UnifiedPatent]:
        date_from = (datetime.utcnow() - timedelta(days=days)).strftime("%Y-%m-%d")
        payload = {
            "query": {
                "range": {"date_published": {"gte": date_from}}
            },
            "size": min(limit, 100),
            "include": self._include_fields(),
            "sort": [{"date_published": "desc"}],
        }
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.post(self.base_url, json=payload, headers=self.headers)
                resp.raise_for_status()
                data = resp.json()
            return [self._normalise(r) for r in data.get("data", [])]
        except Exception as e:
            logger.error(f"Lens get_recent failed: {e}")
            return []

    def _include_fields(self) -> list[str]:
        return [
            "lens_id", "publication_number", "jurisdiction",
            "kind", "date_published", "title", "abstract",
            "inventors", "applicants", "assignees",
            "classifications_cpc", "classifications_ipc",
            "claims", "biblio", "families",
            "references_cited", "npl_citations",
            "application_reference", "priority_claims",
        ]

    def _normalise(self, item: dict) -> UnifiedPatent:
        pub_num = item.get("publication_number") or ""
        jurisdiction = item.get("jurisdiction") or ""
        kind = item.get("kind") or ""
        patent_number = pub_num or f"{jurisdiction}_UNKNOWN"

        # Title
        title_data = item.get("title") or ""
        if isinstance(title_data, list):
            en = next((t.get("text") for t in title_data if t.get("lang") == "en"), None)
            title_data = en or (title_data[0].get("text") if title_data else "")

        # Abstract
        abstract_data = item.get("abstract") or ""
        if isinstance(abstract_data, list):
            en = next((a.get("text") for a in abstract_data if a.get("lang") == "en"), None)
            abstract_data = en or (abstract_data[0].get("text") if abstract_data else "")

        # Inventors
        inventors: list[InventorModel] = []
        for inv in item.get("inventors") or []:
            name = inv.get("name") or ""
            if name:
                inventors.append(InventorModel(name=name))

        # Assignees
        assignees: list[AssigneeModel] = []
        for ass in item.get("assignees") or item.get("applicants") or []:
            name = ass.get("name") or ""
            if name:
                assignees.append(AssigneeModel(
                    name=name,
                    type="organization" if ass.get("type") == "organisation" else "person",
                    country=ass.get("country"),
                ))

        # CPC
        cpc_list: list[CPCClassification] = []
        for cpc in item.get("classifications_cpc") or []:
            symbol = cpc.get("symbol") or cpc if isinstance(cpc, str) else ""
            if symbol:
                cpc_list.append(CPCClassification(
                    symbol=symbol,
                    section=symbol[0] if symbol else None,
                ))

        # IPC
        ipc_list: list[IPCClassification] = []
        for ipc in item.get("classifications_ipc") or []:
            symbol = ipc.get("symbol") or ipc if isinstance(ipc, str) else ""
            if symbol:
                ipc_list.append(IPCClassification(
                    symbol=symbol,
                    section=symbol[0] if symbol else None,
                ))

        # Citations
        citations: list[CitationModel] = []
        for ref in item.get("references_cited") or []:
            num = ref.get("patent_citation", {}).get("pub_key") or ""
            if num:
                citations.append(CitationModel(
                    patent_number=num,
                    category="cited",
                    citation_type="patent",
                ))
        for npl in item.get("npl_citations") or []:
            title_npl = npl.get("text") or npl.get("title") or ""
            if title_npl:
                citations.append(CitationModel(
                    title=title_npl[:512],
                    category="cited",
                    citation_type="npl",
                ))

        # Family members
        family: list[FamilyMemberModel] = []
        family_id: str | None = None
        for fam in item.get("families") or []:
            fid = fam.get("family_id")
            if fid and not family_id:
                family_id = str(fid)
            for member in fam.get("members") or []:
                num = member.get("publication_number") or ""
                if num:
                    family.append(FamilyMemberModel(
                        patent_number=num,
                        country=member.get("jurisdiction"),
                        kind_code=member.get("kind"),
                        publication_date=member.get("date_published"),
                    ))

        return UnifiedPatent(
            patent_number=patent_number,
            kind_code=kind or None,
            country_code=jurisdiction or None,
            title=title_data or f"Patent {patent_number}",
            abstract=abstract_data or None,
            inventors=inventors,
            assignees=assignees,
            assignee=assignees[0].name if assignees else None,
            publication_date=item.get("date_published"),
            status="granted" if kind and kind.upper().startswith("B") else "published",
            is_granted=bool(kind and kind.upper().startswith("B")),
            cpc_classifications=cpc_list,
            ipc_classifications=ipc_list,
            citations=citations,
            citation_count=len(citations),
            family_members=family,
            family_id=family_id,
            source="lens",
            source_format="lens_api",
            source_url=f"https://lens.org/lens/patent/{item.get('lens_id', '')}",
            patent_metadata={"lens_id": item.get("lens_id")},
        )
