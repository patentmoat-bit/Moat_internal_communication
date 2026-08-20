from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, List

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.landscape import LandscapeStudy
from app.core.exceptions import AppException

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/landscape", response_model=List[dict])
async def list_landscape_studies(
    workspace_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List landscape studies for a specific workspace."""
    stmt = select(LandscapeStudy).where(LandscapeStudy.workspace_id == workspace_id)
    result = await db.execute(stmt)
    studies = result.scalars().all()
    
    return [
        {
            "id": s.id,
            "name": s.name,
            "description": s.description,
            "created_at": s.created_at,
            "updated_at": s.updated_at
        } for s in studies
    ]

@router.post("/landscape", response_model=dict)
async def create_landscape_study(
    workspace_id: str,
    name: str,
    description: Optional[str] = None,
    configuration: Optional[dict] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new landscape study."""
    study = LandscapeStudy(
        name=name,
        description=description,
        workspace_id=workspace_id,
        created_by=current_user.id,
        configuration=configuration or {}
    )
    db.add(study)
    await db.commit()
    await db.refresh(study)
    
    return {
        "id": study.id,
        "name": study.name,
        "description": study.description,
        "created_at": study.created_at
    }

@router.get("/competitor-velocity", response_model=dict)
async def get_competitor_velocity(
    study_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get mock competitor velocity data for D3/Recharts rendering.
    In Phase 3 this will query Neo4j and aggregate over time.
    """
    # Fetch study to ensure it exists
    stmt = select(LandscapeStudy).where(LandscapeStudy.id == study_id)
    result = await db.execute(stmt)
    study = result.scalar_one_or_none()
    
    if not study:
        raise HTTPException(status_code=404, detail="Landscape study not found")
        
    # Return mock data for scaffolding the chart
    return {
        "data": [
            {"year": "2020", "Google": 120, "Apple": 80, "Samsung": 150},
            {"year": "2021", "Google": 150, "Apple": 90, "Samsung": 160},
            {"year": "2022", "Google": 200, "Apple": 110, "Samsung": 190},
            {"year": "2023", "Google": 220, "Apple": 130, "Samsung": 195},
            {"year": "2024", "Google": 280, "Apple": 180, "Samsung": 210},
        ],
        "competitors": ["Google", "Apple", "Samsung"]
    }

@router.get("/network-graph", response_model=dict)
async def get_network_graph(
    study_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get mock citation network graph data for D3 rendering.
    In Phase 3 this will query Neo4j directly.
    """
    return {
        "nodes": [
            {"id": "US123", "group": 1, "label": "Google Core Patent"},
            {"id": "US456", "group": 2, "label": "Apple Standard"},
            {"id": "US789", "group": 1, "label": "Google Continuation"},
            {"id": "US101", "group": 3, "label": "Samsung Prior Art"}
        ],
        "links": [
            {"source": "US123", "target": "US456", "value": 2},
            {"source": "US789", "target": "US123", "value": 5},
            {"source": "US101", "target": "US123", "value": 1}
        ]
    }
