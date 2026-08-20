from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.invention import Invention, InventionAnalysis, InventionDocument
from app.models.user import User, UserRole


class InventionRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get(self, invention_id: str, include_detail: bool = True) -> Invention | None:
        stmt = select(Invention).where(Invention.id == invention_id)
        if include_detail:
            stmt = stmt.options(selectinload(Invention.documents), selectinload(Invention.analyses))
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_for_user(self, user: User) -> list[Invention]:
        stmt = select(Invention).options(selectinload(Invention.documents), selectinload(Invention.analyses)).order_by(Invention.updated_at.desc())
        if user.role != UserRole.admin:
            stmt = stmt.where(Invention.created_by == user.id)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def latest_analysis(self, invention_id: str) -> InventionAnalysis | None:
        result = await self.db.execute(
            select(InventionAnalysis).where(InventionAnalysis.invention_id == invention_id).order_by(InventionAnalysis.created_at.desc()).limit(1)
        )
        return result.scalar_one_or_none()

    async def analyses(self, invention_id: str) -> list[InventionAnalysis]:
        result = await self.db.execute(
            select(InventionAnalysis).where(InventionAnalysis.invention_id == invention_id).order_by(InventionAnalysis.created_at.desc())
        )
        return list(result.scalars().all())
