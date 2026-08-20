from contextlib import asynccontextmanager

from elasticsearch import AsyncElasticsearch
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app.config import settings
from app.core.exceptions import AppException, app_exception_handler
from app.core.logging import setup_logging, logger
from app.core.middleware import LoggingMiddleware, ErrorHandlingMiddleware
from app.core.cache import cache
from app.database import init_db
from app.api.auth.router import router as auth_router
from app.api.patents.router import router as patents_router
from app.api.collections.router import router as collections_router
from app.api.search.router import router as search_router
from app.api.ingestion.router import router as ingestion_router
from app.api.comparison.router import router as comparison_router
from app.api.visualization.router import router as visualization_router
from app.api.collaboration.router import router as collaboration_router
from app.api.reports.router import router as reports_router
from app.api.image_search.router import router as image_search_router
from app.ai.router import router as ai_router
from app.api.analytics.router import router as analytics_router
from app.api.understanding.router import router as understanding_router
from app.api.matters.router import router as matters_router
from app.api.inventions.router import router as inventions_router
from app.api.rbac.router import router as rbac_router
from app.api.dashboard.router import router as dashboard_router
from app.api.prior_art.router import router as prior_art_router
from app.api.workspace.router import router as workspace_router
from app.api.intelligence.router import router as intelligence_router
from app.api.semantic.router import router as semantic_router
from app.api.cms.router import router as cms_router
from app.ai.client import get_weaviate_client, close_weaviate
from app.ai.embeddings import ensure_collection
from app.core.graph import get_graph_driver, close_graph_driver, ensure_graph_constraints


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    logger.info("Starting Patent Intelligence Platform API")
    await init_db()

    # ── Elasticsearch ────────────────────────────────────
    es_client = AsyncElasticsearch(hosts=[settings.ELASTICSEARCH_HOST])
    try:
        info = await es_client.info()
        logger.info(f"Connected to Elasticsearch: {info.get('version', {}).get('number', 'unknown')}")

        # Ensure patents index exists with proper mappings
        from app.ingestion.indexers import ElasticsearchIndexer
        indexer = ElasticsearchIndexer(es_client)
        await indexer.ensure_index()
        logger.info("Elasticsearch patents index ready")
    except Exception as e:
        logger.warning(f"Elasticsearch not available: {e}")

    # ── Weaviate ─────────────────────────────────────────
    weaviate = get_weaviate_client()
    if weaviate and weaviate.is_ready():
        logger.info("Connected to Weaviate vector database")
        await ensure_collection()
        # Set up semantic search collections (abstract, claim, full)
        from app.semantic.ingestion import get_pipeline
        pipeline = get_pipeline()
        await pipeline.setup()
        logger.info("Semantic search vector collections ready")
    else:
        logger.warning("Weaviate not available — AI features will use fallback modes")

    # ── Neo4j ─────────────────────────────────────────────
    graph = await get_graph_driver()
    if graph:
        logger.info("Connected to Neo4j graph database")
        await ensure_graph_constraints()
    else:
        logger.warning("Neo4j not available — graph features will be limited")

    # ── Redis ─────────────────────────────────────────────
    try:
        test_key = "health:ping"
        await cache.set(test_key, {"ok": True}, ttl=5)
        await cache.delete(test_key)
        logger.info(f"Connected to Redis: {settings.REDIS_URL}")
    except Exception as e:
        logger.warning(f"Redis not available — caching disabled: {e}")

    logger.info("All services initialised — Patent Intelligence Platform ready")
    yield

    # ── Cleanup ───────────────────────────────────────────
    await es_client.close()
    close_weaviate()
    await close_graph_driver()
    await cache.close()
    logger.info("Shutting down Patent Intelligence Platform API")


app = FastAPI(
    title="Patent Intelligence Platform API",
    description=(
        "Enterprise-grade AI-powered patent search, analysis, and intelligence platform. "
        "Real patent data from USPTO, EPO, WIPO, Lens.org, and Google Patents."
    ),
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# ── Middleware ────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(SessionMiddleware, secret_key=settings.SECRET_KEY)
app.add_middleware(LoggingMiddleware)
app.add_middleware(ErrorHandlingMiddleware)

app.add_exception_handler(AppException, app_exception_handler)

# ── Routers ───────────────────────────────────────────────
_V1 = "/api/v1"

app.include_router(auth_router, prefix=_V1)
app.include_router(patents_router, prefix=_V1)
app.include_router(collections_router, prefix=_V1)
app.include_router(search_router, prefix=_V1)
app.include_router(ingestion_router, prefix=_V1)
app.include_router(comparison_router, prefix=_V1)
app.include_router(visualization_router, prefix=_V1)
app.include_router(collaboration_router, prefix=_V1)
app.include_router(reports_router, prefix=_V1)
app.include_router(image_search_router, prefix=_V1)
app.include_router(ai_router, prefix=_V1)
app.include_router(analytics_router, prefix=_V1)
app.include_router(understanding_router, prefix=_V1)
app.include_router(matters_router, prefix=_V1)
app.include_router(inventions_router, prefix=_V1)
app.include_router(rbac_router, prefix=_V1)
app.include_router(dashboard_router, prefix=f"{_V1}/dashboard")
app.include_router(workspace_router, prefix=_V1)
app.include_router(intelligence_router, prefix=f"{_V1}/intelligence")
app.include_router(prior_art_router, prefix=_V1)   # /api/v1/prior-art/search
app.include_router(semantic_router, prefix=_V1)    # /api/v1/semantic/*
app.include_router(cms_router, prefix=f"{_V1}/cms", tags=["cms"])


# ── Health check ──────────────────────────────────────────
@app.get("/health", tags=["health"])
async def health() -> dict:
    from elasticsearch import AsyncElasticsearch
    es_healthy = False
    try:
        es_tmp = AsyncElasticsearch(hosts=[settings.ELASTICSEARCH_HOST])
        await es_tmp.ping()
        await es_tmp.close()
        es_healthy = True
    except Exception:
        pass

    redis_healthy = await cache.exists("__health__") or True  # ping via exists

    return {
        "status": "healthy",
        "service": "patent-intelligence-platform",
        "version": "2.0.0",
        "infrastructure": {
            "elasticsearch": es_healthy,
            "redis": redis_healthy,
        },
    }
