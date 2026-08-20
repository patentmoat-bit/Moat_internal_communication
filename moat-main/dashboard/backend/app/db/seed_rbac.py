import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.database import async_session_maker
from app.models.rbac import Role, Permission, RolePermission, UserRoleAssignment
from app.models.user import User, UserRole
from app.core.security import hash_password

ROLES_CONFIG = [
    {"name": "ceo", "label": "CEO", "route": "/dashboard/ceo", "enum": UserRole.ceo},
    {"name": "cto", "label": "CTO", "route": "/dashboard/cto", "enum": UserRole.cto},
    {"name": "cio", "label": "CIO", "route": "/dashboard/cio", "enum": UserRole.cio},
    {"name": "legal", "label": "Patent Counsel", "route": "/dashboard/legal", "enum": UserRole.legal},
    {"name": "researcher", "label": "Research Lead", "route": "/dashboard/research", "enum": UserRole.researcher},
    {"name": "product", "label": "Product Manager", "route": "/dashboard/product", "enum": UserRole.product},
    {"name": "analyst", "label": "Analyst", "route": "/dashboard/analyst", "enum": UserRole.analyst},
    {"name": "admin", "label": "Admin", "route": "/dashboard/admin", "enum": UserRole.admin},
]

PERMISSIONS_CONFIG = [
    {"key": "view:novelty", "label": "View Novelty", "category": "intelligence"},
    {"key": "execute:novelty", "label": "Execute Novelty Engine", "category": "intelligence"},
    {"key": "view:patentability", "label": "View Patentability", "category": "intelligence"},
    {"key": "execute:patentability", "label": "Execute Patentability Engine", "category": "intelligence"},
    {"key": "manage:users", "label": "Manage Users", "category": "admin"},
    {"key": "view:portfolio", "label": "View Patent Portfolio", "category": "dashboard"},
]

async def seed_rbac():
    async with async_session_maker() as session:
        # Seed Permissions
        permissions_map = {}
        for p in PERMISSIONS_CONFIG:
            result = await session.execute(select(Permission).where(Permission.key == p["key"]))
            perm = result.scalars().first()
            if not perm:
                perm = Permission(key=p["key"], label=p["label"], category=p["category"])
                session.add(perm)
                await session.flush()
            permissions_map[p["key"]] = perm

        # Seed Roles
        roles_map = {}
        for r in ROLES_CONFIG:
            result = await session.execute(select(Role).where(Role.name == r["name"]))
            role = result.scalars().first()
            if not role:
                role = Role(
                    name=r["name"],
                    label=r["label"],
                    workspace_route=r["route"],
                    ai_agents=[],
                    dashboards=[],
                    api_scopes=[],
                    is_system=True
                )
                session.add(role)
                await session.flush()
            roles_map[r["name"]] = role

        # Seed RolePermissions
        # Let's give admin all permissions
        admin_role = roles_map["admin"]
        for perm in permissions_map.values():
            result = await session.execute(
                select(RolePermission).where(
                    RolePermission.role_id == admin_role.id,
                    RolePermission.permission_id == perm.id
                )
            )
            if not result.scalars().first():
                session.add(RolePermission(role_id=admin_role.id, permission_id=perm.id))

        # Give CEO/CTO view portfolio and execute intelligence
        for r_name in ["ceo", "cto", "cio", "legal", "researcher", "product", "analyst"]:
            role = roles_map[r_name]
            for p_key in ["view:novelty", "execute:novelty", "view:patentability", "execute:patentability", "view:portfolio"]:
                perm = permissions_map[p_key]
                result = await session.execute(
                    select(RolePermission).where(
                        RolePermission.role_id == role.id,
                        RolePermission.permission_id == perm.id
                    )
                )
                if not result.scalars().first():
                    session.add(RolePermission(role_id=role.id, permission_id=perm.id))
        
        # Seed Mock Users
        for r in ROLES_CONFIG:
            email = f"{r['name']}@moat.ai"
            result = await session.execute(select(User).where(User.email == email))
            user = result.scalars().first()
            if not user:
                user = User(
                    email=email,
                    name=f"Mock {r['label']}",
                    password_hash=hash_password("password123"),
                    role=r["enum"],
                    is_active=True
                )
                session.add(user)
                await session.flush()

            # Create UserRoleAssignment
            role = roles_map[r["name"]]
            result = await session.execute(
                select(UserRoleAssignment).where(
                    UserRoleAssignment.user_id == user.id,
                    UserRoleAssignment.role_id == role.id
                )
            )
            if not result.scalars().first():
                session.add(UserRoleAssignment(user_id=user.id, role_id=role.id, is_primary=True))

        await session.commit()
        print("Successfully seeded RBAC tables and mock users.")

if __name__ == "__main__":
    asyncio.run(seed_rbac())
