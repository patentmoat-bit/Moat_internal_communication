"""
WIPO PATENTSCOPE connector.

Docs: https://www.wipo.int/patentscope/search/en/help.jsf
Public REST API (no key required for basic search).
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta

import httpx

from app.schemas.unified_patent import (
    UnifiedPatent, InventorModel, AssigneeModel,
    CPCClassification, IPCClassification, CitationModel,
)
from .base import BasePatentConnector

logger = logging.getLogger(__name__)


class WIPOConnector(BasePatentConnector):
    BASE_URL = "https://patentscope.wipo.int/search/en"
    API_URL = "https://patentscope.wipo.int/search/api"

    def __init__(self) -> None:
        super().__init__(self.API_URL)

    async def search(self, query: str, limit: int = 20) -> list[UnifiedPatent]:
        url = f"{self.base_url}/results.jsf"
        params = {"query": query, "office": "WIPO", "showDocType": "ALL", "maxRec": limit}
        # Try PATENTSCOPE public search endpoint
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.get(
                    f"{self.API_URL}/search",
                    params={"q": query, "ps": min(limit, 100), "of": 0},
                    headers={"Accept": "application/json"},
                )
                resp.raise_for_status()
                data = resp.json()
            return [self._normalise(r) for r in data.get("results", [])]
        except Exception as e:
            logger.error(f"WIPO search failed: {e}")
            return []

    async def get_by_number(self, patent_number: str) -> UnifiedPatent | None:
        clean = patent_number.replace("WO", "").strip()
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.get(
                    f"{self.API_URL}/published-data/{clean}",
                    headers={"Accept": "application/json"},
                )
                resp.raise_for_status()
                data = resp.json()
            return self._normalise(data)
        except Exception as e:
            logger.error(f"WIPO get_by_number {patent_number} failed: {e}")
            return None

    async def get_recent(self, days: int = 7, limit: int = 50) -> list[UnifiedPatent]:
        date_from = (datetime.utcnow() - timedelta(days=days)).strftime("%Y%m%d")
        return await self.search(f"PD>={date_from}", limit)

    def _normalise(self, item: dict) -> UnifiedPatent:
        wo_num = item.get("woNumber") or item.get("wo_number") or ""
        patent_number = f"WO{wo_num}" if wo_num else "WO_UNKNOWN"

        # Extract inventors/applicants
        inventors: list[InventorModel] = []
        for inv in item.get("inventors", []):
            name = inv if isinstance(inv, str) else inv.get("name", "")
            if name:
                inventors.append(InventorModel(name=name))

        applicant = item.get("applicant") or item.get("applicantName")
        assignees: list[AssigneeModel] = []
        if applicant:
            assignees.append(AssigneeModel(name=applicant, type="organization"))

        # Classifications
        cpc_list: list[CPCClassification] = []
        for symbol in item.get("cpc", []):
            if symbol:
                cpc_list.append(CPCClassification(symbol=symbol, section=symbol[0] if symbol else None))

        ipc_list: list[IPCClassification] = []
        for symbol in item.get("ipc", []):
            if symbol:
                ipc_list.append(IPCClassification(symbol=symbol, section=symbol[0] if symbol else None))

        pub_date = item.get("publicationDate") or item.get("publication_date")
        filing_date = item.get("filingDate") or item.get("filing_date")

        return UnifiedPatent(
            patent_number=patent_number,
            country_code="WO",
            title=item.get("title") or item.get("titleEn") or "",
            abstract=item.get("abstract") or item.get("abstractEn"),
            inventors=inventors,
            assignees=assignees,
            assignee=assignees[0].name if assignees else applicant,
            filing_date=filing_date,
            publication_date=pub_date,
            status="published",
            cpc_classifications=cpc_list,
            ipc_classifications=ipc_list,
            source="wipo",
            source_format="patentscope_api",
            source_url=f"https://patentscope.wipo.int/search/en/detail.jsf?docId={patent_number}",
        )
