"""
Google Patents connector.

Uses SerpAPI's Google Patents endpoint (https://serpapi.com/google-patents-api).
Falls back to scraping the public Google Patents search page if no key is provided.

Sign up: https://serpapi.com/ (100 free searches/month on free plan).
"""
from __future__ import annotations

import logging
import re
from datetime import datetime, timedelta

import httpx

from app.schemas.unified_patent import (
    UnifiedPatent, InventorModel, AssigneeModel,
    CPCClassification, IPCClassification,
)
from .base import BasePatentConnector

logger = logging.getLogger(__name__)

SERPAPI_URL = "https://serpapi.com/search.json"
GOOGLE_PATENTS_URL = "https://patents.google.com/xhr/query"


class GooglePatentsConnector(BasePatentConnector):
    """
    Google Patents connector.

    Priority order:
    1. SerpAPI (reliable, structured JSON) — requires API key
    2. Google Patents public XHR endpoint (no key, rate-limited)
    """

    def __init__(self, serp_api_key: str | None = None) -> None:
        super().__init__(GOOGLE_PATENTS_URL)
        self.serp_api_key = serp_api_key

    async def search(self, query: str, limit: int = 20) -> list[UnifiedPatent]:
        if self.serp_api_key:
            return await self._search_serpapi(query, limit)
        return await self._search_public(query, limit)

    async def get_by_number(self, patent_number: str) -> UnifiedPatent | None:
        """Fetch patent detail via Google Patents public API."""
        clean = patent_number.replace(" ", "").upper()
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.get(
                    f"https://patents.google.com/patent/{clean}/en",
                    headers={"User-Agent": "Mozilla/5.0 (compatible; PatentBot/1.0)"},
                    follow_redirects=True,
                )
                if resp.status_code == 200:
                    return self._parse_html_patent(resp.text, patent_number)
        except Exception as e:
            logger.error(f"Google Patents get_by_number {patent_number} failed: {e}")
        return None

    async def get_recent(self, days: int = 7, limit: int = 50) -> list[UnifiedPatent]:
        date_from = (datetime.utcnow() - timedelta(days=days)).strftime("%Y%m%d")
        return await self.search(f"after:{date_from}", limit)

    # ── SerpAPI backend ────────────────────────────────────

    async def _search_serpapi(self, query: str, limit: int) -> list[UnifiedPatent]:
        params = {
            "engine": "google_patents",
            "q": query,
            "api_key": self.serp_api_key,
            "num": min(limit, 100),
        }
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.get(SERPAPI_URL, params=params)
                resp.raise_for_status()
                data = resp.json()
            results = data.get("organic_results") or []
            return [self._normalise_serpapi(r) for r in results[:limit]]
        except Exception as e:
            logger.error(f"SerpAPI Google Patents search failed: {e}")
            return []

    def _normalise_serpapi(self, item: dict) -> UnifiedPatent:
        patent_id = item.get("patent_id") or item.get("id") or ""
        # Extract country code prefix
        match = re.match(r"^([A-Z]{2,3})", patent_id)
        country = match.group(1) if match else "US"

        # Inventors / assignees
        inventors = [
            InventorModel(name=n.strip())
            for n in (item.get("inventor") or "").split(",")
            if n.strip()
        ]
        assignees = [AssigneeModel(name=item["assignee"], type="organization")] \
            if item.get("assignee") else []

        # CPC from serpapi snippet
        cpc_list: list[CPCClassification] = []
        for cpc_raw in item.get("cpc", []):
            symbol = cpc_raw if isinstance(cpc_raw, str) else cpc_raw.get("code", "")
            if symbol:
                cpc_list.append(CPCClassification(
                    symbol=symbol,
                    section=symbol[0] if symbol else None,
                ))

        return UnifiedPatent(
            patent_number=patent_id,
            country_code=country,
            title=item.get("title") or "",
            abstract=item.get("snippet") or item.get("abstract"),
            inventors=inventors,
            assignees=assignees,
            assignee=assignees[0].name if assignees else None,
            filing_date=item.get("filing_date"),
            publication_date=item.get("publication_date") or item.get("date"),
            grant_date=item.get("grant_date"),
            status="granted" if item.get("grant_date") else "published",
            is_granted=bool(item.get("grant_date")),
            cpc_classifications=cpc_list,
            source="google_patents",
            source_format="serpapi",
            source_url=item.get("pdf") or f"https://patents.google.com/patent/{patent_id}",
        )

    # ── Public XHR fallback ───────────────────────────────

    async def _search_public(self, query: str, limit: int) -> list[UnifiedPatent]:
        """
        Hits the undocumented Google Patents XHR endpoint.
        Rate limited — use only as fallback.
        """
        params = {
            "url": f"q={query}&num={min(limit, 10)}",
            "exp": "",
        }
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.get(
                    GOOGLE_PATENTS_URL,
                    params=params,
                    headers={
                        "User-Agent": "Mozilla/5.0 (compatible; PatentBot/1.0)",
                        "Accept": "application/json",
                    },
                )
                resp.raise_for_status()
                data = resp.json()
            results = data.get("results", {}).get("cluster", [])
            patents: list[UnifiedPatent] = []
            for cluster in results:
                for hit in cluster.get("result", []):
                    patent_data = hit.get("patent") or {}
                    if patent_data:
                        patents.append(self._normalise_public(patent_data))
            return patents[:limit]
        except Exception as e:
            logger.warning(f"Google Patents public search failed: {e}")
            return []

    def _normalise_public(self, item: dict) -> UnifiedPatent:
        patent_number = item.get("publication_number") or item.get("patent_number") or ""
        country = patent_number[:2] if len(patent_number) >= 2 else "US"

        inventors = [
            InventorModel(name=n.strip())
            for n in (item.get("inventor") or "").split(";")
            if n.strip()
        ]
        assignees = [AssigneeModel(name=item["assignee"], type="organization")] \
            if item.get("assignee") else []

        return UnifiedPatent(
            patent_number=patent_number,
            country_code=country,
            title=item.get("title") or "",
            abstract=item.get("abstract"),
            inventors=inventors,
            assignees=assignees,
            assignee=assignees[0].name if assignees else None,
            filing_date=item.get("filing_date"),
            publication_date=item.get("publication_date"),
            grant_date=item.get("grant_date"),
            status="granted" if item.get("grant_date") else "published",
            is_granted=bool(item.get("grant_date")),
            source="google_patents",
            source_format="public_xhr",
            source_url=f"https://patents.google.com/patent/{patent_number}",
        )

    # ── HTML scraping helper (get_by_number fallback) ─────

    def _parse_html_patent(self, html: str, patent_number: str) -> UnifiedPatent:
        """Extract minimal data from Google Patents HTML page."""
        title = ""
        title_m = re.search(r'<title>([^<]+)</title>', html)
        if title_m:
            title = title_m.group(1).replace(" - Google Patents", "").strip()

        abstract = ""
        abs_m = re.search(r'class="abstract"[^>]*>(.+?)</div>', html, re.DOTALL)
        if abs_m:
            abstract = re.sub(r'<[^>]+>', '', abs_m.group(1)).strip()

        return UnifiedPatent(
            patent_number=patent_number,
            title=title or f"Patent {patent_number}",
            abstract=abstract or None,
            source="google_patents",
            source_format="html_scrape",
            source_url=f"https://patents.google.com/patent/{patent_number}",
        )
