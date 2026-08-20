from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import BadRequestException, ConflictException, ForbiddenException, NotFoundException
from app.models.audit_log import AuditLog
from app.models.matter import (
    Matter,
    MatterActivity,
    MatterDocument,
    MatterMember,
    MatterMemberRole,
    MatterStatus,
    MatterStatusHistory,
)
from app.models.user import User, UserRole
from app.repositories.matter_repository import MatterRepository
from app.schemas.matter import (
    MatterCreate,
    MatterDocumentCreate,
    MatterMemberCreate,
    MatterMemberUpdate,
    MatterNotesUpdate,
    MatterShareRequest,
    MatterStatusUpdate,
    MatterUpdate,
)

READ_ROLES = {MatterMemberRole.owner, MatterMemberRole.manager, MatterMemberRole.contributor, MatterMemberRole.viewer}
WRITE_ROLES = {MatterMemberRole.owner, MatterMemberRole.manager, MatterMemberRole.contributor}
MANAGE_ROLES = {MatterMemberRole.owner, MatterMemberRole.manager}
CREATE_PLATFORM_ROLES = {UserRole.admin, UserRole.analyst, UserRole.researcher}


class MatterService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.repo = MatterRepository(db)

    async def _role_for(self, matter: Matter, user: User) -> MatterMemberRole | None:
        if user.role == UserRole.admin:
            return MatterMemberRole.owner
        if matter.owner_id == user.id:
            return MatterMemberRole.owner
        membership = await self.repo.membership(matter.id, user.id)
        return membership.role if membership else None

    async def _ensure_access(self, matter_id: str, user: User, allowed: set[MatterMemberRole] = READ_ROLES) -> tuple[Matter, MatterMemberRole]:
        matter = await self.repo.get(matter_id)
        if not matter:
            raise NotFoundException("Matter not found")
        role = await self._role_for(matter, user)
        if not role or role not in allowed:
            raise ForbiddenException("Access denied to this matter")
        return matter, role

    async def _resolve_user(self, payload: MatterMemberCreate | MatterShareRequest) -> User:
        user = await self.repo.resolve_user(payload.user_id, str(payload.email) if payload.email else None)
        if not user:
            raise NotFoundException("User not found")
        return user

    async def _record_activity(self, matter_id: str, actor_id: str | None, action: str, entity_type: str, message: str, entity_id: str | None = None, details: dict | None = None) -> None:
        self.db.add(MatterActivity(matter_id=matter_id, actor_id=actor_id, action=action, entity_type=entity_type, entity_id=entity_id, message=message, details=details))

    async def _record_audit(self, user_id: str | None, action: str, resource_type: str, resource_id: str | None, details: dict | None = None) -> None:
        self.db.add(AuditLog(user_id=user_id, action=action, resource_type=resource_type, resource_id=resource_id, details=details or {}))

    async def _serialize_matter(self, matter: Matter, user: User) -> dict:
        role = await self._role_for(matter, user) or MatterMemberRole.viewer
        member_count, document_count, activity_count = await self.repo.counts(matter.id)
        if member_count == 0 and matter.owner_id:
            member_count = 1
        return {
            "id": matter.id,
            "workspace_id": matter.workspace_id,
            "owner_id": matter.owner_id,
            "owner_name": getattr(matter.owner, "name", None),
            "matter_number": matter.matter_number,
            "title": matter.title,
            "description": matter.description,
            "client_name": matter.client_name,
            "technology_area": matter.technology_area,
            "notes": matter.notes,
            "status": matter.status,
            "priority": matter.priority,
            "due_date": matter.due_date,
            "tags": matter.tags or [],
            "created_at": matter.created_at,
            "updated_at": matter.updated_at,
            "role": role,
            "member_count": member_count,
            "document_count": document_count,
            "activity_count": activity_count,
        }

    def _serialize_member(self, member: MatterMember) -> dict:
        return {"id": member.id, "matter_id": member.matter_id, "user_id": member.user_id, "role": member.role, "joined_at": member.joined_at, "user_name": getattr(member.user, "name", None), "user_email": getattr(member.user, "email", None)}

    def _serialize_document(self, document: MatterDocument) -> dict:
        return {"id": document.id, "matter_id": document.matter_id, "uploaded_by_id": document.uploaded_by_id, "filename": document.filename, "document_type": document.document_type, "content_type": document.content_type, "size_bytes": document.size_bytes, "storage_url": document.storage_url, "description": document.description, "created_at": document.created_at, "uploaded_by_name": getattr(document.uploaded_by, "name", None)}

    def _serialize_activity(self, activity: MatterActivity) -> dict:
        return {"id": activity.id, "matter_id": activity.matter_id, "actor_id": activity.actor_id, "actor_name": getattr(activity.actor, "name", None), "action": activity.action, "entity_type": activity.entity_type, "entity_id": activity.entity_id, "message": activity.message, "details": activity.details, "created_at": activity.created_at}

    def _serialize_status_history(self, history: MatterStatusHistory) -> dict:
        return {"id": history.id, "matter_id": history.matter_id, "from_status": history.from_status, "to_status": history.to_status, "changed_by_id": history.changed_by_id, "changed_by_name": getattr(history.changed_by, "name", None), "note": history.note, "created_at": history.created_at}

    async def list_matters(self, user: User) -> list[dict]:
        matters = await self.repo.list_for_user(user)
        return [await self._serialize_matter(matter, user) for matter in matters]

    async def get_matter(self, matter_id: str, user: User) -> dict:
        await self._ensure_access(matter_id, user)
        matter = await self.repo.get(matter_id, include_detail=True)
        if not matter:
            raise NotFoundException("Matter not found")
        base = await self._serialize_matter(matter, user)
        base.update({
            "members": [self._serialize_member(member) for member in sorted(matter.members, key=lambda item: item.joined_at)],
            "documents": [self._serialize_document(document) for document in sorted(matter.documents, key=lambda item: item.created_at, reverse=True)],
            "activity": [self._serialize_activity(item) for item in sorted(matter.activity, key=lambda item: item.created_at, reverse=True)],
            "status_history": [self._serialize_status_history(item) for item in sorted(matter.status_history, key=lambda item: item.created_at, reverse=True)],
        })
        return base

    async def create_matter(self, data: MatterCreate, user: User) -> dict:
        if user.role not in CREATE_PLATFORM_ROLES:
            raise ForbiddenException("Matter creation requires admin, analyst, or researcher role")
        matter_number = data.matter_number or await self.repo.next_matter_number()
        existing_result = await self.db.execute(select(Matter).where(Matter.matter_number == matter_number))
        if existing_result.scalar_one_or_none():
            raise ConflictException("Matter number already exists")
        matter = Matter(
            workspace_id=data.workspace_id,
            owner_id=user.id,
            matter_number=matter_number,
            title=data.title,
            description=data.description,
            client_name=data.client_name,
            technology_area=data.technology_area,
            notes=data.notes,
            status=data.status,
            priority=data.priority,
            due_date=data.due_date,
            tags=data.tags,
        )
        self.db.add(matter)
        await self.db.flush()
        self.db.add(MatterMember(matter_id=matter.id, user_id=user.id, role=MatterMemberRole.owner, assigned_by_id=user.id))
        self.db.add(MatterStatusHistory(matter_id=matter.id, from_status=None, to_status=matter.status, changed_by_id=user.id, note="Matter created"))
        await self._record_activity(matter.id, user.id, "matter.created", "matter", f"Created matter {matter.matter_number}", matter.id)
        await self._record_audit(user.id, "matter.created", "matter", matter.id, {"matter_number": matter.matter_number, "title": matter.title})
        await self.db.flush()
        await self.db.refresh(matter)
        return await self._serialize_matter(matter, user)

    async def update_matter(self, matter_id: str, data: MatterUpdate, user: User) -> dict:
        matter, _ = await self._ensure_access(matter_id, user, WRITE_ROLES)
        updates = data.model_dump(exclude_unset=True)
        status_value = updates.pop("status", None)
        changes: dict = {}
        for field, value in updates.items():
            old_value = getattr(matter, field)
            if old_value != value:
                setattr(matter, field, value)
                changes[field] = {"from": old_value, "to": value}
        if status_value is not None and status_value != matter.status:
            await self._change_status(matter, status_value, user, "Status updated while editing matter")
            changes["status"] = {"from": matter.status, "to": status_value}
        if changes:
            await self._record_activity(matter.id, user.id, "matter.updated", "matter", f"Updated matter {matter.matter_number}", matter.id, changes)
            await self._record_audit(user.id, "matter.updated", "matter", matter.id, changes)
        await self.db.flush()
        await self.db.refresh(matter)
        return await self._serialize_matter(matter, user)

    async def delete_matter(self, matter_id: str, user: User) -> None:
        matter, _ = await self._ensure_access(matter_id, user, {MatterMemberRole.owner})
        await self._record_audit(user.id, "matter.deleted", "matter", matter.id, {"matter_number": matter.matter_number})
        await self.db.delete(matter)
        await self.db.flush()

    async def list_members(self, matter_id: str, user: User) -> list[dict]:
        await self._ensure_access(matter_id, user)
        result = await self.db.execute(select(MatterMember).options(selectinload(MatterMember.user)).where(MatterMember.matter_id == matter_id).order_by(MatterMember.joined_at.asc()))
        return [self._serialize_member(member) for member in result.scalars().all()]

    async def add_member(self, matter_id: str, data: MatterMemberCreate | MatterShareRequest, user: User) -> dict:
        matter, _ = await self._ensure_access(matter_id, user, MANAGE_ROLES)
        target = await self._resolve_user(data)
        if await self.repo.membership(matter_id, target.id):
            raise ConflictException("User is already assigned to this matter")
        member = MatterMember(matter_id=matter_id, user_id=target.id, role=data.role, assigned_by_id=user.id)
        self.db.add(member)
        await self.db.flush()
        await self._record_activity(matter_id, user.id, "matter.member_added", "matter_member", f"Assigned {target.name} as {data.role.value}", member.id, {"user_id": target.id, "role": data.role.value})
        await self._record_audit(user.id, "matter.member_added", "matter_member", member.id, {"matter_id": matter.id, "user_id": target.id, "role": data.role.value})
        await self.db.flush()
        await self.db.refresh(member)
        member.user = target
        return self._serialize_member(member)

    async def update_member(self, matter_id: str, member_id: str, data: MatterMemberUpdate, user: User) -> dict:
        await self._ensure_access(matter_id, user, MANAGE_ROLES)
        member = await self.repo.member_by_id(matter_id, member_id)
        if not member:
            raise NotFoundException("Matter member not found")
        if member.role == MatterMemberRole.owner and data.role != MatterMemberRole.owner:
            owners = await self.db.execute(select(MatterMember).where(MatterMember.matter_id == matter_id, MatterMember.role == MatterMemberRole.owner))
            if len(owners.scalars().all()) <= 1:
                raise BadRequestException("Matter must keep at least one owner")
        old_role = member.role
        member.role = data.role
        await self._record_activity(matter_id, user.id, "matter.member_updated", "matter_member", f"Changed member role to {data.role.value}", member.id, {"from": old_role.value, "to": data.role.value})
        await self.db.flush()
        await self.db.refresh(member)
        return self._serialize_member(member)

    async def remove_member(self, matter_id: str, member_id: str, user: User) -> None:
        await self._ensure_access(matter_id, user, MANAGE_ROLES)
        member = await self.repo.member_by_id(matter_id, member_id)
        if not member:
            raise NotFoundException("Matter member not found")
        if member.role == MatterMemberRole.owner:
            owners = await self.db.execute(select(MatterMember).where(MatterMember.matter_id == matter_id, MatterMember.role == MatterMemberRole.owner))
            if len(owners.scalars().all()) <= 1:
                raise BadRequestException("Matter must keep at least one owner")
        await self._record_activity(matter_id, user.id, "matter.member_removed", "matter_member", "Removed matter member", member.id, {"user_id": member.user_id})
        await self.db.delete(member)
        await self.db.flush()

    async def _change_status(self, matter: Matter, status: MatterStatus, user: User, note: str | None = None) -> None:
        previous = matter.status
        matter.status = status
        self.db.add(MatterStatusHistory(matter_id=matter.id, from_status=previous, to_status=status, changed_by_id=user.id, note=note))
        await self._record_activity(matter.id, user.id, "matter.status_changed", "matter", f"Changed status from {previous.value} to {status.value}", matter.id, {"from": previous.value, "to": status.value, "note": note})

    async def update_status(self, matter_id: str, data: MatterStatusUpdate, user: User) -> dict:
        matter, _ = await self._ensure_access(matter_id, user, WRITE_ROLES)
        if data.status != matter.status:
            await self._change_status(matter, data.status, user, data.note)
            await self._record_audit(user.id, "matter.status_changed", "matter", matter.id, {"to": data.status.value, "note": data.note})
        await self.db.flush()
        await self.db.refresh(matter)
        return await self._serialize_matter(matter, user)

    async def update_notes(self, matter_id: str, data: MatterNotesUpdate, user: User) -> dict:
        matter, _ = await self._ensure_access(matter_id, user, WRITE_ROLES)
        matter.notes = data.notes
        await self._record_activity(matter_id, user.id, "matter.notes_updated", "matter", "Updated matter notes", matter_id)
        await self.db.flush()
        await self.db.refresh(matter)
        return await self._serialize_matter(matter, user)

    async def list_activity(self, matter_id: str, user: User, limit: int = 50) -> list[dict]:
        await self._ensure_access(matter_id, user)
        result = await self.db.execute(select(MatterActivity).options(selectinload(MatterActivity.actor)).where(MatterActivity.matter_id == matter_id).order_by(MatterActivity.created_at.desc()).limit(limit))
        return [self._serialize_activity(item) for item in result.scalars().all()]

    async def list_documents(self, matter_id: str, user: User) -> list[dict]:
        await self._ensure_access(matter_id, user)
        result = await self.db.execute(select(MatterDocument).options(selectinload(MatterDocument.uploaded_by)).where(MatterDocument.matter_id == matter_id).order_by(MatterDocument.created_at.desc()))
        return [self._serialize_document(item) for item in result.scalars().all()]

    async def add_document(self, matter_id: str, data: MatterDocumentCreate, user: User) -> dict:
        await self._ensure_access(matter_id, user, WRITE_ROLES)
        document = MatterDocument(matter_id=matter_id, uploaded_by_id=user.id, filename=data.filename, document_type=data.document_type, content_type=data.content_type, size_bytes=data.size_bytes, storage_url=data.storage_url, description=data.description)
        self.db.add(document)
        await self.db.flush()
        await self._record_activity(matter_id, user.id, "matter.document_added", "matter_document", f"Attached {data.filename}", document.id, {"filename": data.filename, "document_type": data.document_type.value})
        await self.db.flush()
        await self.db.refresh(document)
        document.uploaded_by = user
        return self._serialize_document(document)

    async def delete_document(self, matter_id: str, document_id: str, user: User) -> None:
        await self._ensure_access(matter_id, user, WRITE_ROLES)
        document = await self.repo.document_by_id(matter_id, document_id)
        if not document:
            raise NotFoundException("Matter document not found")
        await self._record_activity(matter_id, user.id, "matter.document_removed", "matter_document", f"Removed {document.filename}", document.id)
        await self.db.delete(document)
        await self.db.flush()
