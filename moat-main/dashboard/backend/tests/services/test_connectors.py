import pytest
from unittest.mock import AsyncMock, patch, MagicMock
import httpx
from app.ingestion.connectors.uspto import USPTOConnector
from app.ingestion.connectors.epo import EPOConnector
from app.ingestion.connectors.wipo import WIPOConnector
from app.ingestion.connectors.lens import LensConnector
from app.ingestion.connectors.google_patents import GooglePatentsConnector
from app.schemas.unified_patent import UnifiedPatent

@pytest.mark.asyncio
async def test_uspto_connector():
    connector = USPTOConnector(api_key="test_key")
    mock_response = {
        "patents": [
            {
                "patent_number": "11223344",
                "patent_title": "Quantum Battery",
                "patent_abstract": "A battery using quantum mechanics.",
                "patent_kind": "B2",
                "patent_date": "2026-06-17",
                "patent_type": "utility",
                "inventors": [{"inventor_first_name": "Alice", "inventor_last_name": "Smith", "inventor_country": "US"}],
                "assignees": [{"assignee_organization": "Quantum Energy Corp", "assignee_country": "US"}],
            }
        ]
    }

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = MagicMock(status_code=200, json=lambda: mock_response)
        results = await connector.search("battery", limit=1)
        assert len(results) == 1
        patent = results[0]
        assert isinstance(patent, UnifiedPatent)
        assert patent.patent_number == "US11223344"
        assert patent.title == "Quantum Battery"
        assert patent.abstract == "A battery using quantum mechanics."
        assert patent.source == "uspto"


@pytest.mark.asyncio
async def test_epo_connector():
    connector = EPOConnector(consumer_key="key", consumer_secret="secret")
    mock_token_resp = {"access_token": "mock_token"}
    mock_search_resp = {
        "ops:world-patent-data": {
            "ops:search-result": {
                "ops:publication-reference": [
                    {
                        "bibliographic-data": {
                            "publication-reference": {
                                "document-id": {
                                    "country": "EP",
                                    "doc-number": "3344556",
                                    "kind": "A1",
                                    "date": "20260617"
                                }
                            },
                            "invention-title": {"$": "Sensing Device"},
                            "parties": {
                                "inventors": {
                                    "inventor": [{"inventor-name": {"name": "Bob Builder"}}]
                                },
                                "applicants": {
                                    "applicant": [{"applicant-name": {"name": "Construction Inc"}}]
                                }
                            }
                        }
                    }
                ]
            }
        }
    }

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post, \
         patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_post.return_value = MagicMock(status_code=200, json=lambda: mock_token_resp)
        mock_get.return_value = MagicMock(status_code=200, json=lambda: mock_search_resp)

        results = await connector.search("sensor", limit=1)
        assert len(results) == 1
        patent = results[0]
        assert patent.patent_number == "EP3344556"
        assert patent.title == "Sensing Device"
        assert patent.inventors[0].name == "Bob Builder"
        assert patent.source == "epo"


@pytest.mark.asyncio
async def test_wipo_connector():
    connector = WIPOConnector()
    mock_resp = {
        "results": [
            {
                "wo_number": "2026123456",
                "titleEn": "Carbon Capture Method",
                "abstractEn": "Capturing carbon dioxide using solid sorbents.",
                "publication_date": "2026-06-17",
                "inventors": ["Charlie Green"],
                "applicant": "GreenTech Ltd",
            }
        ]
    }

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = MagicMock(status_code=200, json=lambda: mock_resp)
        results = await connector.search("carbon", limit=1)
        assert len(results) == 1
        patent = results[0]
        assert patent.patent_number == "WO2026123456"
        assert patent.title == "Carbon Capture Method"
        assert patent.source == "wipo"


@pytest.mark.asyncio
async def test_lens_connector():
    connector = LensConnector(api_key="lens_key")
    mock_resp = {
        "data": [
            {
                "lens_id": "lens-1",
                "publication_number": "US10203040",
                "jurisdiction": "US",
                "kind": "B2",
                "date_published": "2026-06-17",
                "title": [{"text": "Flexible Display", "lang": "en"}],
                "abstract": [{"text": "A flexible OLED display panel.", "lang": "en"}],
                "inventors": [{"name": "Dave Spark"}],
                "assignees": [{"name": "DisplayTech Inc", "type": "organisation"}],
            }
        ]
    }

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = MagicMock(status_code=200, json=lambda: mock_resp)
        results = await connector.search("display", limit=1)
        assert len(results) == 1
        patent = results[0]
        assert patent.patent_number == "US10203040"
        assert patent.title == "Flexible Display"
        assert patent.abstract == "A flexible OLED display panel."
        assert patent.source == "lens"


@pytest.mark.asyncio
async def test_google_patents_connector():
    connector = GooglePatentsConnector(serp_api_key="serp_key")
    mock_resp = {
        "organic_results": [
            {
                "patent_id": "US9988776B2",
                "title": "Autonomous Drone Navigation",
                "snippet": "Drones navigating autonomously in obstacle environments.",
                "publication_date": "2026-06-17",
                "inventor": "Frank Flyer",
                "assignee": "AeroNav Inc",
            }
        ]
    }

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = MagicMock(status_code=200, json=lambda: mock_resp)
        results = await connector.search("drone", limit=1)
        assert len(results) == 1
        patent = results[0]
        assert patent.patent_number == "US9988776B2"
        assert patent.title == "Autonomous Drone Navigation"
        assert patent.source == "google_patents"
