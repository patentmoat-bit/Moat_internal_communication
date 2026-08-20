from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.schemas.collection import (
    CollectionCreate,
    CollectionUpdate,
    CollectionResponse,
    CollectionDetailResponse,
)
from app.services.collections.service import CollectionService

router = APIRouter(prefix="/collections", tags=["collections"])


@router.get("", response_model=list[CollectionResponse])
async def list_collections(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[CollectionResponse]:
    service = CollectionService(db)
    return await service.get_collections(current_user.id)


@router.post("", response_model=CollectionResponse, status_code=201)
async def create_collection(
    data: CollectionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CollectionResponse:
    service = CollectionService(db)
    collection = await service.create_collection(current_user.id, data)
    return CollectionResponse(
        id=collection.id,
        name=collection.name,
        description=collection.description,
        patent_count=0,
        created_at=collection.created_at,
        updated_at=collection.updated_at,
    )


@router.get("/{collection_id}", response_model=CollectionDetailResponse)
async def get_collection(
    collection_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CollectionDetailResponse:
    service = CollectionService(db)
    return await service.get_collection(collection_id)


@router.put("/{collection_id}", response_model=CollectionResponse)
async def update_collection(
    collection_id: str,
    data: CollectionUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CollectionResponse:
    service = CollectionService(db)
    collection = await service.update_collection(collection_id, data)
    count = await service.collection_repo.get_patent_count(collection.id)
    return CollectionResponse(
        id=collection.id,
        name=collection.name,
        description=collection.description,
        patent_count=count,
        created_at=collection.created_at,
        updated_at=collection.updated_at,
    )


@router.delete("/{collection_id}")
async def delete_collection(
    collection_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    service = CollectionService(db)
    await service.delete_collection(collection_id)
    return {"detail": "Collection deleted successfully"}


@router.post("/{collection_id}/patents/{patent_id}")
async def add_patent(
    collection_id: str,
    patent_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    service = CollectionService(db)
    await service.add_patent(collection_id, patent_id)
    return {"detail": "Patent added to collection successfully"}


@router.delete("/{collection_id}/patents/{patent_id}")
async def remove_patent(
    collection_id: str,
    patent_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    service = CollectionService(db)
    await service.remove_patent(collection_id, patent_id)
    return {"detail": "Patent removed from collection successfully"}
