from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from app.models.comment import Comment
from app.models.approval import Approval, ApprovalStatus
from app.models.notification import Notification
from app.models.audit_log import AuditLog
from app.models.user import User
from app.models.patent import Patent
from app.repositories.patent_repository import PatentRepository
from app.core.exceptions import NotFoundException, BadRequestException, ForbiddenException
from datetime import datetime, timezone
from typing import Optional


class CollaborationService:
    def __init__(self, db: AsyncSession, current_user: User | None = None):
        self.db = db
        self.current_user = current_user

    async def create_comment(self, patent_id: str, content: str, parent_id: str | None = None) -> Comment:
        if not content.strip():
            raise BadRequestException("Comment content cannot be empty")

        comment = Comment(
            patent_id=patent_id,
            user_id=self.current_user.id,
            content=content.strip(),
            parent_id=parent_id,
        )
        self.db.add(comment)
        await self.db.flush()
        await self.db.refresh(comment)
        return comment

    async def get_comments(self, patent_id: str) -> list[Comment]:
        stmt = (
            select(Comment)
            .where(Comment.patent_id == patent_id, Comment.parent_id.is_(None))
            .order_by(desc(Comment.created_at))
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def resolve_comment(self, comment_id: str) -> Comment:
        stmt = select(Comment).where(Comment.id == comment_id)
        result = await self.db.execute(stmt)
        comment = result.scalar_one_or_none()
        if not comment:
            raise NotFoundException("Comment not found")
        comment.is_resolved = True
        await self.db.flush()
        return comment

    async def create_approval(self, patent_id: str, notes: str | None = None) -> Approval:
        approval = Approval(
            patent_id=patent_id,
            requester_id=self.current_user.id,
            status=ApprovalStatus.pending,
            notes=notes,
        )
        self.db.add(approval)
        await self.db.flush()
        await self.db.refresh(approval)
        return approval

    async def get_approvals(self, status: str | None = None) -> list[Approval]:
        stmt = select(Approval)
        if status:
            stmt = stmt.where(Approval.status == status)
        stmt = stmt.order_by(desc(Approval.created_at))
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def review_approval(self, approval_id: str, decision: str, notes: str | None = None) -> Approval:
        stmt = select(Approval).where(Approval.id == approval_id)
        result = await self.db.execute(stmt)
        approval = result.scalar_one_or_none()
        if not approval:
            raise NotFoundException("Approval not found")
        if approval.status != ApprovalStatus.pending:
            raise BadRequestException("Approval has already been reviewed")

        if decision not in ("approved", "rejected"):
            raise BadRequestException("Decision must be 'approved' or 'rejected'")

        approval.status = ApprovalStatus(decision)
        approval.reviewer_id = self.current_user.id
        if notes:
            approval.notes = notes
        await self.db.flush()
        await self.db.refresh(approval)
        return approval

    async def create_notification(self, user_id: str, type: str, title: str, message: str | None = None, link: str | None = None) -> Notification:
        notification = Notification(
            user_id=user_id,
            type=type,
            title=title,
            message=message,
            link=link,
        )
        self.db.add(notification)
        await self.db.flush()
        return notification

    async def get_notifications(self, limit: int = 20) -> list[Notification]:
        stmt = (
            select(Notification)
            .where(Notification.user_id == self.current_user.id)
            .order_by(desc(Notification.created_at))
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_unread_count(self) -> int:
        stmt = (
            select(func.count())
            .select_from(Notification)
            .where(Notification.user_id == self.current_user.id, Notification.is_read == False)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def mark_notification_read(self, notification_id: str) -> Notification:
        stmt = select(Notification).where(Notification.id == notification_id, Notification.user_id == self.current_user.id)
        result = await self.db.execute(stmt)
        notification = result.scalar_one_or_none()
        if not notification:
            raise NotFoundException("Notification not found")
        notification.is_read = True
        await self.db.flush()
        return notification

    async def mark_all_read(self):
        stmt = (
            select(Notification)
            .where(Notification.user_id == self.current_user.id, Notification.is_read == False)
        )
        result = await self.db.execute(stmt)
        notifications = list(result.scalars().all())
        for n in notifications:
            n.is_read = True
        await self.db.flush()

    async def create_audit_log(self, action: str, resource_type: str, resource_id: str | None = None, details: dict | None = None, ip_address: str | None = None) -> AuditLog:
        log = AuditLog(
            user_id=self.current_user.id if self.current_user else None,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details,
            ip_address=ip_address,
        )
        self.db.add(log)
        await self.db.flush()
        return log

    async def get_audit_logs(self, page: int = 1, page_size: int = 50) -> tuple[list[AuditLog], int]:
        count_stmt = select(func.count()).select_from(AuditLog)
        total_result = await self.db.execute(count_stmt)
        total = total_result.scalar_one()

        stmt = select(AuditLog).order_by(desc(AuditLog.created_at))
        stmt = stmt.offset((page - 1) * page_size).limit(page_size)
        result = await self.db.execute(stmt)
        return list(result.scalars().all()), total

    def _comment_to_response(self, comment: Comment) -> dict:
        replies = []
        for r in getattr(comment, "replies", []) or []:
            replies.append(self._comment_to_response(r))
        return {
            "id": comment.id,
            "patent_id": comment.patent_id,
            "user_id": comment.user_id,
            "user_name": comment.user.name if comment.user else "Unknown",
            "content": comment.content,
            "parent_id": comment.parent_id,
            "is_resolved": comment.is_resolved,
            "created_at": comment.created_at,
            "replies": replies,
        }

    def _approval_to_response(self, approval: Approval) -> dict:
        patent = approval.patent
        return {
            "id": approval.id,
            "patent_id": approval.patent_id,
            "patent_number": patent.patent_number if patent else "",
            "patent_title": patent.title if patent else "",
            "requester_id": approval.requester_id,
            "requester_name": approval.requester.name if approval.requester else "Unknown",
            "reviewer_id": approval.reviewer_id,
            "reviewer_name": approval.reviewer.name if approval.reviewer else None,
            "status": approval.status.value,
            "notes": approval.notes,
            "created_at": approval.created_at,
            "updated_at": approval.updated_at,
        }

    def _notification_to_response(self, notification: Notification) -> dict:
        return {
            "id": notification.id,
            "type": notification.type,
            "title": notification.title,
            "message": notification.message,
            "link": notification.link,
            "is_read": notification.is_read,
            "created_at": notification.created_at,
        }

    def _audit_log_to_response(self, log: AuditLog) -> dict:
        return {
            "id": log.id,
            "user_id": log.user_id,
            "user_name": "Unknown",
            "action": log.action,
            "resource_type": log.resource_type,
            "resource_id": log.resource_id,
            "details": log.details,
            "created_at": log.created_at,
        }
