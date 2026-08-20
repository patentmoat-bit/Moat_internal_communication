import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient
from contextlib import asynccontextmanager

from app.main import app
from app.api.deps import get_db, get_elasticsearch_client, get_current_user
from app.models.user import User, UserRole

# Disable lifespan to prevent connection attempts to Postgres, ES, Neo4j
@asynccontextmanager
async def mock_lifespan(app):
    yield

app.router.lifespan_context = mock_lifespan

# Define mock user
mock_user = User(
    id="test-user-id",
    email="test@example.com",
    role=UserRole.admin,
)

async def override_current_user():
    return mock_user

async def override_db():
    db = AsyncMock()
    return db

async def override_es():
    es = AsyncMock()
    # Mock prior-art search response
    es.search = AsyncMock(return_value={
        "hits": {
            "hits": [
                {
                    "_id": "pat-123",
                    "_score": 12.5,
                    "_source": {
                        "patent_number": "US10101010",
                        "title": "Quantum Battery Grid",
                        "abstract": "Grid battery management with quantum computing.",
                        "assignee": "QuantumGrid Corp",
                        "filing_date": "2024-01-01",
                        "publication_date": "2025-06-01",
                        "source": "uspto",
                        "cpc_classifications": [{"symbol": "H01M10/00"}],
                    }
                }
            ],
            "total": {"value": 1, "relation": "eq"}
        }
    })
    return es


@pytest.fixture
def client():
    app.dependency_overrides[get_current_user] = override_current_user
    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_elasticsearch_client] = override_es
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def test_prior_art_search_endpoint(client):
    payload = {
        "query": "quantum battery storage grid",
        "filing_date": "2026-01-01",
        "limit": 10,
        "include_semantic": False
    }
    
    # Mock the Redis cache to bypass it during the test
    with patch("app.core.cache.cache.get", new_callable=AsyncMock, return_value=None), \
         patch("app.core.cache.cache.set", new_callable=AsyncMock, return_value=True):
         
        response = client.post("/api/v1/prior-art/search", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data["query"] == "quantum battery storage grid"
        assert len(data["hits"]) == 1
        assert data["hits"][0]["patent_number"] == "US10101010"
        assert data["hits"][0]["title"] == "Quantum Battery Grid"
        assert "keyword" in data["strategies_used"]
