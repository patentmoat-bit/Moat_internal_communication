from sqlalchemy import Column, String, Text, Boolean, ForeignKey, DateTime, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base
from app.core.security import generate_uuid


class ApprovalStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class Approval(Base):
    __tablename__ = "approvals"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    patent_id = Column(UUID(as_uuid=False), ForeignKey("patents.id"), nullable=False)
    requester_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    reviewer_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=True)
    status = Column(SAEnum(ApprovalStatus), default=ApprovalStatus.pending, nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    requester = relationship("User", foreign_keys=[requester_id], lazy="joined")
    reviewer = relationship("User", foreign_keys=[reviewer_id], lazy="joined")
    patent = relationship("Patent", lazy="joined")
