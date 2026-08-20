from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.comparison import CompareRequest, CompareResponse, SideBySidePatent
from app.services.comparison.service import ComparisonService

router = APIRouter(prefix="/comparison", tags=["comparison"])


@router.post("/compare", response_model=CompareResponse)
async def compare_patents(
    request: CompareRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if len(request.patent_ids) < 2:
        raise HTTPException(status_code=400, detail="At least 2 patent IDs required")
    if len(request.patent_ids) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 patents per comparison")

    service = ComparisonService(db)
    patents = await service.get_patents_for_comparison(request.patent_ids)

    if len(patents) < 2:
        raise HTTPException(status_code=404, detail="Not enough patents found")

    side_by_side = [
        SideBySidePatent(
            id=str(p.id),
            patent_number=p.patent_number or "",
            title=p.title or "",
            abstract=p.abstract or "",
            assignee=p.assignee or "",
            inventors=p.inventors or [],
            filing_date=str(p.filing_date or ""),
            publication_date=str(p.publication_date or ""),
            status=p.status or "",
            cpc_classifications=p.cpc_classifications or [],
            ipc_classifications=p.ipc_classifications or [],
        )
        for p in patents
    ]

    claim_comparison = await service.compute_claim_comparison(patents)
    feature_matrix = await service.compute_feature_matrix(patents)
    overlap_scores = await service.compute_overlap_scores(patents)
    overall_similarity = await service.compute_overall_similarity(patents)

    return CompareResponse(
        patents=side_by_side,
        claim_comparison=claim_comparison,
        feature_matrix=feature_matrix,
        overlap_scores=overlap_scores,
        overall_similarity=overall_similarity,
    )
