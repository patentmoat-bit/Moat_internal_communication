import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from fastapi.testclient import TestClient
from contextlib import asynccontextmanager

from app.main import app
from app.ai.schemas import SummarizationRequest, ChatRequest, SemanticSearchRequest

# Disable lifespan to prevent connection attempts to Postgres, ES, Neo4j
@asynccontextmanager
async def mock_lifespan(app):
    yield

app.router.lifespan_context = mock_lifespan

# Ensure DB dependency is overridden for these endpoints if needed
# But for router tests, we can just patch the underlying service functions

@pytest.mark.asyncio
async def test_summarize_patent_not_found():
    """Summarizing a non-existent patent should return 404."""
    with patch("app.ai.router.PatentRepository") as MockRepo:
        mock_repo = MockRepo.return_value
        mock_repo.get = AsyncMock(return_value=None)
        
        with TestClient(app) as client:
            from app.api.deps import get_current_user
            app.dependency_overrides[get_current_user] = lambda: MagicMock(id="user1")
            
            response = client.post(
                "/api/v1/ai/summarize",
                json={"patent_id": "nonexistent"}
            )
            assert response.status_code == 404
            
            # Clean up
            app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_summarize_patent_success():
    """Summarizing an existing patent should call generate_summary."""
    with patch("app.ai.router.PatentRepository") as MockRepo, \
         patch("app.ai.router.generate_summary", new_callable=AsyncMock) as mock_generate:
         
        mock_patent = MagicMock()
        mock_patent.id = "pat-1"
        mock_patent.patent_number = "US123"
        mock_patent.title = "Test Patent"
        
        mock_repo = MockRepo.return_value
        mock_repo.get = AsyncMock(return_value=mock_patent)
        
        mock_generate.return_value = {
            "summary": "This is a mock summary.",
            "key_innovations": ["Inn 1", "Inn 2"],
            "technical_domain": "Mock Domain"
        }
        
        with TestClient(app) as client:
            from app.api.deps import get_current_user
            app.dependency_overrides[get_current_user] = lambda: MagicMock(id="user1")
            
            response = client.post(
                "/api/v1/ai/summarize",
                json={"patent_id": "pat-1"}
            )
            assert response.status_code == 200
            data = response.json()
            assert data["summary"] == "This is a mock summary."
            assert data["patent_number"] == "US123"
            
            app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_semantic_search():
    """Testing semantic search endpoint which wraps Weaviate."""
    with patch("app.ai.router.search_semantic", new_callable=AsyncMock) as mock_search:
        mock_search.return_value = [
            {"patent_id": "pat-1", "patent_number": "US123", "title": "T1", "score": 0.95}
        ]
        
        with TestClient(app) as client:
            from app.api.deps import get_current_user
            app.dependency_overrides[get_current_user] = lambda: MagicMock(id="user1")
            
            response = client.post(
                "/api/v1/ai/semantic-search",
                json={"query": "battery technology", "limit": 5}
            )
            assert response.status_code == 200
            data = response.json()
            assert data["query"] == "battery technology"
            assert data["total"] == 1
            assert data["results"][0]["patent_number"] == "US123"
            
            app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_chat_with_patent():
    """Testing chat endpoint which interacts with LLM."""
    with patch("app.ai.router.PatentRepository") as MockRepo, \
         patch("app.ai.router.generate_chat_response", new_callable=AsyncMock) as mock_chat:
         
        mock_patent = MagicMock()
        mock_patent.id = "pat-1"
        mock_patent.title = "T1"
        mock_patent.abstract = "A1"
        mock_patent.claims = "C1"
        
        mock_repo = MockRepo.return_value
        mock_repo.get = AsyncMock(return_value=mock_patent)
        
        mock_chat.return_value = "This is a chat response"
        
        with TestClient(app) as client:
            from app.api.deps import get_current_user
            app.dependency_overrides[get_current_user] = lambda: MagicMock(id="user1")
            
            response = client.post(
                "/api/v1/ai/chat",
                json={"patent_id": "pat-1", "messages": [{"role": "user", "content": "Explain this"}]}
            )
            assert response.status_code == 200
            data = response.json()
            assert data["response"] == "This is a chat response"
            
            app.dependency_overrides.clear()
