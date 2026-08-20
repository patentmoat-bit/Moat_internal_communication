from datetime import datetime, timezone

from sqlalchemy import String, Text, Integer, DateTime, JSON, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.core.security import generate_uuid


class SearchHistory(Base):
    __tablename__ = "search_history"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, default=generate_uuid
    )
    user_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    query: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    filters: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    result_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    took_ms: Mapped[float | None] = mapped_column(Integer, nullable=True)
    search_type: Mapped[str | None] = mapped_column(String(64), default="fulltext", nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
