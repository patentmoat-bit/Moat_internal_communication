import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.workspace.service import WorkspaceService
from app.schemas.workspace import WorkspaceCreate, WorkspaceUpdate
from app.core.exceptions import NotFoundException, ForbiddenException


def make_workspace(owner_id="user-1", workspace_id="ws-1", name="Test WS"):
    ws = MagicMock()
    ws.id = workspace_id
    ws.name = name
    ws.description = None
    ws.notes = None
    ws.owner_id = owner_id
    return ws


@pytest.mark.asyncio
async def test_get_workspace_raises_not_found():
    db = AsyncMock()
    result_mock = MagicMock()
    result_mock.scalar_one_or_none.return_value = None
    db.execute = AsyncMock(return_value=result_mock)

    svc = WorkspaceService(db)
    with pytest.raises(NotFoundException):
        await svc.get_workspace("nonexistent-id", "user-1")


@pytest.mark.asyncio
async def test_get_workspace_raises_forbidden_for_wrong_owner():
    db = AsyncMock()
    ws = make_workspace(owner_id="user-2")
    result_mock = MagicMock()
    result_mock.scalar_one_or_none.return_value = ws
    db.execute = AsyncMock(return_value=result_mock)

    svc = WorkspaceService(db)
    with pytest.raises(ForbiddenException):
        await svc.get_workspace("ws-1", "user-1")


@pytest.mark.asyncio
async def test_create_workspace():
    db = AsyncMock()
    db.add = MagicMock()
    db.flush = AsyncMock()
    db.refresh = AsyncMock()

    res_member = MagicMock()
    res_member.scalar_one_or_none.return_value = None
    
    res_counts = MagicMock()
    res_counts.one.return_value = (1, 1)
    
    db.execute = AsyncMock(side_effect=[res_member, res_counts])

    svc = WorkspaceService(db)
    data = WorkspaceCreate(name="New WS", description="Desc", notes=None)
    result = await svc.create_workspace(data, "user-1")

    # The creation adds multiple records: Workspace, WorkspaceMember, activity, audit_log
    assert db.add.call_count >= 1
    db.flush.assert_awaited()
    assert result is not None
    assert result["name"] == "New WS"
    assert result["role"] == "owner"


@pytest.mark.asyncio
async def test_delete_workspace_calls_db_delete():
    db = AsyncMock()
    ws = make_workspace(owner_id="user-1")
    result_mock = MagicMock()
    result_mock.scalar_one_or_none.return_value = ws
    db.execute = AsyncMock(return_value=result_mock)
    db.delete = AsyncMock()
    db.flush = AsyncMock()

    svc = WorkspaceService(db)
    await svc.delete_workspace("ws-1", "user-1")

    db.delete.assert_awaited_once_with(ws)
    db.flush.assert_awaited_once()
