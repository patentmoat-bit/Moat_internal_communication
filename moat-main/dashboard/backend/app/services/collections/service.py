from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException, ForbiddenException
from app.models.collection import Collection
from app.repositories.collection_repository import CollectionRepository
from app.schemas.collection import CollectionCreate, CollectionUpdate, CollectionResponse, CollectionDetailResponse
from app.schemas.patent import PatentResponse


class CollectionService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.collection_repo = CollectionRepository(db)

    async def create_collection(self, user_id: str, data: CollectionCreate) -> Collection:
        collection = await self.collection_repo.create(
            user_id=user_id,
            name=data.name,
            description=data.description,
        )
        return collection

    async def get_collections(self, user_id: str) -> list[CollectionResponse]:
        collections = await self.collection_repo.get_user_collections(user_id)
        result = []
        for col in collections:
            count = await self.collection_repo.get_patent_count(col.id)
            result.append(
                CollectionResponse(
                    id=col.id,
                    name=col.name,
                    description=col.description,
                    patent_count=count,
                    created_at=col.created_at,
                    updated_at=col.updated_at,
                )
            )
        return result

    async def get_collection(self, collection_id: str) -> CollectionDetailResponse:
        collection = await self.collection_repo.get_collection_detail(collection_id)
        if not collection:
            raise NotFoundException("Collection not found")

        count = await self.collection_repo.get_patent_count(collection.id)

        patents = []
        if hasattr(collection, "patents") and collection.patents:
            patents = [PatentResponse.model_validate(p) for p in collection.patents]

        return CollectionDetailResponse(
            id=collection.id,
            name=collection.name,
            description=collection.description,
            patent_count=count,
            patents=patents,
            created_at=collection.created_at,
            updated_at=collection.updated_at,
        )

    async def update_collection(self, collection_id: str, data: CollectionUpdate) -> Collection:
        collection = await self.collection_repo.get(collection_id)
        if not collection:
            raise NotFoundException("Collection not found")
        updated = await self.collection_repo.update(
            collection_id,
            name=data.name,
            description=data.description,
        )
        if not updated:
            raise NotFoundException("Collection not found")
        return updated

    async def delete_collection(self, collection_id: str) -> None:
        deleted = await self.collection_repo.delete(collection_id)
        if not deleted:
            raise NotFoundException("Collection not found")

    async def add_patent(self, collection_id: str, patent_id: str) -> None:
        collection = await self.collection_repo.get(collection_id)
        if not collection:
            raise NotFoundException("Collection not found")
        await self.collection_repo.add_patent(collection_id, patent_id)

    async def remove_patent(self, collection_id: str, patent_id: str) -> None:
        collection = await self.collection_repo.get(collection_id)
        if not collection:
            raise NotFoundException("Collection not found")
        removed = await self.collection_repo.remove_patent(collection_id, patent_id)
        if not removed:
            raise NotFoundException("Patent not found in collection")
