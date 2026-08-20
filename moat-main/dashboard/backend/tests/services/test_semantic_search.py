"""
Tests for the semantic patent search infrastructure.

All tests are fully offline (no Weaviate, ES, or OpenAI required).
External clients are replaced with AsyncMock / MagicMock.
"""

from __future__ import annotations

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from contextlib import asynccontextmanager


# ─── Disable lifespan for all TestClient usage ───────────────────────────────

@asynccontextmanager
async def _noop_lifespan(app):
    yield


# ═══════════════════════════════════════════════════════════════════════════════
# 1. EmbeddingProvider — TF-IDF fallback (no sentence-transformers required)
# ═══════════════════════════════════════════════════════════════════════════════

class TestEmbeddingProviderFallback:

    @pytest.mark.asyncio
    async def test_tfidf_fallback_produces_vector(self):
        from app.semantic.embedding_provider import EmbeddingProvider, _tfidf_vector
        vec = _tfidf_vector("quantum battery storage technology")
        assert isinstance(vec, list)
        assert len(vec) == 1536  # padded to 1536
        assert any(v != 0.0 for v in vec)

    @pytest.mark.asyncio
    async def test_tfidf_vector_is_normalised(self):
        from app.semantic.embedding_provider import _tfidf_vector
        vec = _tfidf_vector("method for manufacturing semiconductors")
        norm = sum(v ** 2 for v in vec) ** 0.5
        assert abs(norm - 1.0) < 1e-4 or norm == 0.0  # unit norm or zero vector

    @pytest.mark.asyncio
    async def test_embed_via_tfidf_backend(self):
        """Force TF-IDF backend by mocking sentence_transformers import."""
        from app.semantic.embedding_provider import EmbeddingProvider
        provider = EmbeddingProvider()
        provider._backend = "tfidf"
        provider._model_name = "tfidf-fallback"

        vec = await provider.embed("wireless sensor network patent claim")
        assert isinstance(vec, list)
        assert len(vec) == 1536

    @pytest.mark.asyncio
    async def test_embed_batch_via_tfidf_backend(self):
        from app.semantic.embedding_provider import EmbeddingProvider
        provider = EmbeddingProvider()
        provider._backend = "tfidf"
        provider._model_name = "tfidf-fallback"

        texts = ["claim about battery", "method for data processing", "apparatus for solar energy"]
        vecs = await provider.embed_batch(texts)
        assert len(vecs) == 3
        for v in vecs:
            assert len(v) == 1536

    @pytest.mark.asyncio
    async def test_dimension_reported_correctly(self):
        from app.semantic.embedding_provider import EmbeddingProvider
        provider = EmbeddingProvider()
        provider._model_name = "text-embedding-3-small"
        assert provider.dimension == 1536

        provider._model_name = "all-MiniLM-L6-v2"
        assert provider.dimension == 384

    @pytest.mark.asyncio
    async def test_embed_via_openai_backend(self):
        from app.semantic.embedding_provider import EmbeddingProvider
        provider = EmbeddingProvider()
        provider._backend = "openai"
        provider._model_name = "text-embedding-3-small"

        mock_response = MagicMock()
        mock_response.data = [MagicMock(embedding=[0.1] * 1536)]

        with patch("openai.AsyncOpenAI") as MockClient:
            instance = MockClient.return_value
            instance.embeddings = MagicMock()
            instance.embeddings.create = AsyncMock(return_value=mock_response)

            # Patch the _openai_embed method directly
            provider._openai_embed = AsyncMock(return_value=[0.1] * 1536)
            vec = await provider._embed_one("test query")
            assert len(vec) == 1536


# ═══════════════════════════════════════════════════════════════════════════════
# 2. Ranking Engine
# ═══════════════════════════════════════════════════════════════════════════════

class TestRankingEngine:

    def _make_vector_hit(self, patent_id: str, score: float, citation_count: int = 0) -> dict:
        return {
            "patent_id": patent_id,
            "patent_number": patent_id,
            "title": f"Patent {patent_id}",
            "abstract": "Some abstract text",
            "assignee": "TestCorp",
            "filing_date": "2023-01-01",
            "publication_date": "2023-06-01",
            "source": "uspto",
            "citation_count": citation_count,
            "score": score,
            "properties": {
                "patent_id": patent_id,
                "patent_number": patent_id,
                "title": f"Patent {patent_id}",
                "abstract": "Some abstract text",
                "citation_count": citation_count,
            },
        }

    def _make_kw_hit(self, patent_id: str, es_score: float) -> dict:
        return {
            "patent_id": patent_id,
            "patent_number": patent_id,
            "title": f"Patent {patent_id}",
            "abstract": "Some abstract text",
            "score": es_score,
            "_source": {
                "patent_id": patent_id,
                "patent_number": patent_id,
                "title": f"Patent {patent_id}",
                "abstract": "Some abstract text",
            },
        }

    def test_rank_results_merges_hits(self):
        from app.semantic.ranking import rank_results
        vec_hits = [self._make_vector_hit("P001", 0.95), self._make_vector_hit("P002", 0.80)]
        kw_hits = [self._make_kw_hit("P002", 15.0), self._make_kw_hit("P003", 8.0)]

        ranked = rank_results(vec_hits, kw_hits)
        ids = [r.patent_number for r in ranked]
        assert "P001" in ids
        assert "P002" in ids
        assert "P003" in ids

    def test_rank_results_total_count(self):
        from app.semantic.ranking import rank_results
        vec = [self._make_vector_hit(f"V{i}", 1.0 - i * 0.1) for i in range(5)]
        kw = [self._make_kw_hit(f"K{i}", 10.0 - i) for i in range(5)]
        ranked = rank_results(vec, kw)
        assert len(ranked) == 10  # all unique

    def test_hybrid_hit_scored_higher_than_single_strategy(self):
        from app.semantic.ranking import rank_results
        # P001 appears in both → should have higher RRF score
        vec_hits = [self._make_vector_hit("P001", 0.9), self._make_vector_hit("P002", 0.7)]
        kw_hits = [self._make_kw_hit("P001", 20.0), self._make_kw_hit("P003", 15.0)]

        ranked = rank_results(vec_hits, kw_hits)
        top = ranked[0]
        # P001 matched both → hybrid → likely ranked first
        assert top.patent_number == "P001"
        assert "vector" in top.matched_by
        assert "keyword" in top.matched_by
        assert top.search_strategy == "hybrid"

    def test_citation_score_normalised_correctly(self):
        from app.semantic.ranking import _normalise_citation
        assert _normalise_citation(0, 100) == 0.0
        assert _normalise_citation(100, 100) == 1.0
        assert 0.0 < _normalise_citation(10, 100) < 1.0

    def test_prior_art_ranking_applies_date_penalty(self):
        from app.semantic.ranking import rank_prior_art
        results = [
            {"semantic_score": 0.9, "citation_count": 5,
             "publication_date": "2025-01-01", "filing_date": ""},
            {"semantic_score": 0.85, "citation_count": 3,
             "publication_date": "2020-01-01", "filing_date": ""},
        ]
        ranked = rank_prior_art(results, source_filing_date="2022-01-01")
        # First result (2025 > 2022) should be penalised
        penalised = next(r for r in ranked if r["publication_date"] == "2025-01-01")
        valid = next(r for r in ranked if r["publication_date"] == "2020-01-01")
        assert penalised["date_penalty"] < valid["date_penalty"]
        assert penalised["prior_art_score"] < valid["prior_art_score"]

    def test_keyword_score_extraction_from_es(self):
        from app.semantic.ranking import extract_keyword_score_from_es
        hit_high = {"_score": 100.0}
        hit_low = {"_score": 1.0}
        hit_zero = {"_score": 0.0}
        assert extract_keyword_score_from_es(hit_high) <= 1.0
        assert extract_keyword_score_from_es(hit_high) > extract_keyword_score_from_es(hit_low)
        assert extract_keyword_score_from_es(hit_zero) == 0.0

    def test_result_to_dict_all_fields_present(self):
        from app.semantic.ranking import RankedResult
        r = RankedResult(
            patent_id="uuid-1",
            patent_number="US11223344",
            title="Quantum Battery Device",
            semantic_score=0.87,
            keyword_score=0.63,
            citation_score=0.4,
            novelty_score=0.1,
            composite_score=0.75,
            rrf_score=0.012,
            matched_by=["vector", "keyword"],
        )
        d = r.to_dict()
        required_fields = [
            "patent_id", "patent_number", "title", "semantic_score",
            "keyword_score", "citation_score", "novelty_score",
            "composite_score", "rrf_score", "matched_by", "search_strategy",
        ]
        for f in required_fields:
            assert f in d


# ═══════════════════════════════════════════════════════════════════════════════
# 3. Vector Ingestion Pipeline
# ═══════════════════════════════════════════════════════════════════════════════

class TestIngestionPipeline:

    def _make_patent(self, patent_id: str = "pat-1") -> dict:
        return {
            "id": patent_id,
            "patent_number": f"US{patent_id}",
            "title": "System for wireless energy transfer",
            "abstract": "A wireless energy transfer system using resonant induction.",
            "claims": [
                {"number": 1, "text": "A method comprising transmitting energy wirelessly.", "type": "independent"},
                {"number": 2, "text": "The method of claim 1, further comprising receiving.", "type": "dependent"},
            ],
            "assignee": "EnergyTech Corp",
            "filing_date": "2023-03-15",
            "publication_date": "2024-01-10",
            "source": "uspto",
            "cpc_classifications": [{"symbol": "H02J50/10"}],
            "citation_count": 12,
        }

    @pytest.mark.asyncio
    async def test_ingest_one_success(self):
        from app.semantic.ingestion import VectorIngestionPipeline
        pipeline = VectorIngestionPipeline()
        # Mock the embedding provider and upsert functions
        pipeline._provider = MagicMock()
        pipeline._provider.embed = AsyncMock(return_value=[0.1] * 384)
        pipeline._provider.embed_batch = AsyncMock(return_value=[[0.2] * 384, [0.3] * 384])

        with patch("app.semantic.ingestion.upsert_patent_abstract", new_callable=AsyncMock, return_value=True), \
             patch("app.semantic.ingestion.upsert_patent_claims", new_callable=AsyncMock, return_value=True), \
             patch("app.semantic.ingestion.upsert_patent_full", new_callable=AsyncMock, return_value=True):
            result = await pipeline.ingest_one(self._make_patent())
            assert result.success
            assert result.abstract_ok
            assert result.claims_ok
            assert result.full_ok
            assert result.error is None

    @pytest.mark.asyncio
    async def test_ingest_one_missing_id_returns_error(self):
        from app.semantic.ingestion import VectorIngestionPipeline
        pipeline = VectorIngestionPipeline()
        result = await pipeline.ingest_one({"patent_number": "US999", "title": "Test"})
        assert not result.success
        assert result.error is not None

    @pytest.mark.asyncio
    async def test_ingest_batch_report(self):
        from app.semantic.ingestion import VectorIngestionPipeline
        pipeline = VectorIngestionPipeline()
        pipeline._provider = MagicMock()
        pipeline._provider.embed = AsyncMock(return_value=[0.1] * 384)
        pipeline._provider.embed_batch = AsyncMock(return_value=[[0.1] * 384])

        patents = [self._make_patent(f"p{i}") for i in range(5)]

        with patch("app.semantic.ingestion.upsert_patent_abstract", new_callable=AsyncMock, return_value=True), \
             patch("app.semantic.ingestion.upsert_patent_claims", new_callable=AsyncMock, return_value=True), \
             patch("app.semantic.ingestion.upsert_patent_full", new_callable=AsyncMock, return_value=True):
            report = await pipeline.ingest_batch(patents, concurrency=2)
            assert report.total == 5
            assert report.succeeded == 5
            assert report.failed == 0
            assert report.duration_s >= 0

    def test_extract_claims_from_list(self):
        from app.semantic.ingestion import _extract_claims
        patent = {
            "claims": [
                {"number": 1, "text": "A method comprising step A.", "type": "independent"},
                {"number": 2, "text": "The method of claim 1, further comprising step B.", "type": "dependent"},
            ]
        }
        claims = _extract_claims(patent)
        assert len(claims) == 2
        assert claims[0]["type"] == "independent"

    def test_extract_claims_from_string(self):
        from app.semantic.ingestion import _extract_claims
        patent = {"claims": "1. A system for processing data."}
        claims = _extract_claims(patent)
        assert len(claims) == 1
        assert claims[0]["number"] == 1

    def test_extract_cpc_codes(self):
        from app.semantic.ingestion import _extract_cpc_codes
        patent = {"cpc_classifications": [{"symbol": "H04L63/00"}, {"symbol": "G06F17/00"}]}
        result = _extract_cpc_codes(patent)
        assert "H04L63/00" in result
        assert "G06F17/00" in result


# ═══════════════════════════════════════════════════════════════════════════════
# 4. Hybrid Search Engine
# ═══════════════════════════════════════════════════════════════════════════════

class TestHybridSearchEngine:

    @pytest.mark.asyncio
    async def test_search_returns_response(self):
        from app.semantic.search import HybridSearchEngine, SearchRequest

        mock_es = AsyncMock()
        mock_es.search = AsyncMock(return_value={
            "hits": {
                "hits": [
                    {
                        "_id": "kw-1",
                        "_score": 20.5,
                        "_source": {
                            "patent_number": "US10000001",
                            "title": "Battery Management System",
                            "abstract": "System for managing battery charge.",
                            "assignee": "PowerCorp",
                            "source": "uspto",
                            "citation_count": 5,
                        },
                    }
                ],
                "total": {"value": 1},
            }
        })

        mock_provider = MagicMock()
        mock_provider.embed = AsyncMock(return_value=[0.1] * 384)
        mock_provider.backend = "tfidf"

        with patch("app.semantic.search.vector_search", new_callable=AsyncMock, return_value=[
            {
                "score": 0.88,
                "properties": {
                    "patent_id": "vec-1",
                    "patent_number": "US20000001",
                    "title": "Electric Vehicle Battery",
                    "abstract": "EV battery cell.",
                    "assignee": "EVCorp",
                    "citation_count": 10,
                },
            }
        ]):
            engine = HybridSearchEngine(es_client=mock_es)
            engine._provider = mock_provider

            req = SearchRequest(query="battery energy storage", limit=10)
            response = await engine.search(req)

            assert response.query == "battery energy storage"
            assert response.total > 0
            assert "keyword" in response.strategies_used
            assert "vector" in response.strategies_used
            assert isinstance(response.took_ms, float)

    @pytest.mark.asyncio
    async def test_search_keyword_only(self):
        from app.semantic.search import HybridSearchEngine, SearchRequest

        mock_es = AsyncMock()
        mock_es.search = AsyncMock(return_value={
            "hits": {"hits": [], "total": {"value": 0}}
        })

        engine = HybridSearchEngine(es_client=mock_es)
        req = SearchRequest(query="solar panel", include_vector=False)
        response = await engine.search(req)
        assert "vector" not in response.strategies_used

    @pytest.mark.asyncio
    async def test_search_vector_only(self):
        from app.semantic.search import HybridSearchEngine, SearchRequest

        mock_provider = MagicMock()
        mock_provider.embed = AsyncMock(return_value=[0.5] * 384)
        mock_provider.backend = "tfidf"

        with patch("app.semantic.search.vector_search", new_callable=AsyncMock, return_value=[]):
            engine = HybridSearchEngine(es_client=None)
            engine._provider = mock_provider
            req = SearchRequest(query="nanotube fabrication", include_keyword=False)
            response = await engine.search(req)
            assert "keyword" not in response.strategies_used

    def test_search_response_to_dict(self):
        from app.semantic.search import SearchResponse
        from app.semantic.ranking import RankedResult
        r = RankedResult(patent_id="x", patent_number="US1", title="T")
        resp = SearchResponse(
            query="test",
            results=[r],
            total=1,
            took_ms=12.5,
            strategies_used=["vector", "keyword"],
            vector_backend="tfidf",
        )
        d = resp.to_dict()
        assert d["query"] == "test"
        assert d["total"] == 1
        assert len(d["results"]) == 1
        assert d["strategies_used"] == ["vector", "keyword"]


# ═══════════════════════════════════════════════════════════════════════════════
# 5. Prior Art Search Engine
# ═══════════════════════════════════════════════════════════════════════════════

class TestPriorArtEngine:

    @pytest.mark.asyncio
    async def test_prior_art_search_returns_response(self):
        from app.semantic.prior_art import PriorArtSearchEngine

        mock_provider = MagicMock()
        mock_provider.embed = AsyncMock(return_value=[0.3] * 384)
        mock_provider.embed_batch = AsyncMock(return_value=[[0.4] * 384])

        mock_vector_result = [
            {
                "score": 0.91,
                "properties": {
                    "patent_id": "prior-1",
                    "patent_number": "US9988776",
                    "title": "Prior Art Battery Method",
                    "abstract": "An older battery method.",
                    "assignee": "OldCorp",
                    "filing_date": "2018-01-01",
                    "publication_date": "2019-06-01",
                    "source": "uspto",
                    "citation_count": 25,
                    "cpc_codes": "H01M10/00",
                },
            }
        ]

        with patch("app.semantic.prior_art.vector_search", new_callable=AsyncMock, return_value=mock_vector_result):
            engine = PriorArtSearchEngine(es_client=None)
            engine._provider = mock_provider

            response = await engine.search(
                source_patent_number="US12345678",
                title="Battery Energy Storage System",
                abstract="A novel battery system using graphene.",
                claims=[{"number": 1, "text": "A battery comprising graphene.", "type": "independent"}],
                filing_date="2022-06-01",
                limit=10,
                enrich_top_n=0,  # skip AI enrichment in tests
            )

            assert response.source_patent_number == "US12345678"
            assert response.filing_date_cutoff == "2022-06-01"
            assert isinstance(response.hits, list)
            assert response.total >= 0

    @pytest.mark.asyncio
    async def test_prior_art_excludes_source_patent(self):
        from app.semantic.prior_art import _should_include, PriorArtHit
        source_hit = PriorArtHit(
            patent_id="src-id",
            patent_number="US11111111",
            title="Source",
        )
        assert not _should_include(source_hit, exclude_id="src-id", cutoff_date=None)

    @pytest.mark.asyncio
    async def test_prior_art_excludes_post_cutoff(self):
        from app.semantic.prior_art import _should_include, PriorArtHit
        future_hit = PriorArtHit(
            patent_id="fut-1",
            patent_number="US99999999",
            title="Future Patent",
            publication_date="2025-01-01",
        )
        assert not _should_include(future_hit, exclude_id="", cutoff_date="2022-01-01")

    def test_prior_art_hit_to_dict(self):
        from app.semantic.prior_art import PriorArtHit
        hit = PriorArtHit(
            patent_id="p1",
            patent_number="US1234",
            title="Test Patent",
            semantic_score=0.75,
            prior_art_score=0.68,
            relevance_reason="Shares resonant circuit topology",
            overlapping_concepts=["resonance", "wireless charging"],
        )
        d = hit.to_dict()
        assert d["patent_number"] == "US1234"
        assert d["semantic_score"] == 0.75
        assert "resonance" in d["overlapping_concepts"]

    def test_merge_hit_accumulates_claim_matches(self):
        from app.semantic.prior_art import _merge_hit, PriorArtHit
        store: dict = {}
        h1 = PriorArtHit(patent_id="x", patent_number="US1", title="T", semantic_score=0.8)
        h1.matched_claims = [1]
        _merge_hit(store, h1)

        h2 = PriorArtHit(patent_id="x", patent_number="US1", title="T", semantic_score=0.9)
        h2.matched_claims = [2, 3]
        _merge_hit(store, h2)

        merged = store["US1"]
        assert merged.semantic_score == 0.9  # max
        assert set(merged.matched_claims) == {1, 2, 3}


# ═══════════════════════════════════════════════════════════════════════════════
# 6. Semantic API endpoints
# ═══════════════════════════════════════════════════════════════════════════════

class TestSemanticAPI:

    @pytest.fixture
    def client(self):
        from app.main import app
        from app.api.deps import get_current_user, get_elasticsearch_client
        from app.models.user import User, UserRole
        from fastapi.testclient import TestClient

        app.router.lifespan_context = _noop_lifespan

        async def _user():
            return User(id="u1", email="test@test.com", role=UserRole.analyst, name="Tester")

        async def _es():
            return AsyncMock()

        app.dependency_overrides[get_current_user] = _user
        app.dependency_overrides[get_elasticsearch_client] = _es
        with TestClient(app) as c:
            yield c
        app.dependency_overrides.clear()

    def test_health_endpoint(self, client):
        mock_provider = MagicMock()
        mock_provider.backend = "tfidf"
        mock_provider._model_name = "tfidf-fallback"
        mock_provider.dimension = 1536

        with patch("app.api.semantic.router.get_embedding_provider", return_value=mock_provider), \
             patch("app.api.semantic.router.get_weaviate_client", return_value=None, create=True):
            # Patch the import inside the health function at runtime
            with patch.object(
                __import__("app.api.semantic.router", fromlist=["router"]),
                "__builtins__",
                __builtins__,
            ):
                resp = client.get("/api/v1/semantic/health")
                # Health endpoint imports weaviate_client inside the function
                assert resp.status_code == 200
                data = resp.json()
                assert "embedding_backend" in data

    def test_embed_endpoint(self, client):
        from app.semantic.embedding_provider import EmbeddingProvider
        mock_provider = MagicMock()
        mock_provider.backend = "tfidf"
        mock_provider._model_name = "tfidf-fallback"
        mock_provider.embed = AsyncMock(return_value=[0.1] * 1536)

        with patch("app.api.semantic.router.get_embedding_provider", return_value=mock_provider):
            resp = client.post("/api/v1/semantic/embed", json={"text": "battery system"})
            assert resp.status_code == 200
            data = resp.json()
            assert data["vector_length"] == 1536
            assert "sample" in data

    def test_search_endpoint(self, client):
        mock_response = MagicMock()
        mock_response.to_dict.return_value = {
            "query": "battery",
            "results": [],
            "total": 0,
            "took_ms": 5.0,
            "strategies_used": ["keyword"],
            "vector_backend": "tfidf",
            "cached": False,
        }

        with patch("app.api.semantic.router.get_search_engine") as mock_eng:
            instance = mock_eng.return_value
            instance.search = AsyncMock(return_value=mock_response)

            resp = client.post("/api/v1/semantic/search", json={"query": "battery"})
            assert resp.status_code == 200
            data = resp.json()
            assert data["query"] == "battery"

    def test_stats_endpoint(self, client):
        with patch("app.api.semantic.router.collection_stats", new_callable=AsyncMock,
                   return_value={"PatentAbstract": 1500, "PatentClaim": 8200, "PatentFull": 1500}):
            resp = client.get("/api/v1/semantic/stats")
            assert resp.status_code == 200
            data = resp.json()
            assert "collections" in data
            assert data["collections"]["PatentAbstract"] == 1500
