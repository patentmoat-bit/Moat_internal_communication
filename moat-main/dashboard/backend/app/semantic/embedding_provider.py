"""
Embedding Provider — Multi-backend embedding generation.

Supports three backends in priority order:
  1. sentence-transformers  (local, free, patent-tuned SPECTER2)
  2. OpenAI                 (cloud, cost-based)
  3. fallback               (TF-IDF bag-of-words, zero-deps)

Usage:
    from app.semantic.embedding_provider import EmbeddingProvider
    provider = EmbeddingProvider()
    vec = await provider.embed("method for generating renewable energy")
    vecs = await provider.embed_batch(["claim 1 text", "claim 2 text"])
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import logging
from functools import lru_cache
from typing import Any

import numpy as np

from app.config import settings
from app.core.logging import logger

# ── Dimensions per model ──────────────────────────────────────────────────────
DIMENSION_MAP: dict[str, int] = {
    # sentence-transformers
    "all-MiniLM-L6-v2": 384,
    "allenai-specter": 768,
    "allenai/specter2": 768,
    "multi-qa-mpnet-base-dot-v1": 768,
    "all-mpnet-base-v2": 768,
    # OpenAI
    "text-embedding-3-small": 1536,
    "text-embedding-3-large": 3072,
    "text-embedding-ada-002": 1536,
}

DEFAULT_LOCAL_MODEL = "all-MiniLM-L6-v2"   # fast, 384-d
PATENT_LOCAL_MODEL = "allenai-specter"      # patent-domain tuned, 768-d


class EmbeddingProvider:
    """
    Thread-safe async embedding provider with automatic backend selection.

    The model is loaded lazily on first call so startup is not blocked.
    """

    _instance: EmbeddingProvider | None = None

    def __init__(self) -> None:
        self._st_model: Any = None  # SentenceTransformer instance
        self._model_name: str = settings.LOCAL_EMBEDDING_MODEL
        self._backend: str = "none"
        self._lock = asyncio.Lock()

    # ── Singleton ─────────────────────────────────────────────────────────────

    @classmethod
    def get(cls) -> "EmbeddingProvider":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    # ── Embed ─────────────────────────────────────────────────────────────────

    async def embed(self, text: str) -> list[float]:
        """Return a normalised embedding vector for *text*."""
        vec = await self._embed_one(text)
        return vec

    async def embed_batch(self, texts: list[str], batch_size: int = 64) -> list[list[float]]:
        """Return embedding vectors for a list of texts."""
        results: list[list[float]] = []
        for i in range(0, len(texts), batch_size):
            chunk = texts[i : i + batch_size]
            vecs = await self._embed_batch_internal(chunk)
            results.extend(vecs)
        return results

    @property
    def dimension(self) -> int:
        return DIMENSION_MAP.get(self._model_name, 1536)

    @property
    def backend(self) -> str:
        return self._backend

    # ── Internal ──────────────────────────────────────────────────────────────

    async def _ensure_loaded(self) -> None:
        async with self._lock:
            if self._backend != "none":
                return
            # Try sentence-transformers first
            try:
                await asyncio.get_event_loop().run_in_executor(
                    None, self._load_st
                )
                return
            except Exception as e:
                logger.warning(f"sentence-transformers unavailable: {e}")

            # Try OpenAI
            if settings.OPENAI_API_KEY:
                self._backend = "openai"
                self._model_name = settings.EMBEDDING_MODEL
                logger.info(f"Using OpenAI embeddings: {self._model_name}")
                return

            # Fallback: sparse TF-IDF vectors
            self._backend = "tfidf"
            self._model_name = "tfidf-fallback"
            logger.warning("Using TF-IDF fallback embeddings (semantic quality limited)")

    def _load_st(self) -> None:
        from sentence_transformers import SentenceTransformer  # type: ignore
        model_name = settings.LOCAL_EMBEDDING_MODEL or DEFAULT_LOCAL_MODEL
        self._st_model = SentenceTransformer(model_name)
        self._model_name = model_name
        self._backend = "sentence-transformers"
        logger.info(f"Loaded sentence-transformers model: {model_name} ({self.dimension}d)")

    async def _embed_one(self, text: str) -> list[float]:
        await self._ensure_loaded()
        if self._backend == "sentence-transformers":
            return await asyncio.get_event_loop().run_in_executor(
                None, lambda: self._st_model.encode(text, normalize_embeddings=True).tolist()
            )
        if self._backend == "openai":
            return await self._openai_embed([text])
        return _tfidf_vector(text)

    async def _embed_batch_internal(self, texts: list[str]) -> list[list[float]]:
        await self._ensure_loaded()
        if self._backend == "sentence-transformers":
            return await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: self._st_model.encode(
                    texts, normalize_embeddings=True, batch_size=32
                ).tolist(),
            )
        if self._backend == "openai":
            return await self._openai_embed_batch(texts)
        return [_tfidf_vector(t) for t in texts]

    async def _openai_embed(self, texts: list[str]) -> list[float]:
        from openai import AsyncOpenAI  # type: ignore
        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        resp = await client.embeddings.create(model=self._model_name, input=texts)
        return resp.data[0].embedding

    async def _openai_embed_batch(self, texts: list[str]) -> list[list[float]]:
        from openai import AsyncOpenAI  # type: ignore
        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        resp = await client.embeddings.create(model=self._model_name, input=texts)
        return [d.embedding for d in resp.data]


# ── Sparse TF-IDF fallback ─────────────────────────────────────────────────

_VOCAB_SIZE = 512

def _tfidf_vector(text: str, dim: int = _VOCAB_SIZE) -> list[float]:
    """Deterministic sparse vector via character n-gram hashing (no deps)."""
    vec = [0.0] * dim
    words = text.lower().split()
    for word in words:
        idx = int(hashlib.md5(word.encode()).hexdigest(), 16) % dim
        vec[idx] += 1.0
    norm = sum(v ** 2 for v in vec) ** 0.5
    if norm > 0:
        vec = [v / norm for v in vec]
    # Pad to 1536 for compatibility
    if dim < 1536:
        vec = vec + [0.0] * (1536 - dim)
    return vec


# ── Module-level singleton helpers ─────────────────────────────────────────

_provider: EmbeddingProvider | None = None


def get_embedding_provider() -> EmbeddingProvider:
    global _provider
    if _provider is None:
        _provider = EmbeddingProvider()
    return _provider


async def embed_text(text: str) -> list[float]:
    return await get_embedding_provider().embed(text)


async def embed_texts(texts: list[str]) -> list[list[float]]:
    return await get_embedding_provider().embed_batch(texts)
