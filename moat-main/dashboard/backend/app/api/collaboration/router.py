from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.collaboration import (
    CommentCreate, CommentResponse, CommentListResponse,
    ApprovalCreate, ApprovalResponse, ApprovalAction, ApprovalListResponse,
    NotificationResponse, NotificationListResponse,
    AuditLogResponse, AuditLogListResponse,
    ShareCollectionRequest,
)
from app.services.collaboration.service import CollaborationService
from app.services.collections.service import CollectionService
from app.repositories.user_repository import UserRepository

router = APIRouter(prefix="/collaboration", tags=["collaboration"])


@router.post("/comments", response_model=CommentResponse)
async def add_comment(
    request: CommentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = CollaborationService(db, current_user)
    comment = await service.create_comment(request.patent_id, request.content, request.parent_id)
    await service.create_audit_log("comment.created", "patent", request.patent_id)
    return CommentResponse(**service._comment_to_response(comment))


@router.get("/comments/{patent_id}", response_model=CommentListResponse)
async def get_comments(
    patent_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = CollaborationService(db, current_user)
    comments = await service.get_comments(patent_id)
    return CommentListResponse(
        comments=[CommentResponse(**service._comment_to_response(c)) for c in comments],
        total=len(comments),
    )


@router.post("/comments/{comment_id}/resolve", response_model=CommentResponse)
async def resolve_comment(
    comment_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = CollaborationService(db, current_user)
    comment = await service.resolve_comment(comment_id)
    return CommentResponse(**service._comment_to_response(comment))


@router.post("/approvals", response_model=ApprovalResponse)
async def create_approval(
    request: ApprovalCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = CollaborationService(db, current_user)
    approval = await service.create_approval(request.patent_id, request.notes)
    await service.create_audit_log("approval.created", "patent", request.patent_id)
    return ApprovalResponse(**service._approval_to_response(approval))


@router.get("/approvals", response_model=ApprovalListResponse)
async def list_approvals(
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = CollaborationService(db, current_user)
    approvals = await service.get_approvals(status)
    return ApprovalListResponse(
        approvals=[ApprovalResponse(**service._approval_to_response(a)) for a in approvals],
        total=len(approvals),
    )


@router.post("/approvals/{approval_id}/review", response_model=ApprovalResponse)
async def review_approval(
    approval_id: str,
    action: ApprovalAction,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = CollaborationService(db, current_user)
    approval = await service.review_approval(approval_id, action.status, action.notes)
    await service.create_audit_log(f"approval.{action.status}", "patent", approval.patent_id)
    return ApprovalResponse(**service._approval_to_response(approval))


@router.get("/notifications", response_model=NotificationListResponse)
async def list_notifications(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = CollaborationService(db, current_user)
    notifications = await service.get_notifications()
    unread = await service.get_unread_count()
    return NotificationListResponse(
        notifications=[NotificationResponse(**service._notification_to_response(n)) for n in notifications],
        unread_count=unread,
        total=len(notifications),
    )


@router.post("/notifications/{notification_id}/read", response_model=NotificationResponse)
async def mark_notification_read(
    notification_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = CollaborationService(db, current_user)
    notification = await service.mark_notification_read(notification_id)
    return NotificationResponse(**service._notification_to_response(notification))


@router.post("/notifications/read-all")
async def mark_all_notifications_read(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = CollaborationService(db, current_user)
    await service.mark_all_read()
    return {"status": "ok"}


@router.post("/share-collection")
async def share_collection(
    request: ShareCollectionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user_repo = UserRepository(db)
    target = await user_repo.get_by_email(request.user_email)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    collection_service = CollectionService(db)
    collection = await collection_service.get_collection(request.collection_id)
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")

    collab_service = CollaborationService(db, current_user)
    await collab_service.create_notification(
        user_id=target.id,
        type="collection_shared",
        title=f"Collection shared with you",
        message=f"{current_user.name} shared '{collection.name}' with you",
        link=f"/dashboard/collections/{collection.id}",
    )
    await collab_service.create_audit_log(
        "collection.shared", "collection", collection.id,
        {"shared_with": target.email, "permission": request.permission},
    )
    return {"status": "ok", "shared_with": target.email, "permission": request.permission}


@router.get("/audit-logs", response_model=AuditLogListResponse)
async def list_audit_logs(
    page: int = 1,
    page_size: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = CollaborationService(db, current_user)
    logs, total = await service.get_audit_logs(page, page_size)
    return AuditLogListResponse(
        logs=[AuditLogResponse(**service._audit_log_to_response(l)) for l in logs],
        total=total,
        page=page,
        page_size=page_size,
    )
