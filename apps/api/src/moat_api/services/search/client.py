from __future__ import annotations

from opensearchpy import AsyncOpenSearch

from moat_api.core.config import get_settings

settings = get_settings()

_client: AsyncOpenSearch | None = None


def client() -> AsyncOpenSearch:
    """Shared OpenSearch client.

    Retries are OFF: the outer layer (job retry, or an honest "search
    unavailable" in the UI) owns that decision. Two retry owners on one path
    multiply latency under load exactly when the cluster is least able to
    absorb it (design doc §9).
    """
    global _client
    if _client is None:
        _client = AsyncOpenSearch(
            hosts=[settings.opensearch_url],
            http_compress=True,
            max_retries=0,
            retry_on_timeout=False,
            timeout=settings.opensearch_timeout_seconds,
        )
    return _client


async def close() -> None:
    global _client
    if _client is not None:
        await _client.close()
        _client = None


async def healthy() -> bool:
    """Whether the cluster answered.

    The request timeout comes from the client's own configuration; passing a
    duration string as a request param makes opensearch-py compare it against
    an int and raise, which would report a healthy cluster as down.
    """
    try:
        await client().cluster.health()
    except Exception:  # noqa: BLE001 -- any failure means "unavailable", not a crash
        return False
    return True
