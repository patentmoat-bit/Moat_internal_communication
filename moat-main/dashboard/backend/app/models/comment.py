from sqlalchemy import Column, Text, Boolean, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
from app.core.security import generate_uuid


class Comment(Base):
    __tablename__ = "comments"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    patent_id = Column(UUID(as_uuid=False), ForeignKey("patents.id"), nullable=False)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    parent_id = Column(UUID(as_uuid=False), ForeignKey("comments.id"), nullable=True)
    is_resolved = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", lazy="joined")
    patent = relationship("Patent", lazy="joined")
    replies = relationship("Comment", lazy="joined", remote_side=[id])
