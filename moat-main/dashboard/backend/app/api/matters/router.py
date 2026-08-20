from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.matter import (
    MatterActivityResponse,
    MatterCreate,
    MatterDetailResponse,
    MatterDocumentCreate,
    MatterDocumentResponse,
    MatterMemberCreate,
    MatterMemberResponse,
    MatterMemberUpdate,
    MatterNotesUpdate,
    MatterResponse,
    MatterShareRequest,
    MatterStatusUpdate,
    MatterUpdate,
)
from app.services.matters.service import MatterService

router = APIRouter(prefix="/matters", tags=["matters"])


@router.get("", response_model=list[MatterResponse])
async def list_matters(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await MatterService(db).list_matters(current_user)


@router.post("", response_model=MatterResponse, status_code=status.HTTP_201_CREATED)
async def create_matter(data: MatterCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await MatterService(db).create_matter(data, current_user)


@router.get("/{matter_id}", response_model=MatterDetailResponse)
async def get_matter(matter_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await MatterService(db).get_matter(matter_id, current_user)


@router.put("/{matter_id}", response_model=MatterResponse)
async def update_matter(matter_id: str, data: MatterUpdate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await MatterService(db).update_matter(matter_id, data, current_user)


@router.delete("/{matter_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_matter(matter_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await MatterService(db).delete_matter(matter_id, current_user)


@router.get("/{matter_id}/members", response_model=list[MatterMemberResponse])
async def list_members(matter_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await MatterService(db).list_members(matter_id, current_user)


@router.post("/{matter_id}/members", response_model=MatterMemberResponse, status_code=status.HTTP_201_CREATED)
async def assign_member(matter_id: str, data: MatterMemberCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await MatterService(db).add_member(matter_id, data, current_user)


@router.post("/{matter_id}/share", response_model=MatterMemberResponse, status_code=status.HTTP_201_CREATED)
async def share_matter(matter_id: str, data: MatterShareRequest, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await MatterService(db).add_member(matter_id, data, current_user)


@router.patch("/{matter_id}/members/{member_id}", response_model=MatterMemberResponse)
async def update_member(matter_id: str, member_id: str, data: MatterMemberUpdate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await MatterService(db).update_member(matter_id, member_id, data, current_user)


@router.delete("/{matter_id}/members/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(matter_id: str, member_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await MatterService(db).remove_member(matter_id, member_id, current_user)


@router.post("/{matter_id}/status", response_model=MatterResponse)
async def update_status(matter_id: str, data: MatterStatusUpdate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await MatterService(db).update_status(matter_id, data, current_user)


@router.put("/{matter_id}/notes", response_model=MatterResponse)
async def update_notes(matter_id: str, data: MatterNotesUpdate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await MatterService(db).update_notes(matter_id, data, current_user)


@router.get("/{matter_id}/activity", response_model=list[MatterActivityResponse])
async def list_activity(matter_id: str, limit: int = Query(50, ge=1, le=100), current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await MatterService(db).list_activity(matter_id, current_user, limit)


@router.get("/{matter_id}/documents", response_model=list[MatterDocumentResponse])
async def list_documents(matter_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await MatterService(db).list_documents(matter_id, current_user)


@router.post("/{matter_id}/documents", response_model=MatterDocumentResponse, status_code=status.HTTP_201_CREATED)
async def add_document(matter_id: str, data: MatterDocumentCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await MatterService(db).add_document(matter_id, data, current_user)


@router.delete("/{matter_id}/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(matter_id: str, document_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await MatterService(db).delete_document(matter_id, document_id, current_user)
