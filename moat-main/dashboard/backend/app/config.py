from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import model_validator
from pathlib import Path


_INSECURE_DEFAULT_SECRET_KEY = "your-secret-key-here"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).resolve().parent.parent / ".env"),
        case_sensitive=False,
        extra="ignore",
    )

    # ── Core DB / Infra ───────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://user:password@localhost:5432/patent_db"
    ELASTICSEARCH_HOST: str = "http://localhost:9200"
    REDIS_URL: str = "redis://localhost:6379"

    # ── Environment ─────────────────────────────────────────
    ENVIRONMENT: str = "development"

    # ── Auth ──────────────────────────────────────────────
    SECRET_KEY: str = _INSECURE_DEFAULT_SECRET_KEY
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ── CORS / Frontend ─────────────────────────────────────
    # Comma-separated list of allowed origins, e.g. "https://app.example.com,https://admin.example.com"
    CORS_ORIGINS: str = "http://localhost:3000"
    FRONTEND_URL: str = "http://localhost:3000"

    # ── Weaviate ──────────────────────────────────────────
    WEAVIATE_HOST: str = "localhost"
    WEAVIATE_PORT: int = 8080
    WEAVIATE_GRPC_PORT: int = 50051
    WEAVIATE_HTTP_PORT: int = 8080

    # ── Neo4j ─────────────────────────────────────────────
    NEO4J_URI: str = "bolt://localhost:7687"
    NEO4J_USER: str = "neo4j"
    NEO4J_PASSWORD: str = "password"

    # ── AI / LLM ──────────────────────────────────────────
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    EMBEDDING_MODEL: str = "text-embedding-3-small"

    # ── Semantic / Vector search ───────────────────────────
    # Local sentence-transformers model (patent-tuned SPECTER or fast MiniLM)
    LOCAL_EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    FORCE_OPENAI_EMBEDDINGS: bool = False
    # RRF hybrid ranking weights
    SEMANTIC_WEIGHT_SEMANTIC: float = 0.45
    SEMANTIC_WEIGHT_KEYWORD: float = 0.30
    SEMANTIC_WEIGHT_CITATION: float = 0.15
    SEMANTIC_WEIGHT_NOVELTY: float = 0.10

    # ── Patent Source APIs ────────────────────────────────
    # USPTO / PatentsView
    PATENTSVIEW_API_KEY: str = ""

    # EPO Open Patent Services
    EPO_CONSUMER_KEY: str = ""
    EPO_CONSUMER_SECRET: str = ""

    # Lens.org  (free key at https://www.lens.org/lens/user/subscriptions#developer)
    LENS_API_KEY: str = ""

    # SerpAPI  (for Google Patents — https://serpapi.com/)
    SERPAPI_KEY: str = ""

    # WIPO PATENTSCOPE (no key required for basic access)
    WIPO_API_KEY: str = ""

    # ── Computed properties ───────────────────────────────
    @property
    def refresh_token_expire_minutes(self) -> int:
        return self.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60

    @property
    def weaviate_url(self) -> str:
        return f"http://{self.WEAVIATE_HOST}:{self.WEAVIATE_PORT}"

    @property
    def weaviate_grpc_url(self) -> str:
        return f"{self.WEAVIATE_HOST}:{self.WEAVIATE_GRPC_PORT}"

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    # ── Validation ────────────────────────────────────────
    @model_validator(mode="after")
    def _check_secret_key(self) -> "Settings":
        is_dev_like = self.ENVIRONMENT.lower() in ("development", "test", "testing", "dev")
        if self.SECRET_KEY == _INSECURE_DEFAULT_SECRET_KEY and not is_dev_like:
            raise RuntimeError(
                "SECRET_KEY is unset or using the insecure default value. "
                "Set a strong SECRET_KEY via environment variable before running "
                "outside development/test (ENVIRONMENT=development to bypass locally)."
            )
        return self


settings = Settings()
