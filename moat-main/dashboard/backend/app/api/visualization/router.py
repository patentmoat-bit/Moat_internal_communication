from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.visualization import (
    CitationGraphResponse,
    CitationGraphNode,
    CitationGraphLink,
    TechnologyTreeResponse,
    TechnologyTreeNode,
    PatentRelationshipsResponse,
    PatentRelationship,
    GraphQueryRequest,
    GraphStatsResponse,
)
from app.services.visualization.service import VisualizationService

router = APIRouter(prefix="/visualization", tags=["visualization"])


@router.post("/citation-graph", response_model=CitationGraphResponse)
async def get_citation_graph(
    request: GraphQueryRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = VisualizationService(db)
    result = await service.get_citation_graph(request.patent_id, request.depth or 2)
    return CitationGraphResponse(
        nodes=[CitationGraphNode(**n) for n in result["nodes"]],
        links=[CitationGraphLink(**l) for l in result["links"]],
    )


@router.get("/technology-tree", response_model=TechnologyTreeResponse)
async def get_technology_tree(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = VisualizationService(db)
    result = await service.get_technology_tree()
    return TechnologyTreeResponse(root=TechnologyTreeNode(**result["root"]))


@router.post("/relationships", response_model=PatentRelationshipsResponse)
async def get_patent_relationships(
    request: GraphQueryRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = VisualizationService(db)
    result = await service.get_patent_relationships(request.patent_id)
    return PatentRelationshipsResponse(
        patent_id=result["patent_id"],
        patent_number=result["patent_number"],
        title=result["title"],
        relationships=[PatentRelationship(**r) for r in result["relationships"]],
    )


@router.get("/stats", response_model=GraphStatsResponse)
async def get_graph_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = VisualizationService(db)
    result = await service.get_graph_stats()
    return GraphStatsResponse(**result)
