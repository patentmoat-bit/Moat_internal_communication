import weaviate.classes as wvc
from app.config import settings
from app.ai.client import get_openai_client, get_weaviate_client
from app.core.logging import logger

PATENT_COLLECTION_NAME = "Patent"
IMAGE_COLLECTION_NAME = "PatentImage"
EMBEDDING_DIMENSION = 1536


async def ensure_collection():
    client = get_weaviate_client()
    if client is None:
        logger.warning("Weaviate not available, skipping collection setup")
        return False

    if not client.collections.exists(PATENT_COLLECTION_NAME):
        client.collections.create(
            name=PATENT_COLLECTION_NAME,
            vectorizer_config=wvc.config.Configure.Vectorizer.text2vec_openai(
                model=settings.EMBEDDING_MODEL,
                type_=None,
            ),
            generative_config=wvc.config.Configure.Generative.openai(
                model=settings.OPENAI_MODEL,
            ),
            properties=[
                wvc.config.Property(name="patent_id", data_type=wvc.config.DataType.TEXT),
                wvc.config.Property(name="patent_number", data_type=wvc.config.DataType.TEXT),
                wvc.config.Property(name="title", data_type=wvc.config.DataType.TEXT),
                wvc.config.Property(name="abstract", data_type=wvc.config.DataType.TEXT),
                wvc.config.Property(name="claims", data_type=wvc.config.DataType.TEXT),
                wvc.config.Property(name="assignee", data_type=wvc.config.DataType.TEXT),
                wvc.config.Property(name="inventors", data_type=wvc.config.DataType.TEXT),
                wvc.config.Property(name="filing_date", data_type=wvc.config.DataType.TEXT),
                wvc.config.Property(name="publication_date", data_type=wvc.config.DataType.TEXT),
                wvc.config.Property(name="cpc_classifications", data_type=wvc.config.DataType.TEXT),
                wvc.config.Property(name="ipc_classifications", data_type=wvc.config.DataType.TEXT),
                wvc.config.Property(name="status", data_type=wvc.config.DataType.TEXT),
                wvc.config.Property(name="citation_count", data_type=wvc.config.DataType.INT),
            ],
        )
        logger.info(f"Created Weaviate collection: {PATENT_COLLECTION_NAME}")

    if not client.collections.exists(IMAGE_COLLECTION_NAME):
        client.collections.create(
            name=IMAGE_COLLECTION_NAME,
            vectorizer_config=wvc.config.Configure.Vectorizer.text2vec_openai(
                model=settings.EMBEDDING_MODEL,
                type_=None,
            ),
            properties=[
                wvc.config.Property(name="patent_id", data_type=wvc.config.DataType.TEXT),
                wvc.config.Property(name="patent_number", data_type=wvc.config.DataType.TEXT),
                wvc.config.Property(name="image_url", data_type=wvc.config.DataType.TEXT),
                wvc.config.Property(name="description", data_type=wvc.config.DataType.TEXT),
                wvc.config.Property(name="visual_features", data_type=wvc.config.DataType.TEXT),
            ],
        )
        logger.info(f"Created Weaviate collection: {IMAGE_COLLECTION_NAME}")

    return True


async def index_patent(
    patent_id: str,
    patent_number: str,
    title: str,
    abstract: str,
    claims: str | None = None,
    assignee: str | None = None,
    inventors: str | None = None,
    filing_date: str | None = None,
    publication_date: str | None = None,
    cpc_classifications: str | None = None,
    ipc_classifications: str | None = None,
    status: str | None = None,
    citation_count: int = 0,
) -> bool:
    client = get_weaviate_client()
    if client is None:
        return False

    try:
        collection = client.collections.get(PATENT_COLLECTION_NAME)
        text_for_embedding = f"{title}\n{abstract}\n{claims or ''}"
        collection.data.insert(
            properties={
                "patent_id": patent_id,
                "patent_number": patent_number,
                "title": title,
                "abstract": abstract,
                "claims": claims or "",
                "assignee": assignee or "",
                "inventors": inventors or "",
                "filing_date": filing_date or "",
                "publication_date": publication_date or "",
                "cpc_classifications": cpc_classifications or "",
                "ipc_classifications": ipc_classifications or "",
                "status": status or "",
                "citation_count": citation_count,
            },
            vector=None,
        )
        logger.debug(f"Indexed patent {patent_number} in Weaviate")
        return True
    except Exception as e:
        logger.error(f"Failed to index patent {patent_number} in Weaviate: {e}")
        return False


async def remove_patent(patent_id: str) -> bool:
    client = get_weaviate_client()
    if client is None:
        return False

    try:
        collection = client.collections.get(PATENT_COLLECTION_NAME)
        collection.data.delete_many(
            where=wvc.query.Filter.by_property("patent_id").equal(patent_id)
        )
        return True
    except Exception as e:
        logger.error(f"Failed to remove patent {patent_id} from Weaviate: {e}")
        return False


async def search_semantic(
    query: str,
    limit: int = 20,
    filters: dict | None = None,
) -> list[dict]:
    client = get_weaviate_client()
    if client is None:
        return []

    try:
        collection = client.collections.get(PATENT_COLLECTION_NAME)

        weaviate_filters = None
        if filters:
            conditions = []
            for key, value in filters.items():
                if key in ("assignee", "status", "cpc_classifications", "ipc_classifications"):
                    conditions.append(
                        wvc.query.Filter.by_property(key).contains_any(value if isinstance(value, list) else [value])
                    )
            if conditions:
                combined = conditions[0]
                for c in conditions[1:]:
                    combined = combined & c
                weaviate_filters = combined

        response = collection.query.near_text(
            query=query,
            limit=limit,
            return_metadata=wvc.query.MetadataQuery(certainty=True),
            filters=weaviate_filters,
        )

        results = []
        for obj in response.objects:
            results.append({
                "patent_id": obj.properties.get("patent_id", ""),
                "patent_number": obj.properties.get("patent_number", ""),
                "title": obj.properties.get("title", ""),
                "abstract": obj.properties.get("abstract", ""),
                "score": obj.metadata.certainty if obj.metadata else 0.0,
            })
        return results
    except Exception as e:
        logger.error(f"Semantic search failed: {e}")
        return []


async def search_image_semantic(
    query: str,
    limit: int = 20,
    filters: dict | None = None,
) -> list[dict]:
    client = get_weaviate_client()
    if client is None:
        return []

    try:
        collection = client.collections.get(IMAGE_COLLECTION_NAME)
        weaviate_filters = None
        # Add basic filtering logic if needed (e.g. by patent_number or other fields)
        response = collection.query.near_text(
            query=query,
            limit=limit,
            return_metadata=wvc.query.MetadataQuery(certainty=True),
            filters=weaviate_filters,
        )

        results = []
        for obj in response.objects:
            results.append({
                "patent_id": obj.properties.get("patent_id", ""),
                "patent_number": obj.properties.get("patent_number", ""),
                "image_url": obj.properties.get("image_url", ""),
                "description": obj.properties.get("description", ""),
                "score": obj.metadata.certainty if obj.metadata else 0.0,
            })
        return results
    except Exception as e:
        logger.error(f"Image semantic search failed: {e}")
        return []


async def get_patent_embedding(patent_id: str) -> list[float] | None:
    client = get_weaviate_client()
    if client is None:
        return None

    try:
        collection = client.collections.get(PATENT_COLLECTION_NAME)
        response = collection.query.fetch_objects(
            where=wvc.query.Filter.by_property("patent_id").equal(patent_id),
            limit=1,
            return_vector=True,
        )
        if response.objects:
            return response.objects[0].vector.get("default")
        return None
    except Exception:
        return None
