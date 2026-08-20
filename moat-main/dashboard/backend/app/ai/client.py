import weaviate
import weaviate.classes as wvc
from openai import AsyncOpenAI
from app.config import settings

openai_client: AsyncOpenAI | None = None
weaviate_client: weaviate.WeaviateClient | None = None


def get_openai_client() -> AsyncOpenAI:
    global openai_client
    if openai_client is None:
        api_key = settings.OPENAI_API_KEY
        if api_key:
            openai_client = AsyncOpenAI(api_key=api_key)
    return openai_client


def get_weaviate_client() -> weaviate.WeaviateClient | None:
    global weaviate_client
    if weaviate_client is None:
        try:
            weaviate_client = weaviate.connect_to_custom(
                http_host=settings.WEAVIATE_HOST,
                http_port=settings.WEAVIATE_HTTP_PORT,
                http_secure=False,
                grpc_host=settings.WEAVIATE_HOST,
                grpc_port=settings.WEAVIATE_GRPC_PORT,
                grpc_secure=False,
            )
            if not weaviate_client.is_ready():
                weaviate_client = None
                return None
        except Exception:
            weaviate_client = None
            return None
    return weaviate_client


async def close_weaviate():
    global weaviate_client
    if weaviate_client is not None:
        weaviate_client.close()
        weaviate_client = None
