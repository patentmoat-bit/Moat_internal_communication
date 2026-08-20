from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class CommentCreate(BaseModel):
    patent_id: str
    content: str
    parent_id: Optional[str] = None


class CommentResponse(BaseModel):
    id: str
    patent_id: str
    user_id: str
    user_name: str
    content: str
    parent_id: Optional[str] = None
    is_resolved: bool
    created_at: datetime
    replies: list["CommentResponse"] = []


class CommentListResponse(BaseModel):
    comments: list[CommentResponse]
    total: int


class ApprovalCreate(BaseModel):
    patent_id: str
    notes: Optional[str] = None


class ApprovalResponse(BaseModel):
    id: str
    patent_id: str
    patent_number: str
    patent_title: str
    requester_id: str
    requester_name: str
    reviewer_id: Optional[str] = None
    reviewer_name: Optional[str] = None
    status: str
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class ApprovalAction(BaseModel):
    status: str
    notes: Optional[str] = None


class ApprovalListResponse(BaseModel):
    approvals: list[ApprovalResponse]
    total: int


class NotificationResponse(BaseModel):
    id: str
    type: str
    title: str
    message: Optional[str] = None
    link: Optional[str] = None
    is_read: bool
    created_at: datetime


class NotificationListResponse(BaseModel):
    notifications: list[NotificationResponse]
    unread_count: int
    total: int


class AuditLogResponse(BaseModel):
    id: str
    user_id: Optional[str] = None
    user_name: Optional[str] = None
    action: str
    resource_type: str
    resource_id: Optional[str] = None
    details: Optional[dict] = None
    created_at: datetime


class AuditLogListResponse(BaseModel):
    logs: list[AuditLogResponse]
    total: int
    page: int
    page_size: int


class ShareCollectionRequest(BaseModel):
    collection_id: str
    user_email: str
    permission: str = "view"
