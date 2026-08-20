from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.api.deps import get_current_user
from app.models.user import User
from app.services.dashboard.mock_data import get_dashboard_for_role

router = APIRouter()

class DashboardResponse(BaseModel):
    widgets: list[dict]
    charts: list[dict]
    insights: list[dict]
    aiRecommendations: list[str]

@router.get("/{role}", response_model=DashboardResponse)
def get_role_dashboard(role: str):
    """
    Get the dynamic dashboard configuration and mock data for a specific role.
    """
    valid_roles = ["ceo", "cto", "cio", "patent_counsel", "legal", "research_lead", "research", "product_manager", "product", "analyst", "admin"]
    if role not in valid_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role requested: {role}"
        )
    
    # Normally we would check if the current_user has access to this role's dashboard.
    # For now, we just return the data.
    
    dashboard_data = get_dashboard_for_role(role)
    return DashboardResponse(**dashboard_data)
