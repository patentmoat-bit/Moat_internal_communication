from __future__ import annotations

import threading
from dataclasses import dataclass

from moat_api.core.config import get_settings

settings = get_settings()


@dataclass(frozen=True, slots=True)
class EmbeddingModel:
    """Identity of the model that produced a vector.

    Versioned because vectors are only comparable within one model. Changing
    the model means rebuilding the index, and the manifest records which model
    every index was built with so the two can never be silently mixed.
    """

    name: str
    dimensions: int


_lock = threading.Lock()
_model = None
_resolved: EmbeddingModel | None = None
_unavailable_reason: str | None = None


def _load() -> None:
    """Load the static embedding model once, lazily.

    Static embeddings (model2vec) rather than a transformer: inference is a
    token lookup and an average, so it runs on CPU in the API process without
    a GPU, a model server, or a second deployment to operate. Quality is below
    a full transformer -- which is why retrieval combines it with BM25 rather
    than relying on it alone.
    """
    global _model, _resolved, _unavailable_reason

    if _model is not None or _unavailable_reason is not None:
        return

    if not settings.embedding_model:
        _unavailable_reason = "no embedding model configured"
        return

    try:
        from model2vec import StaticModel

        model = StaticModel.from_pretrained(settings.embedding_model)
        dimensions = int(model.dim)
        _model = model
        _resolved = EmbeddingModel(name=settings.embedding_model, dimensions=dimensions)
    except Exception as error:  # noqa: BLE001 -- any failure means degrade, not crash
        # Retrieval must keep working on BM25 alone. The failure is recorded and
        # surfaced in retrieval_version rather than silently changing results.
        _unavailable_reason = f"{type(error).__name__}: {error}"


def available() -> bool:
    with _lock:
        _load()
    return _model is not None


def model_identity() -> EmbeddingModel | None:
    with _lock:
        _load()
    return _resolved


def unavailable_reason() -> str | None:
    with _lock:
        _load()
    return _unavailable_reason


def encode(texts: list[str]) -> list[list[float]] | None:
    """Embed a batch, or None when embeddings are unavailable."""
    with _lock:
        _load()
        if _model is None:
            return None
        vectors = _model.encode(texts)
    return [[float(value) for value in vector] for vector in vectors]


def encode_one(text: str) -> list[float] | None:
    vectors = encode([text])
    return vectors[0] if vectors else None
