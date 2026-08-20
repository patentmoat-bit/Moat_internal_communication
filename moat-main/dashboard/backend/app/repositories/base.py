from typing import Generic, TypeVar, Any

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import Base

ModelType = TypeVar("ModelType", bound=Base)


class BaseRepository(Generic[ModelType]):
    def __init__(self, db: AsyncSession, model: type[ModelType]) -> None:
        self.db = db
        self.model = model

    async def get(self, id: str) -> ModelType | None:
        stmt = select(self.model).where(self.model.id == id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_all(
        self, skip: int = 0, limit: int = 100, **filters: Any
    ) -> list[ModelType]:
        stmt = select(self.model)
        for attr, value in filters.items():
            if hasattr(self.model, attr) and value is not None:
                stmt = stmt.where(getattr(self.model, attr) == value)
        stmt = stmt.offset(skip).limit(limit)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def create(self, **kwargs: Any) -> ModelType:
        instance = self.model(**kwargs)
        self.db.add(instance)
        await self.db.flush()
        await self.db.refresh(instance)
        return instance

    async def update(self, id: str, **kwargs: Any) -> ModelType | None:
        instance = await self.get(id)
        if instance is None:
            return None
        for key, value in kwargs.items():
            if value is not None and hasattr(instance, key):
                setattr(instance, key, value)
        await self.db.flush()
        await self.db.refresh(instance)
        return instance

    async def delete(self, id: str) -> bool:
        instance = await self.get(id)
        if instance is None:
            return False
        await self.db.delete(instance)
        await self.db.flush()
        return True

    async def count(self, **filters: Any) -> int:
        stmt = select(func.count()).select_from(self.model)
        for attr, value in filters.items():
            if hasattr(self.model, attr) and value is not None:
                stmt = stmt.where(getattr(self.model, attr) == value)
        result = await self.db.execute(stmt)
        return result.scalar_one()
