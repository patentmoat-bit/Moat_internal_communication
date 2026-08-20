from fastapi import APIRouter, Depends, File, Form, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.invention import InventionDocumentType
from app.models.user import User
from app.schemas.invention import (
    InventionAnalysisResponse,
    InventionAnalyzeResponse,
    InventionCreate,
    InventionDocumentResponse,
    InventionResponse,
    InventionUpdate,
)
from app.services.inventions.service import InventionService

router = APIRouter(prefix="/inventions", tags=["inventions"])


@router.get("", response_model=list[InventionResponse])
async def list_inventions(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await InventionService(db).list_inventions(current_user)


@router.post("", response_model=InventionResponse, status_code=status.HTTP_201_CREATED)
async def create_invention(data: InventionCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await InventionService(db).create_invention(data, current_user)


@router.get("/{invention_id}", response_model=InventionResponse)
async def get_invention(invention_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await InventionService(db).get_invention(invention_id, current_user)


@router.put("/{invention_id}", response_model=InventionResponse)
async def update_invention(invention_id: str, data: InventionUpdate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await InventionService(db).update_invention(invention_id, data, current_user)


@router.post("/upload", response_model=InventionDocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_invention_file(
    invention_id: str = Form(...),
    file_type: InventionDocumentType = Form(InventionDocumentType.other),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await InventionService(db).upload_document(invention_id, file, file_type, current_user)


@router.post("/{invention_id}/analyze", response_model=InventionAnalyzeResponse)
async def analyze_invention(invention_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    invention, analysis = await InventionService(db).analyze_invention(invention_id, current_user)
    return {"invention": invention, "analysis": analysis, "task_id": None}


@router.get("/{invention_id}/analysis", response_model=InventionAnalysisResponse)
async def get_invention_analysis(invention_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await InventionService(db).get_analysis(invention_id, current_user)


@router.get("/{invention_id}/analysis/history", response_model=list[InventionAnalysisResponse])
async def get_invention_analysis_history(invention_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await InventionService(db).list_analysis_history(invention_id, current_user)
