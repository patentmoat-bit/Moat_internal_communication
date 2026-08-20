"""
Redis caching helpers.

Usage:
    from app.core.cache import cache

    data = await cache.get("key")
    await cache.set("key", data, ttl=300)
    await cache.delete("key")
"""
from __future__ import annotations

import json
import logging
from typing import Any

import redis.asyncio as aioredis

from app.config import settings

logger = logging.getLogger(__name__)

# ─── Default TTLs (seconds) ───────────────────────────────
TTL_PATENT_DETAIL = 3600       # 1 h — single patent record
TTL_SEARCH_RESULT = 300        # 5 min — search pages
TTL_SIMILAR_RESULT = 600       # 10 min — similar-patent results
TTL_PRIOR_ART = 300            # 5 min — prior-art query
TTL_AGGREGATION = 900          # 15 min — analytics/aggs


class RedisCache:
    """Thin async Redis cache wrapper."""

    def __init__(self) -> None:
        self._client: aioredis.Redis | None = None

    async def _get_client(self) -> aioredis.Redis:
        if self._client is None:
            self._client = await aioredis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True,
            )
        return self._client

    async def get(self, key: str) -> Any | None:
        try:
            client = await self._get_client()
            raw = await client.get(key)
            if raw is None:
                return None
            return json.loads(raw)
        except Exception as e:
            logger.warning(f"Redis GET failed for key={key}: {e}")
            return None

    async def set(self, key: str, value: Any, ttl: int = 300) -> bool:
        try:
            client = await self._get_client()
            serialized = json.dumps(value, default=str)
            await client.setex(key, ttl, serialized)
            return True
        except Exception as e:
            logger.warning(f"Redis SET failed for key={key}: {e}")
            return False

    async def delete(self, key: str) -> bool:
        try:
            client = await self._get_client()
            await client.delete(key)
            return True
        except Exception as e:
            logger.warning(f"Redis DELETE failed for key={key}: {e}")
            return False

    async def delete_pattern(self, pattern: str) -> int:
        """Delete all keys matching a glob pattern. Returns count deleted."""
        try:
            client = await self._get_client()
            keys = await client.keys(pattern)
            if keys:
                return await client.delete(*keys)
            return 0
        except Exception as e:
            logger.warning(f"Redis DELETE PATTERN failed for pattern={pattern}: {e}")
            return 0

    async def exists(self, key: str) -> bool:
        try:
            client = await self._get_client()
            return bool(await client.exists(key))
        except Exception:
            return False

    async def close(self) -> None:
        if self._client:
            await self._client.aclose()
            self._client = None

    # ── Convenience key builders ───────────────────────────

    @staticmethod
    def patent_key(patent_id: str) -> str:
        return f"patent:detail:{patent_id}"

    @staticmethod
    def patent_number_key(patent_number: str) -> str:
        return f"patent:num:{patent_number}"

    @staticmethod
    def search_key(query: str, filters: dict, page: int, page_size: int) -> str:
        import hashlib
        payload = json.dumps(
            {"q": query, "f": filters, "p": page, "ps": page_size},
            sort_keys=True, default=str
        )
        digest = hashlib.sha256(payload.encode()).hexdigest()[:16]
        return f"search:{digest}"

    @staticmethod
    def similar_key(patent_id: str, limit: int) -> str:
        return f"similar:{patent_id}:{limit}"

    @staticmethod
    def prior_art_key(query: str, limit: int) -> str:
        import hashlib
        digest = hashlib.sha256(query.encode()).hexdigest()[:16]
        return f"prior_art:{digest}:{limit}"


# Singleton
cache = RedisCache()
