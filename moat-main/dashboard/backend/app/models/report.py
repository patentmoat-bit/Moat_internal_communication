from sqlalchemy import Column, String, Text, Boolean, ForeignKey, DateTime, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base
from app.core.security import generate_uuid


class ReportStatus(str, enum.Enum):
    PENDING = "pending"
    GENERATING = "generating"
    COMPLETED = "completed"
    FAILED = "failed"


class ReportFormat(str, enum.Enum):
    PDF = "pdf"
    XLSX = "xlsx"
    AI = "ai"


class Report(Base):
    __tablename__ = "reports"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    report_type = Column(String(64), nullable=True)
    format = Column(SAEnum(ReportFormat), nullable=False, default=ReportFormat.PDF)
    status = Column(SAEnum(ReportStatus), nullable=False, default=ReportStatus.PENDING)
    patent_ids = Column(Text, nullable=True)
    file_url = Column(String(500), nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    generated_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", lazy="joined")


class ScheduledReportSchedule(str, enum.Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"


class ScheduledReport(Base):
    __tablename__ = "scheduled_reports"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    query = Column(Text, nullable=True)
    filters = Column(Text, nullable=True)
    schedule = Column(SAEnum(ScheduledReportSchedule), nullable=False, default=ScheduledReportSchedule.WEEKLY)
    format = Column(SAEnum(ReportFormat), nullable=False, default=ReportFormat.PDF)
    recipients = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    last_run_at = Column(DateTime(timezone=True), nullable=True)
    next_run_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", lazy="joined")
