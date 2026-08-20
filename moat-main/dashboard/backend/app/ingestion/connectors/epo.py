"""
EPO Open Patent Services (OPS) connector.

Docs: https://developers.epo.org/ops-v3-2/apis
Free tier: 4 requests/second, 10,000/week (no key required).
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta

import httpx

from app.schemas.unified_patent import (
    UnifiedPatent, InventorModel, AssigneeModel, CitationModel,
    CPCClassification, IPCClassification,
)
from .base import BasePatentConnector

logger = logging.getLogger(__name__)


class EPOConnector(BasePatentConnector):
    BASE_URL = "https://ops.epo.org/3.2/rest-services"
    AUTH_URL = "https://ops.epo.org/3.2/auth/accesstoken"

    def __init__(
        self,
        consumer_key: str | None = None,
        consumer_secret: str | None = None,
    ) -> None:
        super().__init__(self.BASE_URL)
        self.consumer_key = consumer_key
        self.consumer_secret = consumer_secret
        self._token: str | None = None

    async def _get_token(self) -> str | None:
        if self._token:
            return self._token
        if not self.consumer_key:
            return None
        async with httpx.AsyncClient() as client:
            try:
                resp = await client.post(
                    self.AUTH_URL,
                    data={"grant_type": "client_credentials"},
                    auth=(self.consumer_key, self.consumer_secret or ""),
                )
                resp.raise_for_status()
                self._token = resp.json().get("access_token")
                return self._token
            except Exception as e:
                logger.error(f"EPO auth failed: {e}")
                return None

    async def _headers(self) -> dict[str, str]:
        h = {"Accept": "application/json"}
        token = await self._get_token()
        if token:
            h["Authorization"] = f"Bearer {token}"
        return h

    async def search(self, query: str, limit: int = 20) -> list[UnifiedPatent]:
        url = f"{self.base_url}/published-data/search/biblio"
        params = {"q": query, "Range": f"1-{min(limit, 100)}"}
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.get(url, params=params, headers=await self._headers())
                resp.raise_for_status()
                data = resp.json()
            return self._parse_search(data)
        except Exception as e:
            logger.error(f"EPO search failed: {e}")
            return []

    async def get_by_number(self, patent_number: str) -> UnifiedPatent | None:
        clean = patent_number.replace("EP", "").strip()
        url = f"{self.base_url}/published-data/publication/epodoc/EP{clean}/biblio"
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.get(url, headers=await self._headers())
                resp.raise_for_status()
                data = resp.json()
            docs = self._extract_exchange_docs(data)
            return self._normalise(docs[0]) if docs else None
        except Exception as e:
            logger.error(f"EPO get_by_number {patent_number} failed: {e}")
            return None

    async def get_recent(self, days: int = 7, limit: int = 50) -> list[UnifiedPatent]:
        date_from = (datetime.utcnow() - timedelta(days=days)).strftime("%Y%m%d")
        return await self.search(f"pd>={date_from}", limit)

    # ── Parsers ──────────────────────────────────────────

    def _parse_search(self, data: dict) -> list[UnifiedPatent]:
        results: list[UnifiedPatent] = []
        world_data = data.get("ops:world-patent-data", {})
        search_result = world_data.get("ops:search-result", {})
        entries = search_result.get("ops:publication-reference", [])
        if isinstance(entries, dict):
            entries = [entries]
        for entry in entries:
            try:
                doc = entry.get("exchange-document") or entry
                results.append(self._normalise(doc))
            except Exception:
                continue
        return results

    def _extract_exchange_docs(self, data: dict) -> list[dict]:
        world_data = data.get("ops:world-patent-data", {})
        exchange_docs = world_data.get("exchange-documents", {}).get("exchange-document", [])
        if isinstance(exchange_docs, dict):
            exchange_docs = [exchange_docs]
        return exchange_docs

    def _normalise(self, doc: dict) -> UnifiedPatent:
        bib = doc.get("bibliographic-data", {})

        # Patent number
        pub_ref = bib.get("publication-reference", {})
        doc_id = pub_ref.get("document-id", {})
        if isinstance(doc_id, list):
            doc_id = next((d for d in doc_id if d.get("@document-id-type") == "epodoc"), doc_id[0] if doc_id else {})
        country = doc_id.get("country", {}).get("$", "EP") if isinstance(doc_id.get("country"), dict) else str(doc_id.get("country", "EP"))
        num = doc_id.get("doc-number", {}).get("$", "") if isinstance(doc_id.get("doc-number"), dict) else str(doc_id.get("doc-number", ""))
        kind = doc_id.get("kind", {}).get("$", "") if isinstance(doc_id.get("kind"), dict) else str(doc_id.get("kind", ""))
        patent_number = f"{country}{num}"

        # Title
        title_data = bib.get("invention-title", {})
        if isinstance(title_data, list):
            title_data = next((t for t in title_data if t.get("@lang") == "en"), title_data[0] if title_data else {})
        title = (title_data.get("$") or title_data.get("#text") or "") if isinstance(title_data, dict) else str(title_data or "")

        # Dates
        filing_ref = bib.get("application-reference", {}).get("document-id", {})
        if isinstance(filing_ref, list):
            filing_ref = filing_ref[0] if filing_ref else {}
        filing_raw = filing_ref.get("date", {})
        filing_date = (filing_raw.get("$") if isinstance(filing_raw, dict) else str(filing_raw or "")) or None

        pub_date_raw = doc_id.get("date", {})
        pub_date = (pub_date_raw.get("$") if isinstance(pub_date_raw, dict) else str(pub_date_raw or "")) or None

        # Format dates: YYYYMMDD → YYYY-MM-DD
        def fmt(d: str | None) -> str | None:
            if d and len(d) == 8 and d.isdigit():
                return f"{d[:4]}-{d[4:6]}-{d[6:]}"
            return d

        # Parties
        parties = bib.get("parties", {})
        inventors: list[InventorModel] = []
        for inv in (parties.get("inventors", {}).get("inventor", []) or []):
            if isinstance(inv, dict):
                name_data = inv.get("inventor-name", {}).get("name", {})
                name = (name_data.get("$") if isinstance(name_data, dict) else str(name_data)) or ""
                if name:
                    inventors.append(InventorModel(name=name))

        assignees: list[AssigneeModel] = []
        for app in (parties.get("applicants", {}).get("applicant", []) or []):
            if isinstance(app, dict):
                name_data = app.get("applicant-name", {}).get("name", {})
                name = (name_data.get("$") if isinstance(name_data, dict) else str(name_data)) or ""
                if name:
                    assignees.append(AssigneeModel(name=name, type="organization"))

        # CPC
        cpc_list: list[CPCClassification] = []
        for cpc in (bib.get("classification-ipc", {}).get("text", "") or "").split():
            if cpc:
                cpc_list.append(CPCClassification(symbol=cpc, section=cpc[0] if cpc else None))

        return UnifiedPatent(
            patent_number=patent_number,
            kind_code=kind or None,
            country_code=country,
            title=title or f"Patent {patent_number}",
            inventors=inventors,
            assignees=assignees,
            assignee=assignees[0].name if assignees else None,
            filing_date=fmt(filing_date),
            publication_date=fmt(pub_date),
            status="granted" if kind and kind.startswith("B") else "published",
            is_granted=bool(kind and kind.startswith("B")),
            cpc_classifications=cpc_list,
            source="epo",
            source_format="ops_api",
            source_url=f"https://worldwide.espacenet.com/patent/search/family/{patent_number}/",
        )
