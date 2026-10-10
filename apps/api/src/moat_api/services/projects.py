import uuid
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from moat_api.db.models.project import ProjectAssignment, ProjectTransitionLog, PROJECT_STATUSES, ASSIGNMENT_STATUSES

class ProjectWorkflowService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_project(self, project_id: uuid.UUID, tenant_id: uuid.UUID) -> Optional[ProjectAssignment]:
        stmt = select(ProjectAssignment).where(
            ProjectAssignment.id == project_id,
            ProjectAssignment.tenant_id == tenant_id
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def _log_transition(self, project: ProjectAssignment, actor_id: uuid.UUID, from_status: str, to_status: str, transition_type: str, reason: str):
        log = ProjectTransitionLog(
            project_assignment_id=project.id,
            actor_id=actor_id,
            tenant_id=project.tenant_id,
            from_status=from_status,
            to_status=to_status,
            transition_type=transition_type,
            reason=reason
        )
        self.session.add(log)

    async def transition_project_status(self, project_id: uuid.UUID, tenant_id: uuid.UUID, actor_id: uuid.UUID, to_status: str, reason: str = "") -> ProjectAssignment:
        project = await self.get_project(project_id, tenant_id)
        if not project:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

        if to_status not in PROJECT_STATUSES:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid status: {to_status}")

        from_status = project.project_status
        
        # Enforce State Machine Rules
        allowed_transitions = {
            "ASSIGNED": ["ACCEPTED", "CANCELLED"],
            "ACCEPTED": ["DRAFTING", "CANCELLED"],
            "DRAFTING": ["SUBMITTED_FOR_REVIEW", "CANCELLED"],
            "SUBMITTED_FOR_REVIEW": ["REVISION_REQUIRED", "APPROVED"],
            "REVISION_REQUIRED": ["DRAFTING", "CANCELLED"],
            "APPROVED": ["COMPLETED"],
            "COMPLETED": [],
            "CANCELLED": []
        }

        if to_status not in allowed_transitions.get(from_status, []):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, 
                detail=f"Illegal state transition from {from_status} to {to_status}"
            )

        project.project_status = to_status
        await self._log_transition(project, actor_id, from_status, to_status, "PROJECT_STATUS", reason)
        await self.session.commit()
        await self.session.refresh(project)
        return project

    async def transition_assignment_status(self, project_id: uuid.UUID, tenant_id: uuid.UUID, actor_id: uuid.UUID, to_status: str, reason: str = "") -> ProjectAssignment:
        project = await self.get_project(project_id, tenant_id)
        if not project:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

        if to_status not in ASSIGNMENT_STATUSES:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid status: {to_status}")

        from_status = project.assignment_status
        
        allowed_transitions = {
            "PENDING_ACCEPTANCE": ["ACCEPTED", "REJECTED", "REVOKED"],
            "ACCEPTED": ["REVOKED"],
            "REJECTED": [],
            "REVOKED": []
        }

        if to_status not in allowed_transitions.get(from_status, []):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, 
                detail=f"Illegal assignment transition from {from_status} to {to_status}"
            )

        project.assignment_status = to_status
        
        # When assignment is accepted, auto-update the overall project status
        if to_status == "ACCEPTED" and project.project_status == "ASSIGNED":
            project.project_status = "ACCEPTED"
            await self._log_transition(project, actor_id, "ASSIGNED", "ACCEPTED", "PROJECT_STATUS", "Auto-transitioned due to assignment acceptance")

        await self._log_transition(project, actor_id, from_status, to_status, "ASSIGNMENT_STATUS", reason)
        await self.session.commit()
        await self.session.refresh(project)
        return project
