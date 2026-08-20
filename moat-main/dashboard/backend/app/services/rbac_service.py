from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.rbac import Permission, Role, RolePermission, UserRoleAssignment
from app.models.user import User
from app.schemas.rbac import RoleWorkspaceResponse


LEGACY_ROLE_MAP = {
    "admin": "admin",
    "analyst": "analyst",
    "researcher": "research_lead",
    "viewer": "analyst",
}

DEFAULT_ROLE_WORKSPACES = {
    "ceo": {
        "label": "CEO",
        "route": "/dashboard/ceo",
        "agents": ["Executive Strategy Agent", "Portfolio Value Agent", "Competitive Threat Agent"],
        "dashboards": ["Executive Dashboard", "Innovation ROI", "Portfolio Value", "Competitive Threats", "White Space"],
        "api_scopes": ["analytics:read", "portfolio:read", "competitors:read", "reports:read"],
        "modules": ["/dashboard/ceo", "/dashboard/analytics", "/dashboard/competitor", "/dashboard/landscape", "/dashboard/reports"],
    },
    "cto": {
        "label": "CTO",
        "route": "/dashboard/cto",
        "agents": ["Engineering Signal Agent", "Architecture Intelligence Agent", "Invention Discovery Agent"],
        "dashboards": ["Engineering Signals", "Technology Discovery", "Innovation Clusters", "Architecture Intelligence"],
        "api_scopes": ["inventions:read", "ingestion:write", "semantic_search:read", "knowledge_graph:read"],
        "modules": ["/dashboard/cto", "/dashboard/workspace/invention", "/dashboard/semantic-search", "/dashboard/visualization", "/dashboard/understanding"],
    },
    "patent_counsel": {
        "label": "Patent Counsel",
        "route": "/dashboard/legal",
        "agents": ["Prior Art Agent", "Claim Mapping Agent", "Patent Drafting Agent", "Filing Risk Agent"],
        "dashboards": ["Prior Art Workspace", "Claim Mapping", "Drafting Workspace", "Filing Recommendations"],
        "api_scopes": ["prior_art:read", "claims:write", "patentability:read", "reports:write"],
        "modules": ["/dashboard/legal", "/dashboard/search", "/dashboard/claim-intelligence", "/dashboard/patentability", "/dashboard/reports"],
    },
    "research_lead": {
        "label": "Research Lead",
        "route": "/dashboard/research",
        "agents": ["Research Commercialization Agent", "Publication Analysis Agent", "Novelty Agent"],
        "dashboards": ["Research Intelligence", "Publication Analysis", "Research-to-Patent", "Commercialization Opportunities"],
        "api_scopes": ["inventions:write", "novelty:read", "landscape:read", "documents:write"],
        "modules": ["/dashboard/research", "/dashboard/workspace/invention", "/dashboard/novelty", "/dashboard/landscape", "/dashboard/reports"],
    },
    "product_manager": {
        "label": "Product Manager",
        "route": "/dashboard/product",
        "agents": ["Feature Novelty Agent", "Product Mapping Agent", "UX Innovation Agent"],
        "dashboards": ["Product Innovation", "Feature Novelty", "UX Innovation", "Competitive Product Mapping"],
        "api_scopes": ["products:read", "competitors:read", "novelty:read", "alerts:write"],
        "modules": ["/dashboard/product", "/dashboard/competitor", "/dashboard/alerts", "/dashboard/novelty", "/dashboard/search"],
    },
    "analyst": {
        "label": "Analyst",
        "route": "/dashboard/search",
        "agents": ["Patent Search Agent", "Landscape Analysis Agent", "Similarity Agent"],
        "dashboards": ["Search Analytics", "Landscape", "Similarity", "Alerts"],
        "api_scopes": ["search:read", "analytics:read", "alerts:read"],
        "modules": ["/dashboard/search", "/dashboard/semantic-search", "/dashboard/similarity", "/dashboard/alerts", "/dashboard/reports"],
    },
    "admin": {
        "label": "Admin",
        "route": "/dashboard/admin",
        "agents": ["Security Agent", "RBAC Agent", "Audit Agent"],
        "dashboards": ["User Management", "Permissions", "Security", "Audit Logs", "Platform Health"],
        "api_scopes": ["admin:*", "rbac:*", "audit:read"],
        "modules": ["/dashboard/admin", "/dashboard/security", "/dashboard/authentication", "/dashboard/settings", "/dashboard/reports"],
    },
}


class RBACService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_role_workspace(self, user: User) -> RoleWorkspaceResponse:
        role = await self._get_primary_role(user)
        role_name = role.name if role else LEGACY_ROLE_MAP.get(user.role.value, user.role.value)
        fallback = DEFAULT_ROLE_WORKSPACES.get(role_name, DEFAULT_ROLE_WORKSPACES["analyst"])

        if not role:
            return RoleWorkspaceResponse(
                role=role_name,
                role_label=fallback["label"],
                workspace_route=fallback["route"],
                permissions=fallback["api_scopes"],
                ai_agents=fallback["agents"],
                dashboards=fallback["dashboards"],
                api_scopes=fallback["api_scopes"],
                modules=fallback["modules"],
            )

        permissions = [
            assignment.permission.key
            for assignment in role.permissions
            if isinstance(assignment.permission, Permission)
        ]
        return RoleWorkspaceResponse(
            role=role.name,
            role_label=role.label,
            workspace_route=role.workspace_route,
            permissions=permissions,
            ai_agents=role.ai_agents or fallback["agents"],
            dashboards=role.dashboards or fallback["dashboards"],
            api_scopes=role.api_scopes or permissions,
            modules=fallback["modules"],
        )

    async def _get_primary_role(self, user: User) -> Role | None:
        stmt = (
            select(UserRoleAssignment)
            .where(UserRoleAssignment.user_id == user.id)
            .options(
                selectinload(UserRoleAssignment.role)
                .selectinload(Role.permissions)
                .selectinload(RolePermission.permission)
            )
            .order_by(UserRoleAssignment.is_primary.desc(), UserRoleAssignment.assigned_at.asc())
            .limit(1)
        )
        result = await self.db.execute(stmt)
        assignment = result.scalar_one_or_none()
        return assignment.role if assignment else None
