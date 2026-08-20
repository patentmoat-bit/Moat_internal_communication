import json
import logging
from abc import ABC, abstractmethod
from typing import Any
from urllib.parse import quote

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


class BasePatentConnector(ABC):
    def __init__(self, base_url: str, timeout: int = 30):
        self.base_url = base_url
        self.timeout = timeout

    @abstractmethod
    async def search(self, query: str, limit: int = 20) -> list[dict]:
        ...

    @abstractmethod
    async def get_by_number(self, patent_number: str) -> dict | None:
        ...

    @abstractmethod
    async def get_recent(self, days: int = 7, limit: int = 50) -> list[dict]:
        ...


class USPTOConnector(BasePatentConnector):
    BASE_URL = "https://api.uspto.gov/patent"

    def __init__(self, api_key: str | None = None):
        super().__init__(self.BASE_URL)
        self.api_key = api_key
        self.headers = {"Accept": "application/json"}
        if api_key:
            self.headers["X-API-Key"] = api_key

    async def search(self, query: str, limit: int = 20) -> list[dict]:
        url = f"{self.base_url}/search"
        params = {"q": query, "rows": min(limit, 100), "start": 0}
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                resp = await client.get(url, params=params, headers=self.headers)
                resp.raise_for_status()
                data = resp.json()
                return self._normalize_results(data)
            except Exception as e:
                logger.error(f"USPTO search failed: {e}")
                return []

    async def get_by_number(self, patent_number: str) -> dict | None:
        clean_number = patent_number.replace("US", "").strip()
        url = f"{self.base_url}/patents/{clean_number}"
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                resp = await client.get(url, headers=self.headers)
                resp.raise_for_status()
                data = resp.json()
                return self._normalize_patent(data)
            except Exception as e:
                logger.error(f"USPTO get_by_number {patent_number} failed: {e}")
                return None

    async def get_recent(self, days: int = 7, limit: int = 50) -> list[dict]:
        from datetime import datetime, timedelta
        date_from = (datetime.utcnow() - timedelta(days=days)).strftime("%Y-%m-%d")
        url = f"{self.base_url}/search"
        params = {
            "q": f"publicationDate:[{date_from} TO NOW]",
            "rows": min(limit, 100),
        }
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                resp = await client.get(url, params=params, headers=self.headers)
                resp.raise_for_status()
                data = resp.json()
                return self._normalize_results(data)
            except Exception as e:
                logger.error(f"USPTO get_recent failed: {e}")
                return []

    def _normalize_results(self, data: dict) -> list[dict]:
        results = []
        for item in data.get("results", []):
            results.append(self._normalize_patent(item))
        return results

    def _normalize_patent(self, item: dict) -> dict:
        return {
            "patent_number": f"US{item.get('patentNumber', '')}",
            "title": item.get("inventionTitle", ""),
            "abstract": item.get("abstract", ""),
            "inventors": [{"name": n} for n in item.get("inventors", [])],
            "assignee": item.get("assigneeEntityName"),
            "filing_date": item.get("filingDate"),
            "publication_date": item.get("publicationDate"),
            "status": "granted" if item.get("patentNumber") else "published",
            "source": "uspto",
            "source_format": "api",
        }


class EPOConnector(BasePatentConnector):
    BASE_URL = "https://ops.epo.org/3.2/rest-services"

    def __init__(self, consumer_key: str | None = None, consumer_secret: str | None = None):
        super().__init__(self.BASE_URL)
        self.consumer_key = consumer_key
        self.consumer_secret = consumer_secret
        self._token: str | None = None

    async def _get_token(self) -> str | None:
        if self._token:
            return self._token
        if not self.consumer_key:
            return None
        auth_url = "https://ops.epo.org/3.2/auth/accesstoken"
        async with httpx.AsyncClient() as client:
            try:
                resp = await client.post(
                    auth_url,
                    data={"grant_type": "client_credentials"},
                    auth=(self.consumer_key, self.consumer_secret or ""),
                )
                resp.raise_for_status()
                self._token = resp.json().get("access_token")
                return self._token
            except Exception as e:
                logger.error(f"EPO auth failed: {e}")
                return None

    async def search(self, query: str, limit: int = 20) -> list[dict]:
        url = f"{self.base_url}/published-data/search"
        params = {"q": query, "Range": f"1-{limit}"}
        headers = {"Accept": "application/json"}
        token = await self._get_token()
        if token:
            headers["Authorization"] = f"Bearer {token}"

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                resp = await client.get(url, params=params, headers=headers)
                resp.raise_for_status()
                data = resp.json()
                return self._normalize_results(data)
            except Exception as e:
                logger.error(f"EPO search failed: {e}")
                return []

    async def get_by_number(self, patent_number: str) -> dict | None:
        clean = patent_number.replace("EP", "").strip()
        url = f"{self.base_url}/published-data/publication/ep;doc-Number={clean}"
        headers = {"Accept": "application/json"}
        token = await self._get_token()
        if token:
            headers["Authorization"] = f"Bearer {token}"

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                resp = await client.get(url, headers=headers)
                resp.raise_for_status()
                data = resp.json()
                return self._normalize_patent(data)
            except Exception as e:
                logger.error(f"EPO get_by_number {patent_number} failed: {e}")
                return None

    async def get_recent(self, days: int = 7, limit: int = 50) -> list[dict]:
        from datetime import datetime, timedelta
        date_from = (datetime.utcnow() - timedelta(days=days)).strftime("%Y-%m-%d")
        return await self.search(f"publicationDate>={date_from}", limit)

    def _normalize_results(self, data: dict) -> list[dict]:
        results = []
        for item in data.get("ops:world-patent-data", {}).get("ops:search-result", {}).get("ops:query-result", {}).get("ops:search-results", []):
            results.append(self._normalize_patent(item))
        return results

    def _normalize_patent(self, item: dict) -> dict:
        bib = item.get("exchange-document", {}).get("bibliographic-data", {})
        return {
            "patent_number": f"EP{bib.get('publication-reference', {}).get('document-id', {}).get('doc-number', '')}",
            "title": bib.get("invention-title", {}).get("value", ""),
            "abstract": bib.get("abstract", {}).get("value", ""),
            "inventors": [{"name": p.get("name", {}).get("value", "")} for p in bib.get("parties", {}).get("inventors", [])],
            "assignee": bib.get("parties", {}).get("applicants", [{}])[0].get("name", {}).get("value"),
            "filing_date": bib.get("filing-date", {}).get("value"),
            "publication_date": bib.get("publication-reference", {}).get("document-id", {}).get("date"),
            "status": "granted",
            "source": "epo",
            "source_format": "api",
        }


class WIPOConnector(BasePatentConnector):
    BASE_URL = "https://patentscope.wipo.int/search/api"

    def __init__(self):
        super().__init__(self.BASE_URL)

    async def search(self, query: str, limit: int = 20) -> list[dict]:
        url = f"{self.base_url}/search"
        params = {"q": query, "ps": limit, "of": 0}
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                resp = await client.get(url, params=params)
                resp.raise_for_status()
                data = resp.json()
                return self._normalize_results(data)
            except Exception as e:
                logger.error(f"WIPO search failed: {e}")
                return []

    async def get_by_number(self, patent_number: str) -> dict | None:
        clean = patent_number.replace("WO", "").strip()
        url = f"{self.base_url}/published-data/{clean}"
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                resp = await client.get(url)
                resp.raise_for_status()
                data = resp.json()
                return self._normalize_patent(data)
            except Exception as e:
                logger.error(f"WIPO get_by_number {patent_number} failed: {e}")
                return None

    async def get_recent(self, days: int = 7, limit: int = 50) -> list[dict]:
        from datetime import datetime, timedelta
        date_from = (datetime.utcnow() - timedelta(days=days)).strftime("%Y-%m-%d")
        return await self.search(f"publicationDate>={date_from}", limit)

    def _normalize_results(self, data: dict) -> list[dict]:
        results = []
        for item in data.get("results", []):
            results.append(self._normalize_patent(item))
        return results

    def _normalize_patent(self, item: dict) -> dict:
        return {
            "patent_number": f"WO{item.get('woNumber', '')}",
            "title": item.get("title", ""),
            "abstract": item.get("abstract", ""),
            "inventors": [{"name": n} for n in item.get("inventors", [])],
            "assignee": item.get("applicant"),
            "filing_date": item.get("filingDate"),
            "publication_date": item.get("publicationDate"),
            "status": "published",
            "source": "wipo",
            "source_format": "api",
        }


class PatentsViewConnector(BasePatentConnector):
    BASE_URL = "https://api.patentsview.org"

    def __init__(self, api_key: str | None = None, base_url: str | None = None):
        super().__init__(base_url or self.BASE_URL)
        self.api_key = api_key or settings.PATENTSVIEW_API_KEY
        self.headers = {"Accept": "application/json"}
        if self.api_key:
            self.headers["X-Api-Key"] = self.api_key

    async def search(self, query: str, limit: int = 20) -> list[dict]:
        url = f"{self.base_url}/patents/query"
        payload = {
            "q": {
                "_or": [
                    {"_text_any": {"patent_title": query}},
                    {"_text_any": {"patent_abstract": query}}
                ]
            },
            "f": ["patent_number", "patent_title", "patent_abstract", "patent_date", "inventor_last_name", "inventor_first_name", "assignee_organization"],
            "o": {"per_page": min(limit, 100)}
        }
        
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                resp = await client.post(url, json=payload, headers=self.headers)
                if resp.status_code == 410 or (resp.status_code == 404 and self.base_url == self.BASE_URL):
                    logger.info("Legacy PatentsView endpoint returned 410/404, attempting search.patentsview.org")
                    new_url = "https://search.patentsview.org/api/v1/patent/query"
                    resp = await client.post(new_url, json=payload, headers=self.headers)
                
                resp.raise_for_status()
                data = resp.json()
                return self._normalize_results(data)
            except Exception as e:
                logger.error(f"PatentsView search failed: {e}")
                return []

    async def get_by_number(self, patent_number: str) -> dict | None:
        clean_number = patent_number.replace("US", "").strip()
        url = f"{self.base_url}/patents/query"
        payload = {
            "q": {"_eq": {"patent_number": clean_number}},
            "f": ["patent_number", "patent_title", "patent_abstract", "patent_date", "inventor_last_name", "inventor_first_name", "assignee_organization"],
            "o": {"per_page": 1}
        }
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                resp = await client.post(url, json=payload, headers=self.headers)
                if resp.status_code == 410 or (resp.status_code == 404 and self.base_url == self.BASE_URL):
                    new_url = "https://search.patentsview.org/api/v1/patent/query"
                    resp = await client.post(new_url, json=payload, headers=self.headers)
                resp.raise_for_status()
                data = resp.json()
                results = self._normalize_results(data)
                return results[0] if results else None
            except Exception as e:
                logger.error(f"PatentsView get_by_number {patent_number} failed: {e}")
                return None

    async def get_recent(self, days: int = 7, limit: int = 50) -> list[dict]:
        from datetime import datetime, timedelta
        date_from = (datetime.utcnow() - timedelta(days=days)).strftime("%Y-%m-%d")
        url = f"{self.base_url}/patents/query"
        payload = {
            "q": {"_gte": {"patent_date": date_from}},
            "f": ["patent_number", "patent_title", "patent_abstract", "patent_date", "inventor_last_name", "inventor_first_name", "assignee_organization"],
            "o": {"per_page": min(limit, 100)}
        }
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                resp = await client.post(url, json=payload, headers=self.headers)
                if resp.status_code == 410 or (resp.status_code == 404 and self.base_url == self.BASE_URL):
                    new_url = "https://search.patentsview.org/api/v1/patent/query"
                    resp = await client.post(new_url, json=payload, headers=self.headers)
                resp.raise_for_status()
                data = resp.json()
                return self._normalize_results(data)
            except Exception as e:
                logger.error(f"PatentsView get_recent failed: {e}")
                return []

    def _normalize_results(self, data: dict) -> list[dict]:
        results = []
        for item in data.get("patents", []):
            if item:
                results.append(self._normalize_patent(item))
        return results

    def _normalize_patent(self, item: dict) -> dict:
        raw_inventors = item.get("inventors", []) or []
        inventors = []
        for inv in raw_inventors:
            if inv:
                first = inv.get("inventor_first_name") or ""
                last = inv.get("inventor_last_name") or ""
                name = f"{first} {last}".strip()
                if name:
                    inventors.append({"name": name})
        
        if not inventors and (item.get("inventor_first_name") or item.get("inventor_last_name")):
            first = item.get("inventor_first_name") or ""
            last = item.get("inventor_last_name") or ""
            name = f"{first} {last}".strip()
            if name:
                inventors.append({"name": name})

        raw_assignees = item.get("assignees", []) or []
        assignee = None
        for ass in raw_assignees:
            if ass and ass.get("assignee_organization"):
                assignee = ass.get("assignee_organization")
                break
        if not assignee:
            assignee = item.get("assignee_organization")

        return {
            "patent_number": f"US{item.get('patent_number', '')}",
            "title": item.get("patent_title") or "",
            "abstract": item.get("patent_abstract") or "",
            "inventors": inventors,
            "assignee": assignee,
            "filing_date": item.get("patent_date"),
            "publication_date": item.get("patent_date"),
            "status": "granted",
            "source": "patentsview",
            "source_format": "api",
        }


class PatentConnectorRegistry:
    def __init__(self):
        self._connectors: dict[str, BasePatentConnector] = {}

    def register(self, name: str, connector: BasePatentConnector) -> None:
        self._connectors[name] = connector

    def get(self, name: str) -> BasePatentConnector | None:
        return self._connectors.get(name)

    def get_all(self) -> list[BasePatentConnector]:
        return list(self._connectors.values())

    def list_sources(self) -> list[str]:
        return list(self._connectors.keys())

    @classmethod
    def create_default(cls) -> "PatentConnectorRegistry":
        registry = cls()
        registry.register("uspto", USPTOConnector())
        registry.register("epo", EPOConnector())
        registry.register("wipo", WIPOConnector())
        registry.register("patentsview", PatentsViewConnector())
        return registry
