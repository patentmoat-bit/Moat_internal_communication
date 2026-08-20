import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from fastapi.testclient import TestClient
from contextlib import asynccontextmanager

from app.main import app

# Disable lifespan to prevent connection attempts to Postgres, ES, Neo4j
@asynccontextmanager
async def mock_lifespan(app):
    yield

app.router.lifespan_context = mock_lifespan

@pytest.mark.asyncio
async def test_search_by_image_invalid_type():
    """Uploading a non-image file should return 400."""
    with TestClient(app) as client:
        from app.api.deps import get_current_user
        app.dependency_overrides[get_current_user] = lambda: MagicMock(id="user1")
        
        # We simulate uploading a text file
        response = client.post(
            "/api/v1/search/image",
            files={"file": ("test.txt", b"hello world", "text/plain")},
            data={"limit": 10, "min_score": 0.0}
        )
        assert response.status_code == 400
        assert "must be an image" in response.json()["detail"]
        
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_search_by_image_success():
    """Valid image upload should call ImageSearchService and return results."""
    with patch("app.api.image_search.router.ImageSearchService") as MockService:
        mock_service = MockService.return_value
        mock_service.search_by_image = AsyncMock(return_value=[
            {"patent_number": "US123", "similarity_pct": 95.5, "title": "Test Patent"}
        ])
        
        with TestClient(app) as client:
            from app.api.deps import get_current_user
            app.dependency_overrides[get_current_user] = lambda: MagicMock(id="user1")
            
            response = client.post(
                "/api/v1/search/image",
                files={"file": ("test.png", b"fake-image-bytes", "image/png")},
                data={"limit": 5, "min_score": 0.5}
            )
            assert response.status_code == 200
            data = response.json()
            assert len(data) == 1
            assert data[0]["patent_number"] == "US123"
            
            app.dependency_overrides.clear()
