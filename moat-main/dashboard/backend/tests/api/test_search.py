import pytest
from unittest.mock import AsyncMock, MagicMock, patch, ANY

from app.services.patent_search.service import PatentService
from app.schemas.patent import PatentSearchFilters


def make_es_response(hits: list, total: int = 0):
    """Build a mock Elasticsearch response dict."""
    return {
        "hits": {
            "hits": hits,
            "total": {"value": total, "relation": "eq"},
        },
        "took": 5,
    }


@pytest.mark.asyncio
async def test_search_patents_falls_back_to_db_when_no_es():
    """When no ES client is provided the service should use the DB fallback."""
    db = AsyncMock()
    svc = PatentService(db, es_client=None)

    with patch.object(svc.patent_repo, "search_patents", new_callable=AsyncMock) as mock_search:
        mock_search.return_value = ([], 0)
        result = await svc.search_patents(PatentSearchFilters(query="battery"), page=1, page_size=10)

    assert result.total == 0
    assert result.patents == []
    mock_search.assert_awaited_once()


@pytest.mark.asyncio
async def test_search_patents_uses_es_when_available():
    """When ES is available it should call ES search, not the DB repo."""
    db = AsyncMock()
    es = AsyncMock()
    es.search = AsyncMock(return_value=make_es_response(hits=[], total=0))

    svc = PatentService(db, es_client=es)
    # patch DB query for patent IDs
    db.execute = AsyncMock(return_value=MagicMock(scalars=lambda: MagicMock(all=lambda: [])))

    result = await svc.search_patents(PatentSearchFilters(query="solar"), page=1, page_size=10)

    es.search.assert_awaited_once()
    assert result.page == 1


@pytest.mark.asyncio
async def test_search_patents_es_exception_falls_back_to_db():
    """If ES raises, the service must silently fall back to the DB repo."""
    db = AsyncMock()
    es = AsyncMock()
    es.search = AsyncMock(side_effect=ConnectionError("ES down"))

    svc = PatentService(db, es_client=es)

    with patch.object(svc.patent_repo, "search_patents", new_callable=AsyncMock) as mock_search:
        mock_search.return_value = ([], 0)
        result = await svc.search_patents(PatentSearchFilters(query="drone"), page=1, page_size=5)

    assert result.total == 0
    mock_search.assert_awaited_once()


@pytest.mark.asyncio
async def test_save_patent_raises_conflict_if_already_saved():
    """Saving a patent that's already saved should raise ConflictException."""
    from app.core.exceptions import ConflictException
    from app.models.patent import SavedPatent

    db = AsyncMock()
    svc = PatentService(db)

    # Fake the patent lookup (found)
    patent_mock = MagicMock()
    patent_mock.id = "pat-1"
    with patch.object(svc.patent_repo, "get", new_callable=AsyncMock, return_value=patent_mock):
        # Fake "already saved" — db.execute returns a result with an existing record
        existing_mock = MagicMock()
        result_mock = MagicMock()
        result_mock.scalar_one_or_none = MagicMock(return_value=existing_mock)
        db.execute = AsyncMock(return_value=result_mock)

        with pytest.raises(ConflictException):
            await svc.save_patent("user-1", "pat-1")


@pytest.mark.asyncio
async def test_get_patent_raises_not_found():
    """Getting a non-existent patent should raise NotFoundException."""
    from app.core.exceptions import NotFoundException

    db = AsyncMock()
    svc = PatentService(db)

    with patch.object(svc.patent_repo, "get", new_callable=AsyncMock, return_value=None):
        with pytest.raises(NotFoundException):
            await svc.get_patent("nonexistent-id")
