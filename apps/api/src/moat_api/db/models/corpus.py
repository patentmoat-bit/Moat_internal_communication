from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import Computed, Date, DateTime, String, Text, text
from sqlalchemy.dialects.postgresql import ARRAY, TSVECTOR
from sqlalchemy.orm import Mapped, mapped_column

from moat_api.db.base import Base, PrimaryKeyMixin

SEARCH_VECTOR_SQL = (
    "setweight(to_tsvector('english', coalesce(title, '')), 'A') || "
    "setweight(to_tsvector('english', coalesce(abstract, '')), 'B') || "
    "setweight(to_tsvector('english', coalesce(claims_text, '')), 'C')"
)


class Publication(Base, PrimaryKeyMixin):
    """A published patent document.

    Public art, shared by every tenant, so this table carries no tenant_id and
    no row policy. Written only by import jobs; the application role holds
    SELECT and nothing else.
    """

    __tablename__ = "publications"

    publication_id: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    abstract: Mapped[str] = mapped_column(Text, server_default="", nullable=False)
    claims_text: Mapped[str] = mapped_column(Text, server_default="", nullable=False)
    applicant: Mapped[str] = mapped_column(String(300), server_default="", nullable=False)
    jurisdiction: Mapped[str] = mapped_column(String(8), nullable=False)
    kind_code: Mapped[str] = mapped_column(String(8), server_default="", nullable=False)
    published_on: Mapped[date | None] = mapped_column(Date, nullable=True)
    classifications: Mapped[list[str]] = mapped_column(
        ARRAY(String(32)), server_default=text("'{}'::varchar[]"), nullable=False
    )
    source: Mapped[str] = mapped_column(String(64), server_default="", nullable=False)
    corpus_revision: Mapped[str] = mapped_column(String(64), server_default="", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()"), nullable=False
    )

    # Derived by Postgres, so it cannot drift from the text it indexes.
    search_vector: Mapped[str] = mapped_column(
        TSVECTOR, Computed(SEARCH_VECTOR_SQL, persisted=True), nullable=True
    )
