import pytest
from unittest.mock import AsyncMock, MagicMock

from app.core.exceptions import ForbiddenException, NotFoundException
from app.models.matter import MatterMemberRole, MatterStatus
from app.models.user import UserRole
from app.schemas.matter import MatterCreate, MatterStatusUpdate
from app.services.matters.service import MatterService


def make_user(user_id="user-1", role=UserRole.analyst):
    user = MagicMock()
    user.id = user_id
    user.name = "Matter User"
    user.email = "matter@example.com"
    user.role = role
    return user


def make_matter(owner_id="user-1"):
    matter = MagicMock()
    matter.id = "matter-1"
    matter.owner_id = owner_id
    matter.owner = make_user(owner_id)
    matter.workspace_id = None
    matter.matter_number = "MAT-00001"
    matter.title = "Wearable Sensor FTO"
    matter.description = None
    matter.client_name = None
    matter.technology_area = None
    matter.notes = None
    matter.status = MatterStatus.intake
    matter.priority = "medium"
    matter.due_date = None
    matter.tags = []
    return matter


@pytest.mark.asyncio
async def test_viewer_cannot_create_matter():
    svc = MatterService(AsyncMock())
    with pytest.raises(ForbiddenException):
        await svc.create_matter(MatterCreate(title="Blocked"), make_user(role=UserRole.viewer))


@pytest.mark.asyncio
async def test_get_matter_not_found():
    svc = MatterService(AsyncMock())
    svc.repo.get = AsyncMock(return_value=None)
    with pytest.raises(NotFoundException):
        await svc.get_matter("missing", make_user())


@pytest.mark.asyncio
async def test_update_status_records_history_for_owner():
    db = AsyncMock()
    db.add = MagicMock()
    db.flush = AsyncMock()
    db.refresh = AsyncMock()
    svc = MatterService(db)
    matter = make_matter(owner_id="user-1")
    svc.repo.get = AsyncMock(return_value=matter)
    svc.repo.membership = AsyncMock(return_value=None)
    svc.repo.counts = AsyncMock(return_value=(1, 0, 1))

    result = await svc.update_status("matter-1", MatterStatusUpdate(status=MatterStatus.analysis, note="Ready"), make_user())

    assert matter.status == MatterStatus.analysis
    assert result["status"] == MatterStatus.analysis
    assert db.add.call_count >= 2


@pytest.mark.asyncio
async def test_non_member_cannot_update_status():
    svc = MatterService(AsyncMock())
    svc.repo.get = AsyncMock(return_value=make_matter(owner_id="other-user"))
    svc.repo.membership = AsyncMock(return_value=None)
    with pytest.raises(ForbiddenException):
        await svc.update_status("matter-1", MatterStatusUpdate(status=MatterStatus.analysis), make_user())
