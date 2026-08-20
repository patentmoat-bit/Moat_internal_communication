from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.understanding import InventionUnderstandingRequest, InventionUnderstandingResponse
from app.services.invention_understanding.service import InventionUnderstandingService

router = APIRouter(prefix="/understanding", tags=["invention-understanding"])


@router.post("/analyze", response_model=InventionUnderstandingResponse)
async def analyze_invention(
    request: InventionUnderstandingRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = InventionUnderstandingService(db)
    return await service.analyze(request)


@router.post("/analyze-file", response_model=InventionUnderstandingResponse)
async def analyze_invention_file(
    input_type: str = Form("pdf"),
    text: str | None = Form(None),
    patent_id: str | None = Form(None),
    patent_number: str | None = Form(None),
    file: UploadFile | None = File(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    file_bytes = await file.read() if file else None
    request = InventionUnderstandingRequest(
        input_type=input_type,
        text=text,
        patent_id=patent_id,
        patent_number=patent_number,
        filename=file.filename if file else None,
        mime_type=file.content_type if file else None,
    )
    service = InventionUnderstandingService(db)
    return await service.analyze(request, file_bytes=file_bytes)
