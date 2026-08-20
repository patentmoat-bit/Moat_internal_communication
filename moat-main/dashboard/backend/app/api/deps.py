from collections.abc import AsyncGenerator

from elasticsearch import AsyncElasticsearch
from fastapi import Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.exceptions import UnauthorizedException, ForbiddenException
from app.database import get_db as _get_db
from app.models.user import User, UserRole
from app.repositories.user_repository import UserRepository
from app.services.auth.service import AuthService


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async for session in _get_db():
        yield session


async def get_current_user(
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not authorization.startswith("Bearer "):
        raise UnauthorizedException("Invalid authorization header")

    token = authorization.replace("Bearer ", "")
    user_repo = UserRepository(db)
    auth_service = AuthService(user_repo, db)
    user = await auth_service.get_current_user(token)
    return user


async def get_current_admin_user(
    current_user: User = Depends(get_current_user),
) -> User:
    if current_user.role != UserRole.admin:
        raise ForbiddenException("Admin access required")
    return current_user


class RoleChecker:
    def __init__(self, allowed_roles: list[UserRole]):
        self.allowed_roles = allowed_roles

    def __call__(self, user: User = Depends(get_current_user)) -> User:
        if user.role not in self.allowed_roles:
            raise ForbiddenException(f"Operation not permitted. Required roles: {[r.value for r in self.allowed_roles]}")
        return user


_es_client: AsyncElasticsearch | None = None


async def get_elasticsearch_client() -> AsyncElasticsearch:
    global _es_client
    if _es_client is None:
        _es_client = AsyncElasticsearch(hosts=[settings.ELASTICSEARCH_HOST])
    return _es_client


require_admin = RoleChecker([UserRole.admin])
require_analyst = RoleChecker([UserRole.admin, UserRole.analyst])
require_researcher = RoleChecker([UserRole.admin, UserRole.analyst, UserRole.researcher])
require_viewer = RoleChecker([UserRole.admin, UserRole.analyst, UserRole.researcher, UserRole.viewer])
