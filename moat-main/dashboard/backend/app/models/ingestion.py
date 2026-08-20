import enum
from datetime import datetime, timezone

from sqlalchemy import String, Text, Integer, Float, Enum, DateTime, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, synonym

from app.database import Base
from app.core.security import generate_uuid


class IngestionStatus(str, enum.Enum):
    pending = "pending"
    processing = "processing"
    completed = "completed"
    failed = "failed"
    partially_completed = "partially_completed"


class IngestionSource(str, enum.Enum):
    upload = "upload"
    uspto = "uspto"
    epo = "epo"
    wipo = "wipo"
    patentsview = "patentsview"
    batch = "batch"
    api = "api"


class IngestionJob(Base):
    __tablename__ = "ingestion_jobs"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, default=generate_uuid
    )
    patent_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False), nullable=True, index=True
    )
    patent_number: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    source: Mapped[str] = mapped_column(
        Enum(IngestionSource, name="ingestion_source"), nullable=False
    )
    status: Mapped[str] = mapped_column(
        Enum(IngestionStatus, name="ingestion_status"), default=IngestionStatus.pending, nullable=False
    )
    pipeline_time_ms: Mapped[float | None] = mapped_column(Float, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    error_details: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    validation_errors: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    source_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    file_name: Mapped[str | None] = mapped_column(String(512), nullable=True)
    file_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    retry_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    job_metadata: Mapped[dict | None] = mapped_column("metadata", JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
