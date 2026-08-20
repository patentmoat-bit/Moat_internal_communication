"""
Base connector interface. All source connectors extend this.
"""
from __future__ import annotations

import logging
from abc import ABC, abstractmethod

import httpx

from app.schemas.unified_patent import UnifiedPatent

logger = logging.getLogger(__name__)


class BasePatentConnector(ABC):
    """Abstract base class for all patent data source connectors."""

    def __init__(self, base_url: str, timeout: int = 30) -> None:
        self.base_url = base_url
        self.timeout = timeout

    # ── Core interface ─────────────────────────────────────

    @abstractmethod
    async def search(self, query: str, limit: int = 20) -> list[UnifiedPatent]:
        """Full-text or keyword search returning normalised patents."""
        ...

    @abstractmethod
    async def get_by_number(self, patent_number: str) -> UnifiedPatent | None:
        """Fetch a single patent by its number."""
        ...

    @abstractmethod
    async def get_recent(self, days: int = 7, limit: int = 50) -> list[UnifiedPatent]:
        """Fetch recently published/granted patents."""
        ...

    # ── Shared helpers ────────────────────────────────────

    async def _get(self, url: str, params: dict | None = None,
                   headers: dict | None = None) -> dict:
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.get(url, params=params, headers=headers or {})
            resp.raise_for_status()
            return resp.json()

    async def _post(self, url: str, json: dict | None = None,
                    headers: dict | None = None) -> dict:
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.post(url, json=json, headers=headers or {})
            resp.raise_for_status()
            return resp.json()


class PatentConnectorRegistry:
    """Registry that holds all active connectors."""

    def __init__(self) -> None:
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
        """Build the default registry with all configured connectors."""
        from app.config import settings
        from .uspto import USPTOConnector
        from .epo import EPOConnector
        from .wipo import WIPOConnector
        from .lens import LensConnector
        from .google_patents import GooglePatentsConnector

        registry = cls()
        registry.register("uspto", USPTOConnector())
        registry.register("epo", EPOConnector(
            consumer_key=getattr(settings, "EPO_CONSUMER_KEY", None),
            consumer_secret=getattr(settings, "EPO_CONSUMER_SECRET", None),
        ))
        registry.register("wipo", WIPOConnector())
        registry.register("lens", LensConnector(
            api_key=getattr(settings, "LENS_API_KEY", None),
        ))
        registry.register("google_patents", GooglePatentsConnector(
            serp_api_key=getattr(settings, "SERPAPI_KEY", None),
        ))
        return registry
