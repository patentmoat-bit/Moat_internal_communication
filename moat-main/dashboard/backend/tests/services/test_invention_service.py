import pytest
from unittest.mock import AsyncMock, MagicMock

from app.core.exceptions import ForbiddenException, NotFoundException
from app.models.invention import InventionStatus
from app.models.user import UserRole
from app.schemas.invention import InventionCreate
from app.services.inventions.analysis import InventionAIAnalysisService
from app.services.inventions.service import InventionService


def user(user_id="user-1", role=UserRole.researcher):
    item = MagicMock()
    item.id = user_id
    item.role = role
    item.name = "Researcher"
    return item


def invention(owner="user-1"):
    item = MagicMock()
    item.id = "inv-1"
    item.workspace_id = None
    item.matter_id = None
    item.title = "Adaptive Sensor"
    item.description = "A wearable sensor with adaptive low power sampling and a processor."
    item.status = InventionStatus.ready
    item.created_by = owner
    item.created_at = "2026-06-04T00:00:00Z"
    item.updated_at = "2026-06-04T00:00:00Z"
    item.documents = []
    item.analyses = []
    return item


@pytest.mark.asyncio
async def test_rule_analysis_generates_profile():
    result = await InventionAIAnalysisService().analyze("Adaptive Sensor", "A wearable sensor with adaptive low power sampling, processor, and wireless interface.")
    assert result.technical_summary
    assert result.key_components
    assert result.workflows
    assert result.innovation_highlights


@pytest.mark.asyncio
async def test_get_invention_not_found():
    svc = InventionService(AsyncMock())
    svc.repo.get = AsyncMock(return_value=None)
    with pytest.raises(NotFoundException):
        await svc.get_invention("missing", user())


@pytest.mark.asyncio
async def test_forbidden_for_non_owner():
    svc = InventionService(AsyncMock())
    svc.repo.get = AsyncMock(return_value=invention(owner="other"))
    with pytest.raises(ForbiddenException):
        await svc.get_invention("inv-1", user())


@pytest.mark.asyncio
async def test_create_invention_serializes():
    db = AsyncMock()
    db.add = MagicMock()
    db.flush = AsyncMock()
    db.refresh = AsyncMock()
    svc = InventionService(db)
    result = await svc.create_invention(InventionCreate(title="Adaptive Sensor", description="Test"), user())
    assert result["title"] == "Adaptive Sensor"
    assert result["status"] == InventionStatus.draft
