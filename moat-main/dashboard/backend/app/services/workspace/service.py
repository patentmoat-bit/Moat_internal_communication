from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import NotFoundException, ForbiddenException, ConflictException, BadRequestException
from app.models.audit_log import AuditLog
from app.models.user import User
from app.models.workspace import (
    Workspace,
    WorkspaceActivity,
    WorkspaceMember,
    WorkspaceProject,
    WorkspaceRole,
)
from app.schemas.workspace import (
    WorkspaceCreate,
    WorkspaceMemberCreate,
    WorkspaceMemberUpdate,
    WorkspaceProjectCreate,
    WorkspaceProjectUpdate,
    WorkspaceUpdate,
)

READ_ROLES = {WorkspaceRole.owner, WorkspaceRole.admin, WorkspaceRole.editor, WorkspaceRole.viewer}
WRITE_ROLES = {WorkspaceRole.owner, WorkspaceRole.admin, WorkspaceRole.editor}
ADMIN_ROLES = {WorkspaceRole.owner, WorkspaceRole.admin}


class WorkspaceService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def _get_membership(self, workspace_id: str, user_id: str) -> WorkspaceMember | None:
        result = await self.db.execute(
            select(WorkspaceMember).where(
                WorkspaceMember.workspace_id == workspace_id,
                WorkspaceMember.user_id == user_id,
            )
        )
        return result.scalar_one_or_none()

    async def _ensure_member(
        self,
        workspace_id: str,
        user_id: str,
        allowed_roles: set[WorkspaceRole] = READ_ROLES,
    ) -> tuple[Workspace, WorkspaceRole]:
        result = await self.db.execute(select(Workspace).where(Workspace.id == workspace_id))
        workspace = result.scalar_one_or_none()
        if not workspace:
            raise NotFoundException("Workspace not found")

        if workspace.owner_id == user_id:
            return workspace, WorkspaceRole.owner

        membership = await self._get_membership(workspace_id, user_id)
        if not membership or membership.role not in allowed_roles:
            raise ForbiddenException("Access denied to this workspace")
        return workspace, membership.role

    async def _get_user(self, user_id: str) -> User:
        result = await self.db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            raise NotFoundException("User not found")
        return user

    async def _resolve_user(self, user_id: str | None, email: str | None) -> User:
        if not user_id and not email:
            raise BadRequestException("Provide user_id or email")
        filters = []
        if user_id:
            filters.append(User.id == user_id)
        if email:
            filters.append(User.email == email)
        result = await self.db.execute(select(User).where(or_(*filters)))
        user = result.scalar_one_or_none()
        if not user:
            raise NotFoundException("User not found")
        return user

    async def _record_activity(
        self,
        workspace_id: str,
        actor_id: str | None,
        action: str,
        entity_type: str,
        message: str,
        entity_id: str | None = None,
    ) -> None:
        self.db.add(
            WorkspaceActivity(
                workspace_id=workspace_id,
                actor_id=actor_id,
                action=action,
                entity_type=entity_type,
                entity_id=entity_id,
                message=message,
            )
        )

    async def _record_audit(
        self,
        workspace_id: str,
        user_id: str | None,
        action: str,
        resource_type: str,
        resource_id: str | None = None,
        details: dict | None = None,
    ) -> None:
        merged_details = {"workspace_id": workspace_id, **(details or {})}
        self.db.add(
            AuditLog(
                user_id=user_id,
                action=action,
                resource_type=resource_type,
                resource_id=resource_id,
                details=merged_details,
            )
        )

    async def _serialize_workspace(self, workspace: Workspace, user_id: str) -> dict:
        role = WorkspaceRole.owner if workspace.owner_id == user_id else WorkspaceRole.viewer
        membership = await self._get_membership(workspace.id, user_id)
        if membership:
            role = membership.role

        counts = await self.db.execute(
            select(
                func.count(WorkspaceMember.id),
                select(func.count(WorkspaceProject.id))
                .where(WorkspaceProject.workspace_id == workspace.id)
                .scalar_subquery(),
            ).where(WorkspaceMember.workspace_id == workspace.id)
        )
        member_count, project_count = counts.one()
        if member_count == 0 and workspace.owner_id:
            member_count = 1

        return {
            "id": workspace.id,
            "name": workspace.name,
            "description": workspace.description,
            "notes": workspace.notes,
            "owner_id": workspace.owner_id,
            "created_at": workspace.created_at,
            "updated_at": workspace.updated_at,
            "role": role,
            "member_count": member_count,
            "project_count": project_count,
        }

    def _serialize_member(self, member: WorkspaceMember) -> dict:
        return {
            "id": member.id,
            "workspace_id": member.workspace_id,
            "user_id": member.user_id,
            "role": member.role,
            "joined_at": member.joined_at,
            "user_name": getattr(member.user, "name", None),
            "user_email": getattr(member.user, "email", None),
        }

    def _serialize_project(self, project: WorkspaceProject) -> dict:
        return {
            "id": project.id,
            "workspace_id": project.workspace_id,
            "name": project.name,
            "description": project.description,
            "status": project.status,
            "owner_id": project.owner_id,
            "owner_name": getattr(project.owner, "name", None),
            "due_date": project.due_date,
            "created_at": project.created_at,
            "updated_at": project.updated_at,
        }

    def _serialize_activity(self, activity: WorkspaceActivity) -> dict:
        return {
            "id": activity.id,
            "workspace_id": activity.workspace_id,
            "actor_id": activity.actor_id,
            "action": activity.action,
            "entity_type": activity.entity_type,
            "entity_id": activity.entity_id,
            "message": activity.message,
            "created_at": activity.created_at,
            "actor_name": getattr(activity.actor, "name", None),
        }

    def _serialize_audit(self, audit: AuditLog) -> dict:
        return {
            "id": audit.id,
            "user_id": audit.user_id,
            "action": audit.action,
            "resource_type": audit.resource_type,
            "resource_id": audit.resource_id,
            "details": audit.details,
            "ip_address": audit.ip_address,
            "created_at": audit.created_at,
            "user_name": getattr(audit, "user_name", None),
        }

    async def list_workspaces(self, user_id: str) -> list[dict]:
        result = await self.db.execute(
            select(Workspace)
            .outerjoin(WorkspaceMember, WorkspaceMember.workspace_id == Workspace.id)
            .where(or_(Workspace.owner_id == user_id, WorkspaceMember.user_id == user_id))
            .distinct()
            .order_by(Workspace.created_at.desc())
        )
        return [await self._serialize_workspace(workspace, user_id) for workspace in result.scalars().all()]

    async def get_workspace(self, workspace_id: str, user_id: str) -> dict:
        workspace, _ = await self._ensure_member(workspace_id, user_id)
        base = await self._serialize_workspace(workspace, user_id)
        base.update(
            {
                "collections": [],
                "members": await self.list_members(workspace_id, user_id),
                "projects": await self.list_projects(workspace_id, user_id),
                "activity": await self.list_activity(workspace_id, user_id),
                "audit_logs": await self.list_audit_logs(workspace_id, user_id),
            }
        )
        return base

    async def create_workspace(self, data: WorkspaceCreate, user_id: str) -> dict:
        workspace = Workspace(
            name=data.name,
            description=data.description,
            notes=data.notes,
            owner_id=user_id,
        )
        self.db.add(workspace)
        await self.db.flush()
        self.db.add(
            WorkspaceMember(
                workspace_id=workspace.id,
                user_id=user_id,
                role=WorkspaceRole.owner,
                invited_by_id=user_id,
            )
        )
        await self._record_activity(workspace.id, user_id, "created", "workspace", f"Created workspace {workspace.name}", workspace.id)
        await self._record_audit(workspace.id, user_id, "workspace.created", "workspace", workspace.id, {"name": workspace.name})
        await self.db.flush()
        await self.db.refresh(workspace)
        return await self._serialize_workspace(workspace, user_id)

    async def update_workspace(self, workspace_id: str, data: WorkspaceUpdate, user_id: str) -> dict:
        workspace, _ = await self._ensure_member(workspace_id, user_id, ADMIN_ROLES)
        changes: dict = {}

        if data.name is not None and data.name != workspace.name:
            changes["name"] = {"from": workspace.name, "to": data.name}
            workspace.name = data.name
        if data.description is not None and data.description != workspace.description:
            changes["description"] = {"from": workspace.description, "to": data.description}
            workspace.description = data.description
        if data.notes is not None and data.notes != workspace.notes:
            changes["notes"] = {"updated": True}
            workspace.notes = data.notes

        if changes:
            await self._record_activity(workspace.id, user_id, "updated", "workspace", f"Updated workspace {workspace.name}", workspace.id)
            await self._record_audit(workspace.id, user_id, "workspace.updated", "workspace", workspace.id, changes)

        await self.db.flush()
        await self.db.refresh(workspace)
        return await self._serialize_workspace(workspace, user_id)

    async def delete_workspace(self, workspace_id: str, user_id: str) -> None:
        workspace, _ = await self._ensure_member(workspace_id, user_id, {WorkspaceRole.owner})
        await self._record_audit(workspace.id, user_id, "workspace.deleted", "workspace", workspace.id, {"name": workspace.name})
        await self.db.delete(workspace)
        await self.db.flush()

    async def list_members(self, workspace_id: str, user_id: str) -> list[dict]:
        await self._ensure_member(workspace_id, user_id)
        result = await self.db.execute(
            select(WorkspaceMember)
            .options(selectinload(WorkspaceMember.user))
            .where(WorkspaceMember.workspace_id == workspace_id)
            .order_by(WorkspaceMember.joined_at.asc())
        )
        return [self._serialize_member(member) for member in result.scalars().all()]

    async def add_member(self, workspace_id: str, data: WorkspaceMemberCreate, user_id: str) -> dict:
        workspace, _ = await self._ensure_member(workspace_id, user_id, ADMIN_ROLES)
        if data.role == WorkspaceRole.owner:
            raise BadRequestException("Workspace owner cannot be assigned through member invites")

        user = await self._resolve_user(data.user_id, data.email)
        existing = await self._get_membership(workspace_id, user.id)
        if existing:
            raise ConflictException("User is already a workspace member")

        member = WorkspaceMember(
            workspace_id=workspace_id,
            user_id=user.id,
            role=data.role,
            invited_by_id=user_id,
        )
        self.db.add(member)
        await self._record_activity(workspace_id, user_id, "member_added", "member", f"Added {user.name} as {data.role.value}", user.id)
        await self._record_audit(workspace_id, user_id, "workspace.member_added", "workspace_member", user.id, {"role": data.role.value, "email": user.email})
        await self.db.flush()
        await self.db.refresh(member)
        member.user = user
        return self._serialize_member(member)

    async def update_member(self, workspace_id: str, member_id: str, data: WorkspaceMemberUpdate, user_id: str) -> dict:
        await self._ensure_member(workspace_id, user_id, ADMIN_ROLES)
        if data.role == WorkspaceRole.owner:
            raise BadRequestException("Transfer ownership by updating the workspace owner, not a member role")

        result = await self.db.execute(
            select(WorkspaceMember)
            .options(selectinload(WorkspaceMember.user))
            .where(WorkspaceMember.workspace_id == workspace_id, WorkspaceMember.id == member_id)
        )
        member = result.scalar_one_or_none()
        if not member:
            raise NotFoundException("Workspace member not found")
        if member.role == WorkspaceRole.owner:
            raise BadRequestException("Owner role cannot be changed")

        previous = member.role
        member.role = data.role
        await self._record_activity(workspace_id, user_id, "member_updated", "member", f"Changed {member.user.name}'s role to {data.role.value}", member.user_id)
        await self._record_audit(workspace_id, user_id, "workspace.member_updated", "workspace_member", member.user_id, {"from": previous.value, "to": data.role.value})
        await self.db.flush()
        await self.db.refresh(member)
        return self._serialize_member(member)

    async def remove_member(self, workspace_id: str, member_id: str, user_id: str) -> None:
        await self._ensure_member(workspace_id, user_id, ADMIN_ROLES)
        result = await self.db.execute(
            select(WorkspaceMember)
            .options(selectinload(WorkspaceMember.user))
            .where(WorkspaceMember.workspace_id == workspace_id, WorkspaceMember.id == member_id)
        )
        member = result.scalar_one_or_none()
        if not member:
            raise NotFoundException("Workspace member not found")
        if member.role == WorkspaceRole.owner:
            raise BadRequestException("Workspace owner cannot be removed")

        name = member.user.name if member.user else "member"
        await self._record_activity(workspace_id, user_id, "member_removed", "member", f"Removed {name} from workspace", member.user_id)
        await self._record_audit(workspace_id, user_id, "workspace.member_removed", "workspace_member", member.user_id, {"name": name})
        await self.db.delete(member)
        await self.db.flush()

    async def list_projects(self, workspace_id: str, user_id: str) -> list[dict]:
        await self._ensure_member(workspace_id, user_id)
        result = await self.db.execute(
            select(WorkspaceProject)
            .options(selectinload(WorkspaceProject.owner))
            .where(WorkspaceProject.workspace_id == workspace_id)
            .order_by(WorkspaceProject.updated_at.desc())
        )
        return [self._serialize_project(project) for project in result.scalars().all()]

    async def create_project(self, workspace_id: str, data: WorkspaceProjectCreate, user_id: str) -> dict:
        await self._ensure_member(workspace_id, user_id, WRITE_ROLES)
        if data.owner_id:
            await self._get_user(data.owner_id)

        project = WorkspaceProject(
            workspace_id=workspace_id,
            name=data.name,
            description=data.description,
            status=data.status,
            owner_id=data.owner_id,
            due_date=data.due_date,
        )
        self.db.add(project)
        await self.db.flush()
        await self._record_activity(workspace_id, user_id, "project_created", "project", f"Created project {project.name}", project.id)
        await self._record_audit(workspace_id, user_id, "workspace.project_created", "workspace_project", project.id, {"name": project.name})
        await self.db.flush()
        result = await self.db.execute(
            select(WorkspaceProject).options(selectinload(WorkspaceProject.owner)).where(WorkspaceProject.id == project.id)
        )
        return self._serialize_project(result.scalar_one())

    async def update_project(self, workspace_id: str, project_id: str, data: WorkspaceProjectUpdate, user_id: str) -> dict:
        await self._ensure_member(workspace_id, user_id, WRITE_ROLES)
        result = await self.db.execute(
            select(WorkspaceProject)
            .options(selectinload(WorkspaceProject.owner))
            .where(WorkspaceProject.workspace_id == workspace_id, WorkspaceProject.id == project_id)
        )
        project = result.scalar_one_or_none()
        if not project:
            raise NotFoundException("Workspace project not found")

        changes: dict = {}
        for field in ("name", "description", "status", "owner_id", "due_date"):
            value = getattr(data, field)
            if value is not None and value != getattr(project, field):
                if field == "owner_id":
                    await self._get_user(value)
                current = getattr(project, field)
                changes[field] = {"from": str(current) if current is not None else None, "to": str(value)}
                setattr(project, field, value)

        if changes:
            await self._record_activity(workspace_id, user_id, "project_updated", "project", f"Updated project {project.name}", project.id)
            await self._record_audit(workspace_id, user_id, "workspace.project_updated", "workspace_project", project.id, changes)

        await self.db.flush()
        await self.db.refresh(project)
        return self._serialize_project(project)

    async def delete_project(self, workspace_id: str, project_id: str, user_id: str) -> None:
        await self._ensure_member(workspace_id, user_id, WRITE_ROLES)
        result = await self.db.execute(
            select(WorkspaceProject).where(WorkspaceProject.workspace_id == workspace_id, WorkspaceProject.id == project_id)
        )
        project = result.scalar_one_or_none()
        if not project:
            raise NotFoundException("Workspace project not found")
        await self._record_activity(workspace_id, user_id, "project_deleted", "project", f"Deleted project {project.name}", project.id)
        await self._record_audit(workspace_id, user_id, "workspace.project_deleted", "workspace_project", project.id, {"name": project.name})
        await self.db.delete(project)
        await self.db.flush()

    async def list_activity(self, workspace_id: str, user_id: str, limit: int = 50) -> list[dict]:
        await self._ensure_member(workspace_id, user_id)
        result = await self.db.execute(
            select(WorkspaceActivity)
            .options(selectinload(WorkspaceActivity.actor))
            .where(WorkspaceActivity.workspace_id == workspace_id)
            .order_by(WorkspaceActivity.created_at.desc())
            .limit(limit)
        )
        return [self._serialize_activity(activity) for activity in result.scalars().all()]

    async def list_audit_logs(self, workspace_id: str, user_id: str, limit: int = 100) -> list[dict]:
        await self._ensure_member(workspace_id, user_id, ADMIN_ROLES)
        result = await self.db.execute(
            select(AuditLog)
            .where(AuditLog.details["workspace_id"].as_string() == workspace_id)
            .order_by(AuditLog.created_at.desc())
            .limit(limit)
        )
        return [self._serialize_audit(audit) for audit in result.scalars().all()]
