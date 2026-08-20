import enum
from datetime import datetime, timezone

from sqlalchemy import String, Text, Integer, DateTime, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.core.security import generate_uuid


class AlertType(str, enum.Enum):
    new_patent = "new_patent"
    citation = "citation"
    competitor = "competitor"
    keyword = "keyword"
    status_change = "status_change"


class AlertFrequency(str, enum.Enum):
    realtime = "realtime"
    daily = "daily"
    weekly = "weekly"


class AlertChannel(str, enum.Enum):
    email = "email"
    in_app = "in_app"
    both = "both"


class AlertStatus(str, enum.Enum):
    active = "active"
    paused = "paused"
    expired = "expired"


class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, default=generate_uuid
    )
    user_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    alert_type: Mapped[str] = mapped_column(
        Enum(AlertType, name="alert_type"), nullable=False
    )
    query: Mapped[str | None] = mapped_column(Text, nullable=True)
    threshold: Mapped[int | None] = mapped_column(Integer, nullable=True)
    frequency: Mapped[str] = mapped_column(
        Enum(AlertFrequency, name="alert_frequency"), default=AlertFrequency.daily, nullable=False
    )
    channel: Mapped[str] = mapped_column(
        Enum(AlertChannel, name="alert_channel"), default=AlertChannel.in_app, nullable=False
    )
    status: Mapped[str] = mapped_column(
        Enum(AlertStatus, name="alert_status"), default=AlertStatus.active, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    user = relationship("User", back_populates="alerts")
