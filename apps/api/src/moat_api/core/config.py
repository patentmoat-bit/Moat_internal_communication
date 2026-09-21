from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="MOAT_",
        env_file=(".env", "apps/api/.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    env: Literal["development", "staging", "production"] = "development"
    log_level: str = "info"

    database_dsn: str = "postgresql+psycopg://postgres:postgres@localhost:5432/moat"
    migration_dsn: str = "postgresql://postgres:postgres@localhost:5432/moat"

    session_secret: str = Field(
        default="dev-only-secret-key-that-is-at-least-32-chars-long-for-testing",
        min_length=32,
    )
    session_ttl_hours: int = 12

    # Login attempt budgets, per five-minute window.
    #
    # Per account: tight, because guessing one person's password is the attack.
    # Per source address: loose, because an office behind one NAT gateway
    # shares an egress IP and a tight limit locks out colleagues who did
    # nothing wrong.
    #
    # Raised in development so a test suite can authenticate repeatedly;
    # validate_for_env refuses to start production above the safe ceiling.
    login_max_per_account: int = 10
    login_max_per_address: int = 120
    cookie_secure: bool = False

    auth_mode: Literal["oidc", "dev"] = "dev"
    oidc_issuer: str = ""
    oidc_client_id: str = ""
    oidc_client_secret: str = ""
    oidc_redirect_uri: str = ""

    web_origin: str = "http://localhost:3000"

    opensearch_url: str = "http://localhost:9200"
    opensearch_timeout_seconds: float = 10.0

    # Static embedding model, loaded in-process. Empty disables vector search
    # and retrieval degrades to BM25, which every stored result records.
    embedding_model: str = "minishlab/potion-base-8M"

    # Perplexity Pro AI Engine
    perplexity_api_key: str = ""
    perplexity_model: str = "sonar-pro"
    perplexity_api_url: str = "https://api.perplexity.ai/chat/completions"

    # USPTO Open IP Data
    uspto_api_url: str = "https://api.patentsview.org"

    s3_endpoint: str = ""
    s3_access_key: str = ""
    s3_secret_key: str = ""
    s3_bucket: str = "moat-documents"
    # Object endpoint the BROWSER can reach, if direct uploads are enabled.
    # Empty means uploads stream through the API instead.
    s3_public_endpoint: str = ""
    s3_region: str = "us-east-1"
    upload_max_bytes: int = 104_857_600
    upload_max_pages: int = 1000
    upload_url_ttl_seconds: int = 900

    # Document conversion runs a full office suite, so it lives in its own
    # isolated service rather than inside the API (design doc §2).
    gotenberg_url: str = "http://localhost:3002"
    gotenberg_timeout_seconds: float = 60.0

    temporal_address: str = "localhost:7233"
    temporal_namespace: str = "default"

    # Per-tenant admission caps (design doc §9). Configurable per tenant later;
    # these are the global defaults.
    max_running_analyses: int = 2
    max_pending_analyses: int = 20
    max_running_extractions: int = 2
    max_pending_documents: int = 100

    otel_enabled: bool = False
    otel_endpoint: str = ""

    @property
    def is_production(self) -> bool:
        return self.env == "production"

    @field_validator("session_secret")
    @classmethod
    def _reject_placeholder_secret(cls, value: str) -> str:
        if "change-me" in value.lower() and not value.startswith("dev-only"):
            raise ValueError("MOAT_SESSION_SECRET is still a placeholder")
        return value

    def validate_for_env(self) -> None:
        """Fail fast on configurations that are unsafe outside development.

        These are start-up refusals on purpose: a misconfigured auth mode or an
        insecure cookie flag is the kind of mistake that is invisible until it
        is exploited, so the process must not come up at all.
        """
        if not self.is_production:
            return

        problems: list[str] = []
        if self.auth_mode != "oidc":
            problems.append("auth_mode must be 'oidc' in production")
        if not self.cookie_secure:
            problems.append("cookie_secure must be true in production")
        if self.session_secret.startswith("dev-only"):
            problems.append("session_secret is still the development value")
        if not self.oidc_issuer or not self.oidc_client_id:
            problems.append("oidc issuer and client id are required")
        if self.web_origin.startswith("http://"):
            problems.append("web_origin must be https in production")
        if self.login_max_per_account > 10:
            problems.append(
                f"login_max_per_account is {self.login_max_per_account}; production "
                f"must not exceed 10 attempts per five minutes per account"
            )
        if self.login_max_per_address > 200:
            problems.append("login_max_per_address must not exceed 200 in production")
        if problems:
            raise RuntimeError("Unsafe production configuration: " + "; ".join(problems))


@lru_cache
def get_settings() -> Settings:
    settings = Settings()  # type: ignore[call-arg]
    settings.validate_for_env()
    return settings
