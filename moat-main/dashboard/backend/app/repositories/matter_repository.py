from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.matter import Matter, MatterActivity, MatterDocument, MatterMember, MatterStatusHistory
from app.models.user import User, UserRole


class MatterRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get(self, matter_id: str, include_detail: bool = False) -> Matter | None:
        stmt = select(Matter).where(Matter.id == matter_id)
        if include_detail:
            stmt = stmt.options(
                selectinload(Matter.owner),
                selectinload(Matter.members).selectinload(MatterMember.user),
                selectinload(Matter.documents).selectinload(MatterDocument.uploaded_by),
                selectinload(Matter.activity).selectinload(MatterActivity.actor),
                selectinload(Matter.status_history).selectinload(MatterStatusHistory.changed_by),
            )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_for_user(self, user: User) -> list[Matter]:
        stmt = select(Matter).options(selectinload(Matter.owner)).order_by(Matter.updated_at.desc())
        if user.role != UserRole.admin:
            stmt = (
                stmt.outerjoin(MatterMember, MatterMember.matter_id == Matter.id)
                .where(or_(Matter.owner_id == user.id, MatterMember.user_id == user.id))
                .distinct()
            )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def membership(self, matter_id: str, user_id: str) -> MatterMember | None:
        result = await self.db.execute(
            select(MatterMember).where(MatterMember.matter_id == matter_id, MatterMember.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def member_by_id(self, matter_id: str, member_id: str) -> MatterMember | None:
        result = await self.db.execute(
            select(MatterMember)
            .options(selectinload(MatterMember.user))
            .where(MatterMember.matter_id == matter_id, MatterMember.id == member_id)
        )
        return result.scalar_one_or_none()

    async def document_by_id(self, matter_id: str, document_id: str) -> MatterDocument | None:
        result = await self.db.execute(
            select(MatterDocument).where(MatterDocument.matter_id == matter_id, MatterDocument.id == document_id)
        )
        return result.scalar_one_or_none()

    async def resolve_user(self, user_id: str | None = None, email: str | None = None) -> User | None:
        filters = []
        if user_id:
            filters.append(User.id == user_id)
        if email:
            filters.append(User.email == email)
        if not filters:
            return None
        result = await self.db.execute(select(User).where(or_(*filters)))
        return result.scalar_one_or_none()

    async def counts(self, matter_id: str) -> tuple[int, int, int]:
        result = await self.db.execute(
            select(
                select(func.count(MatterMember.id)).where(MatterMember.matter_id == matter_id).scalar_subquery(),
                select(func.count(MatterDocument.id)).where(MatterDocument.matter_id == matter_id).scalar_subquery(),
                select(func.count(MatterActivity.id)).where(MatterActivity.matter_id == matter_id).scalar_subquery(),
            )
        )
        return result.one()

    async def next_matter_number(self) -> str:
        count_result = await self.db.execute(select(func.count(Matter.id)))
        count = int(count_result.scalar_one() or 0) + 1
        return f"MAT-{count:05d}"
