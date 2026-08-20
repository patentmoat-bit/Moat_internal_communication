import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from app.core.cache import RedisCache, cache

@pytest.mark.asyncio
async def test_cache_keys():
    # Test key builders
    p_key = RedisCache.patent_key("123-uuid")
    assert p_key == "patent:detail:123-uuid"

    p_num_key = RedisCache.patent_number_key("US11223344")
    assert p_num_key == "patent:num:US11223344"

    s_key = RedisCache.search_key("battery", {"assignee": "Tesla"}, page=1, page_size=20)
    assert s_key.startswith("search:")


@pytest.mark.asyncio
async def test_cache_get_set_delete():
    # Mock aioredis from_url and connection
    mock_redis = AsyncMock()
    mock_redis.get = AsyncMock(return_value='{"status": "ok", "value": 42}')
    mock_redis.setex = AsyncMock(return_value=True)
    mock_redis.delete = AsyncMock(return_value=1)

    c = RedisCache()
    c._client = mock_redis

    # Test GET
    val = await c.get("test-key")
    assert val == {"status": "ok", "value": 42}
    mock_redis.get.assert_awaited_once_with("test-key")

    # Test SET
    success = await c.set("test-key", {"status": "ok", "value": 42}, ttl=300)
    assert success is True
    mock_redis.setex.assert_awaited_once()

    # Test DELETE
    deleted = await c.delete("test-key")
    assert deleted is True
    mock_redis.delete.assert_awaited_once_with("test-key")
