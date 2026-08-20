from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.services.image_search.service import ImageSearchService

router = APIRouter(prefix="/search/image", tags=["search"])

@router.post("", response_model=list[dict])
async def search_by_image(
    file: UploadFile = File(...),
    limit: int = Form(10),
    min_score: float = Form(0.0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image.")
        
    try:
        content = await file.read()
        service = ImageSearchService(db)
        results = await service.search_by_image(
            image_bytes=content,
            mime_type=file.content_type,
            limit=limit,
            min_score=min_score
        )
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
