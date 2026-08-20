"""enterprise rbac intelligence foundation

Revision ID: 6f1a2b3c4d5e
Revises: 5e0f12345678
Create Date: 2026-06-15 00:00:00.000000
"""
from __future__ import annotations

from uuid import uuid4

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "6f1a2b3c4d5e"
down_revision = "5e0f12345678"
branch_labels = None
depends_on = None


def _id() -> str:
    return str(uuid4())


ROLE_DEFS = {
    "ceo": {
        "label": "CEO",
        "route": "/dashboard/ceo",
        "agents": ["Executive Strategy Agent", "Portfolio Value Agent", "Competitive Threat Agent"],
        "dashboards": ["Executive Dashboard", "Innovation ROI", "Portfolio Value", "Competitive Threats", "White Space"],
        "scopes": ["analytics:read", "portfolio:read", "competitors:read", "reports:read"],
    },
    "cto": {
        "label": "CTO",
        "route": "/dashboard/cto",
        "agents": ["Engineering Signal Agent", "Architecture Intelligence Agent", "Invention Discovery Agent"],
        "dashboards": ["Engineering Signals", "Technology Discovery", "Innovation Clusters", "Architecture Intelligence"],
        "scopes": ["inventions:read", "ingestion:write", "semantic_search:read", "knowledge_graph:read"],
    },
    "cio": {
        "label": "CIO",
        "route": "/dashboard/cio",
        "agents": ["Enterprise Strategy Agent", "Technology Risk Agent", "Adoption Analytics Agent"],
        "dashboards": ["Enterprise Innovation Map", "Technology Adoption", "Infrastructure Innovation", "Cross-Team Graph", "AI Transformation Index"],
        "scopes": ["analytics:read", "enterprise:read", "departments:read", "reports:read"],
    },
    "patent_counsel": {
        "label": "Patent Counsel",
        "route": "/dashboard/legal",
        "agents": ["Prior Art Agent", "Claim Mapping Agent", "Patent Drafting Agent", "Filing Risk Agent"],
        "dashboards": ["Prior Art Workspace", "Claim Mapping", "Drafting Workspace", "Filing Recommendations"],
        "scopes": ["prior_art:read", "claims:write", "patentability:read", "reports:write"],
    },
    "research_lead": {
        "label": "Research Lead",
        "route": "/dashboard/research",
        "agents": ["Research Commercialization Agent", "Publication Analysis Agent", "Novelty Agent"],
        "dashboards": ["Research Intelligence", "Publication Analysis", "Research-to-Patent", "Commercialization Opportunities"],
        "scopes": ["inventions:write", "novelty:read", "landscape:read", "documents:write"],
    },
    "product_manager": {
        "label": "Product Manager",
        "route": "/dashboard/product",
        "agents": ["Feature Novelty Agent", "Product Mapping Agent", "UX Innovation Agent"],
        "dashboards": ["Product Innovation", "Feature Novelty", "UX Innovation", "Competitive Product Mapping"],
        "scopes": ["products:read", "competitors:read", "novelty:read", "alerts:write"],
    },
    "analyst": {
        "label": "Analyst",
        "route": "/dashboard/search",
        "agents": ["Patent Search Agent", "Landscape Analysis Agent", "Similarity Agent"],
        "dashboards": ["Search Analytics", "Landscape", "Similarity", "Alerts"],
        "scopes": ["search:read", "analytics:read", "alerts:read"],
    },
    "admin": {
        "label": "Admin",
        "route": "/dashboard/admin",
        "agents": ["Security Agent", "RBAC Agent", "Audit Agent"],
        "dashboards": ["User Management", "Permissions", "Security", "Audit Logs", "Platform Health"],
        "scopes": ["admin:*", "rbac:*", "audit:read"],
    },
}


def upgrade() -> None:
    op.create_table(
        "roles",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True, nullable=False),
        sa.Column("name", sa.String(length=80), nullable=False),
        sa.Column("label", sa.String(length=120), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("workspace_route", sa.String(length=160), nullable=False),
        sa.Column("ai_agents", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="[]"),
        sa.Column("dashboards", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="[]"),
        sa.Column("api_scopes", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="[]"),
        sa.Column("is_system", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_roles_name", "roles", ["name"], unique=True)

    op.create_table(
        "permissions",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True, nullable=False),
        sa.Column("key", sa.String(length=120), nullable=False),
        sa.Column("label", sa.String(length=160), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("category", sa.String(length=80), nullable=False, server_default="platform"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_permissions_key", "permissions", ["key"], unique=True)

    op.create_table(
        "user_roles",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=False), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role_id", postgresql.UUID(as_uuid=False), sa.ForeignKey("roles.id", ondelete="CASCADE"), nullable=False),
        sa.Column("is_primary", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("assigned_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("assigned_by", postgresql.UUID(as_uuid=False), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.UniqueConstraint("user_id", "role_id", name="uq_user_roles_user_role"),
    )
    op.create_index("ix_user_roles_user_id", "user_roles", ["user_id"])
    op.create_index("ix_user_roles_role_id", "user_roles", ["role_id"])

    op.create_table(
        "role_permissions",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True, nullable=False),
        sa.Column("role_id", postgresql.UUID(as_uuid=False), sa.ForeignKey("roles.id", ondelete="CASCADE"), nullable=False),
        sa.Column("permission_id", postgresql.UUID(as_uuid=False), sa.ForeignKey("permissions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("role_id", "permission_id", name="uq_role_permissions_role_permission"),
    )
    op.create_index("ix_role_permissions_role_id", "role_permissions", ["role_id"])
    op.create_index("ix_role_permissions_permission_id", "role_permissions", ["permission_id"])

    role_rows = []
    permission_ids: dict[str, str] = {}
    for role_name, config in ROLE_DEFS.items():
        role_rows.append({
            "id": _id(),
            "name": role_name,
            "label": config["label"],
            "description": f"{config['label']} intelligence workspace role",
            "workspace_route": config["route"],
            "ai_agents": config["agents"],
            "dashboards": config["dashboards"],
            "api_scopes": config["scopes"],
            "is_system": True,
        })
        for scope in config["scopes"]:
            permission_ids.setdefault(scope, _id())

    roles_table = sa.table(
        "roles",
        sa.column("id", postgresql.UUID(as_uuid=False)),
        sa.column("name", sa.String()),
        sa.column("label", sa.String()),
        sa.column("description", sa.Text()),
        sa.column("workspace_route", sa.String()),
        sa.column("ai_agents", postgresql.JSONB()),
        sa.column("dashboards", postgresql.JSONB()),
        sa.column("api_scopes", postgresql.JSONB()),
        sa.column("is_system", sa.Boolean()),
    )
    permissions_table = sa.table(
        "permissions",
        sa.column("id", postgresql.UUID(as_uuid=False)),
        sa.column("key", sa.String()),
        sa.column("label", sa.String()),
        sa.column("category", sa.String()),
    )
    role_permissions_table = sa.table(
        "role_permissions",
        sa.column("id", postgresql.UUID(as_uuid=False)),
        sa.column("role_id", postgresql.UUID(as_uuid=False)),
        sa.column("permission_id", postgresql.UUID(as_uuid=False)),
    )
    op.bulk_insert(roles_table, role_rows)
    op.bulk_insert(permissions_table, [{"id": pid, "key": key, "label": key.replace(":", " ").title(), "category": key.split(":", 1)[0]} for key, pid in permission_ids.items()])
    op.bulk_insert(role_permissions_table, [{"id": _id(), "role_id": row["id"], "permission_id": permission_ids[scope]} for row in role_rows for scope in ROLE_DEFS[row["name"]]["scopes"]])

    _create_intelligence_tables()


def _report_table(name: str, payload_column: str = "payload") -> None:
    op.create_table(
        name,
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True, nullable=False),
        sa.Column("invention_id", postgresql.UUID(as_uuid=False), sa.ForeignKey("inventions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=False), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("score", sa.Float(), nullable=True),
        sa.Column(payload_column, postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index(f"ix_{name}_invention_id", name, ["invention_id"])
    op.create_index(f"ix_{name}_created_by", name, ["created_by"])


def _create_intelligence_tables() -> None:
    _report_table("prior_art_results", "matches")
    _report_table("novelty_reports", "findings")
    _report_table("patentability_reports", "evaluation")
    _report_table("claim_mappings", "mappings")
    _report_table("landscape_reports", "landscape")

    op.create_table("technology_clusters", sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True, nullable=False), sa.Column("name", sa.String(length=180), nullable=False), sa.Column("technology_domain", sa.String(length=160), nullable=True), sa.Column("cluster_data", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="{}"), sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()))
    op.create_table("citation_graphs", sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True, nullable=False), sa.Column("patent_id", postgresql.UUID(as_uuid=False), sa.ForeignKey("patents.id", ondelete="SET NULL"), nullable=True), sa.Column("graph", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="{}"), sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()))
    op.create_table("competitors", sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True, nullable=False), sa.Column("name", sa.String(length=180), nullable=False), sa.Column("domains", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="[]"), sa.Column("risk_profile", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="{}"), sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()))
    op.create_table("innovation_signals", sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True, nullable=False), sa.Column("source", sa.String(length=120), nullable=False), sa.Column("signal_type", sa.String(length=120), nullable=False), sa.Column("title", sa.String(length=255), nullable=False), sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="{}"), sa.Column("confidence_score", sa.Float(), nullable=False, server_default="0"), sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()))
    op.create_table("knowledge_graph_nodes", sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True, nullable=False), sa.Column("node_type", sa.String(length=80), nullable=False), sa.Column("label", sa.String(length=255), nullable=False), sa.Column("external_id", sa.String(length=255), nullable=True), sa.Column("properties", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="{}"), sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()))
    op.create_table("knowledge_graph_edges", sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True, nullable=False), sa.Column("source_node_id", postgresql.UUID(as_uuid=False), sa.ForeignKey("knowledge_graph_nodes.id", ondelete="CASCADE"), nullable=False), sa.Column("target_node_id", postgresql.UUID(as_uuid=False), sa.ForeignKey("knowledge_graph_nodes.id", ondelete="CASCADE"), nullable=False), sa.Column("edge_type", sa.String(length=80), nullable=False), sa.Column("properties", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="{}"), sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()))
    op.create_table("activity_logs", sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True, nullable=False), sa.Column("user_id", postgresql.UUID(as_uuid=False), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True), sa.Column("workspace_id", postgresql.UUID(as_uuid=False), sa.ForeignKey("workspaces.id", ondelete="SET NULL"), nullable=True), sa.Column("event_type", sa.String(length=120), nullable=False), sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="{}"), sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()))


def downgrade() -> None:
    for table in ["activity_logs", "knowledge_graph_edges", "knowledge_graph_nodes", "innovation_signals", "competitors", "citation_graphs", "technology_clusters", "landscape_reports", "claim_mappings", "patentability_reports", "novelty_reports", "prior_art_results", "role_permissions", "user_roles", "permissions", "roles"]:
        op.drop_table(table)
