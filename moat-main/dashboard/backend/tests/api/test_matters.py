from unittest.mock import AsyncMock, MagicMock, patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.deps import get_current_user, get_db
from app.api.matters.router import router
from app.models.user import UserRole


def user():
    current = MagicMock()
    current.id = "user-1"
    current.email = "user@example.com"
    current.name = "Matter User"
    current.role = UserRole.analyst
    return current


def app_client():
    app = FastAPI()
    app.include_router(router, prefix="/api/v1")
    app.dependency_overrides[get_current_user] = lambda: user()
    app.dependency_overrides[get_db] = lambda: MagicMock()
    return TestClient(app)


def matter_payload():
    return {
        "id": "matter-1",
        "workspace_id": None,
        "owner_id": "user-1",
        "owner_name": "Matter User",
        "matter_number": "MAT-00001",
        "title": "Wearable Sensor FTO",
        "description": "Review biometric sensor claims.",
        "client_name": "Aster Labs",
        "technology_area": "Wearables",
        "notes": "Initial notes",
        "status": "intake",
        "priority": "high",
        "due_date": None,
        "tags": ["FTO"],
        "created_at": "2026-06-04T00:00:00Z",
        "updated_at": "2026-06-04T00:00:00Z",
        "role": "owner",
        "member_count": 1,
        "document_count": 0,
        "activity_count": 1,
    }


def test_list_matters_api():
    client = app_client()
    with patch("app.api.matters.router.MatterService") as service_cls:
        service = service_cls.return_value
        service.list_matters = AsyncMock(return_value=[matter_payload()])
        response = client.get("/api/v1/matters", headers={"Authorization": "Bearer test"})
    assert response.status_code == 200
    assert response.json()[0]["matter_number"] == "MAT-00001"


def test_create_matter_api():
    client = app_client()
    with patch("app.api.matters.router.MatterService") as service_cls:
        service = service_cls.return_value
        service.create_matter = AsyncMock(return_value=matter_payload())
        response = client.post("/api/v1/matters", json={"title": "Wearable Sensor FTO"}, headers={"Authorization": "Bearer test"})
    assert response.status_code == 201
    assert response.json()["title"] == "Wearable Sensor FTO"


def test_update_status_api():
    client = app_client()
    payload = matter_payload()
    payload["status"] = "analysis"
    with patch("app.api.matters.router.MatterService") as service_cls:
        service = service_cls.return_value
        service.update_status = AsyncMock(return_value=payload)
        response = client.post("/api/v1/matters/matter-1/status", json={"status": "analysis", "note": "Ready"}, headers={"Authorization": "Bearer test"})
    assert response.status_code == 200
    assert response.json()["status"] == "analysis"
