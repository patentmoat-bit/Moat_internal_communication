from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.collection import Collection, CollectionPatent
from app.models.patent import Patent
from app.repositories.base import BaseRepository


class CollectionRepository(BaseRepository[Collection]):
    def __init__(self, db: AsyncSession) -> None:
        super().__init__(db, Collection)

    async def get_user_collections(self, user_id: str) -> list[Collection]:
        stmt = (
            select(Collection)
            .where(Collection.user_id == user_id)
            .order_by(Collection.created_at.desc())
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_collection_detail(self, collection_id: str) -> Collection | None:
        collection = await self.get(collection_id)
        if collection is None:
            return None
        stmt = (
            select(Patent)
            .join(CollectionPatent, CollectionPatent.patent_id == Patent.id)
            .where(CollectionPatent.collection_id == collection_id)
        )
        result = await self.db.execute(stmt)
        patents = list(result.scalars().all())
        collection.patents = patents
        return collection

    async def add_patent(self, collection_id: str, patent_id: str) -> CollectionPatent:
        link = CollectionPatent(collection_id=collection_id, patent_id=patent_id)
        self.db.add(link)
        await self.db.flush()
        return link

    async def remove_patent(self, collection_id: str, patent_id: str) -> bool:
        stmt = select(CollectionPatent).where(
            CollectionPatent.collection_id == collection_id,
            CollectionPatent.patent_id == patent_id,
        )
        result = await self.db.execute(stmt)
        link = result.scalar_one_or_none()
        if link is None:
            return False
        await self.db.delete(link)
        await self.db.flush()
        return True

    async def get_patent_count(self, collection_id: str) -> int:
        stmt = (
            select(func.count())
            .select_from(CollectionPatent)
            .where(CollectionPatent.collection_id == collection_id)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()
