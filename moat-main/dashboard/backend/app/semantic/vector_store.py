"""
Vector Store — Weaviate collection management for patent semantic search.

Manages three separate collections:
  - PatentAbstract  : abstract-level vectors (fast, coarse search)
  - PatentClaim     : individual claim-level vectors (precise, granular)
  - PatentFull      : combined title+abstract+claims (general search)

Each collection uses Weaviate's native vectorizer or explicit vector insert.
"""

from __future__ import annotations

import json
import uuid
from typing import Any

import weaviate
import weaviate.classes as wvc
from weaviate.classes.config import Configure, Property, DataType

from app.ai.client import get_weaviate_client
from app.config import settings
from app.core.logging import logger

# ── Collection names ──────────────────────────────────────────────────────────
COLLECTION_ABSTRACT = "PatentAbstract"
COLLECTION_CLAIM = "PatentClaim"
COLLECTION_FULL = "PatentFull"

ALL_COLLECTIONS = [COLLECTION_ABSTRACT, COLLECTION_CLAIM, COLLECTION_FULL]


# ── Schema definitions ────────────────────────────────────────────────────────

_SHARED_PROPS = [
    Property(name="patent_id",       data_type=DataType.TEXT, skip_vectorization=True),
    Property(name="patent_number",   data_type=DataType.TEXT, skip_vectorization=True),
    Property(name="title",           data_type=DataType.TEXT),
    Property(name="assignee",        data_type=DataType.TEXT, skip_vectorization=True),
    Property(name="filing_date",     data_type=DataType.TEXT, skip_vectorization=True),
    Property(name="publication_date",data_type=DataType.TEXT, skip_vectorization=True),
    Property(name="source",          data_type=DataType.TEXT, skip_vectorization=True),
    Property(name="cpc_codes",       data_type=DataType.TEXT, skip_vectorization=True),
    Property(name="citation_count",  data_type=DataType.INT,  skip_vectorization=True),
]

_COLLECTION_SCHEMAS: dict[str, dict] = {
    COLLECTION_ABSTRACT: {
        "properties": _SHARED_PROPS + [
            Property(name="abstract", data_type=DataType.TEXT),
        ],
        "description": "Patent abstract embeddings for coarse semantic search",
    },
    COLLECTION_CLAIM: {
        "properties": _SHARED_PROPS + [
            Property(name="claim_text",   data_type=DataType.TEXT),
            Property(name="claim_number", data_type=DataType.INT,  skip_vectorization=True),
            Property(name="claim_type",   data_type=DataType.TEXT, skip_vectorization=True),  # independent | dependent
        ],
        "description": "Individual patent claim embeddings for granular prior-art matching",
    },
    COLLECTION_FULL: {
        "properties": _SHARED_PROPS + [
            Property(name="abstract",    data_type=DataType.TEXT),
            Property(name="claims_text", data_type=DataType.TEXT),
            Property(name="full_text",   data_type=DataType.TEXT),
        ],
        "description": "Combined patent embeddings for general hybrid search",
    },
}


# ── Ensure collections exist ─────────────────────────────────────────────────

async def ensure_collections(use_openai_vectorizer: bool | None = None) -> bool:
    """
    Create Weaviate collections if they don't exist yet.

    When *use_openai_vectorizer* is True (and OPENAI_API_KEY is set) Weaviate
    handles embedding generation automatically.  When False, vectors are
    supplied explicitly (sentence-transformers path).
    """
    client = get_weaviate_client()
    if client is None:
        logger.warning("Weaviate not available – skipping collection setup")
        return False

    auto_vectorize = (
        use_openai_vectorizer is True
        or (use_openai_vectorizer is None and bool(settings.OPENAI_API_KEY))
    )

    created_any = False
    for name, schema in _COLLECTION_SCHEMAS.items():
        if client.collections.exists(name):
            continue
        try:
            vec_cfg = (
                Configure.Vectorizer.text2vec_openai(model=settings.EMBEDDING_MODEL)
                if auto_vectorize
                else Configure.Vectorizer.none()
            )
            client.collections.create(
                name=name,
                description=schema["description"],
                vectorizer_config=vec_cfg,
                properties=schema["properties"],
            )
            logger.info(f"Created Weaviate collection: {name}")
            created_any = True
        except Exception as exc:
            logger.error(f"Failed to create collection {name}: {exc}")
            return False

    return True


# ── Upsert helpers ────────────────────────────────────────────────────────────

async def upsert_patent_abstract(
    patent_id: str,
    patent_number: str,
    title: str,
    abstract: str,
    assignee: str = "",
    filing_date: str = "",
    publication_date: str = "",
    source: str = "",
    cpc_codes: str = "",
    citation_count: int = 0,
    vector: list[float] | None = None,
) -> bool:
    """Insert or replace the abstract-level vector for a patent."""
    client = get_weaviate_client()
    if client is None:
        return False
    try:
        col = client.collections.get(COLLECTION_ABSTRACT)
        _delete_by_patent_id(col, patent_id)
        props = dict(
            patent_id=patent_id, patent_number=patent_number, title=title,
            abstract=abstract, assignee=assignee, filing_date=filing_date,
            publication_date=publication_date, source=source,
            cpc_codes=cpc_codes, citation_count=citation_count,
        )
        col.data.insert(properties=props, vector=vector or None)
        return True
    except Exception as exc:
        logger.error(f"upsert_patent_abstract failed for {patent_number}: {exc}")
        return False


async def upsert_patent_claims(
    patent_id: str,
    patent_number: str,
    title: str,
    claims: list[dict],        # [{"number": 1, "text": "...", "type": "independent"}]
    assignee: str = "",
    filing_date: str = "",
    publication_date: str = "",
    source: str = "",
    cpc_codes: str = "",
    citation_count: int = 0,
    vectors: list[list[float]] | None = None,
) -> bool:
    """Insert individual claim vectors. Existing claims for this patent are replaced."""
    client = get_weaviate_client()
    if client is None:
        return False
    try:
        col = client.collections.get(COLLECTION_CLAIM)
        _delete_by_patent_id(col, patent_id)

        with col.batch.dynamic() as batch:
            for idx, claim in enumerate(claims):
                vec = (vectors[idx] if vectors and idx < len(vectors) else None)
                props = dict(
                    patent_id=patent_id, patent_number=patent_number, title=title,
                    claim_text=claim.get("text", ""),
                    claim_number=claim.get("number", idx + 1),
                    claim_type=claim.get("type", "independent"),
                    assignee=assignee, filing_date=filing_date,
                    publication_date=publication_date, source=source,
                    cpc_codes=cpc_codes, citation_count=citation_count,
                )
                batch.add_object(properties=props, vector=vec or None)
        return True
    except Exception as exc:
        logger.error(f"upsert_patent_claims failed for {patent_number}: {exc}")
        return False


async def upsert_patent_full(
    patent_id: str,
    patent_number: str,
    title: str,
    abstract: str,
    claims_text: str,
    assignee: str = "",
    filing_date: str = "",
    publication_date: str = "",
    source: str = "",
    cpc_codes: str = "",
    citation_count: int = 0,
    vector: list[float] | None = None,
) -> bool:
    """Insert full combined vector."""
    client = get_weaviate_client()
    if client is None:
        return False
    try:
        col = client.collections.get(COLLECTION_FULL)
        _delete_by_patent_id(col, patent_id)
        full_text = f"{title}\n{abstract}\n{claims_text}"
        props = dict(
            patent_id=patent_id, patent_number=patent_number, title=title,
            abstract=abstract, claims_text=claims_text, full_text=full_text,
            assignee=assignee, filing_date=filing_date,
            publication_date=publication_date, source=source,
            cpc_codes=cpc_codes, citation_count=citation_count,
        )
        col.data.insert(properties=props, vector=vector or None)
        return True
    except Exception as exc:
        logger.error(f"upsert_patent_full failed for {patent_number}: {exc}")
        return False


# ── Vector search helpers ─────────────────────────────────────────────────────

async def vector_search(
    collection_name: str,
    vector: list[float],
    limit: int = 20,
    filters: dict | None = None,
    return_properties: list[str] | None = None,
) -> list[dict]:
    """
    Perform a near-vector search on *collection_name*.
    Returns a list of result dicts with 'score' and 'properties'.
    """
    client = get_weaviate_client()
    if client is None:
        return []
    try:
        col = client.collections.get(collection_name)
        wv_filter = _build_filter(filters) if filters else None
        resp = col.query.near_vector(
            near_vector=vector,
            limit=limit,
            filters=wv_filter,
            return_metadata=wvc.query.MetadataQuery(certainty=True, distance=True),
        )
        results = []
        for obj in resp.objects:
            certainty = obj.metadata.certainty if obj.metadata else 0.0
            results.append({
                "score": float(certainty or 0.0),
                "distance": float(obj.metadata.distance if obj.metadata else 1.0),
                "properties": obj.properties,
                "uuid": str(obj.uuid),
            })
        return results
    except Exception as exc:
        logger.error(f"vector_search failed on {collection_name}: {exc}")
        return []


async def text_search_weaviate(
    collection_name: str,
    query: str,
    limit: int = 20,
    filters: dict | None = None,
) -> list[dict]:
    """near_text search (uses Weaviate's built-in vectorizer)."""
    client = get_weaviate_client()
    if client is None:
        return []
    try:
        col = client.collections.get(collection_name)
        wv_filter = _build_filter(filters) if filters else None
        resp = col.query.near_text(
            query=query,
            limit=limit,
            filters=wv_filter,
            return_metadata=wvc.query.MetadataQuery(certainty=True),
        )
        return [
            {
                "score": float(o.metadata.certainty if o.metadata else 0.0),
                "properties": o.properties,
                "uuid": str(o.uuid),
            }
            for o in resp.objects
        ]
    except Exception as exc:
        logger.error(f"text_search_weaviate failed on {collection_name}: {exc}")
        return []


async def delete_patent(patent_id: str) -> bool:
    """Remove all vectors for a patent across all collections."""
    client = get_weaviate_client()
    if client is None:
        return False
    ok = True
    for name in ALL_COLLECTIONS:
        try:
            if client.collections.exists(name):
                col = client.collections.get(name)
                _delete_by_patent_id(col, patent_id)
        except Exception as exc:
            logger.warning(f"delete_patent error in {name}: {exc}")
            ok = False
    return ok


async def collection_stats() -> dict:
    """Return object counts per collection."""
    client = get_weaviate_client()
    if client is None:
        return {}
    stats: dict[str, int] = {}
    for name in ALL_COLLECTIONS:
        try:
            if client.collections.exists(name):
                col = client.collections.get(name)
                agg = col.aggregate.over_all(total_count=True)
                stats[name] = agg.total_count or 0
            else:
                stats[name] = -1  # not created
        except Exception:
            stats[name] = -1
    return stats


# ── Internal helpers ──────────────────────────────────────────────────────────

def _delete_by_patent_id(collection: Any, patent_id: str) -> None:
    try:
        collection.data.delete_many(
            where=wvc.query.Filter.by_property("patent_id").equal(patent_id)
        )
    except Exception:
        pass  # May not exist yet


def _build_filter(filters: dict) -> Any:
    """Convert a simple key→value dict to Weaviate Filter objects."""
    conditions = []
    for key, value in filters.items():
        if isinstance(value, list):
            conditions.append(
                wvc.query.Filter.by_property(key).contains_any(value)
            )
        elif isinstance(value, str) and value.startswith(">="):
            conditions.append(
                wvc.query.Filter.by_property(key).greater_or_equal(value[2:])
            )
        elif isinstance(value, str) and value.startswith("<="):
            conditions.append(
                wvc.query.Filter.by_property(key).less_or_equal(value[2:])
            )
        else:
            conditions.append(
                wvc.query.Filter.by_property(key).equal(str(value))
            )
    if not conditions:
        return None
    combined = conditions[0]
    for c in conditions[1:]:
        combined = combined & c
    return combined
