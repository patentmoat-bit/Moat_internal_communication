from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.patent import Patent
from app.repositories.base import BaseRepository


class PatentRepository(BaseRepository[Patent]):
    def __init__(self, db: AsyncSession) -> None:
        super().__init__(db, Patent)

    async def get_by_patent_number(self, number: str) -> Patent | None:
        stmt = select(Patent).where(Patent.patent_number == number)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def search_patents(
        self,
        query: str | None = None,
        assignee: str | None = None,
        status: str | None = None,
        date_from: str | None = None,
        date_to: str | None = None,
        cpc_class: str | None = None,
        inventor: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Patent], int]:
        stmt = select(Patent)
        count_stmt = select(func.count()).select_from(Patent)

        conditions = []

        if query:
            like_pattern = f"%{query}%"
            conditions.append(
                or_(
                    Patent.title.ilike(like_pattern),
                    Patent.abstract.ilike(like_pattern),
                    Patent.patent_number.ilike(like_pattern),
                    Patent.assignee.ilike(like_pattern),
                )
            )

        if assignee:
            conditions.append(Patent.assignee.ilike(f"%{assignee}%"))

        if status:
            conditions.append(Patent.status == status)

        if date_from:
            conditions.append(Patent.filing_date >= date_from)

        if date_to:
            conditions.append(Patent.filing_date <= date_to)

        if cpc_class:
            conditions.append(
                Patent.cpc_classifications["cpc_class"].as_string().ilike(f"%{cpc_class}%")
            )

        if inventor:
            conditions.append(
                Patent.inventors["name"].as_string().ilike(f"%{inventor}%")
            )

        if conditions:
            stmt = stmt.where(*conditions)
            count_stmt = count_stmt.where(*conditions)

        offset = (page - 1) * page_size
        stmt = stmt.offset(offset).limit(page_size).order_by(Patent.filing_date.desc().nullslast())

        count_result = await self.db.execute(count_stmt)
        total = count_result.scalar_one()

        result = await self.db.execute(stmt)
        patents = list(result.scalars().all())

        return patents, total
