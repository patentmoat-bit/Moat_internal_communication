from unittest.mock import AsyncMock, MagicMock, patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.deps import get_current_user, get_db
from app.api.inventions.router import router
from app.models.user import UserRole


def current_user():
    user = MagicMock()
    user.id = "user-1"
    user.role = UserRole.researcher
    user.name = "Researcher"
    return user


def client():
    app = FastAPI()
    app.include_router(router, prefix="/api/v1")
    app.dependency_overrides[get_current_user] = lambda: current_user()
    app.dependency_overrides[get_db] = lambda: MagicMock()
    return TestClient(app)


def invention_payload():
    return {
        "id": "inv-1",
        "workspace_id": None,
        "matter_id": None,
        "title": "Adaptive Sensor",
        "description": "A wearable sensor.",
        "status": "draft",
        "created_by": "user-1",
        "created_at": "2026-06-04T00:00:00Z",
        "updated_at": "2026-06-04T00:00:00Z",
        "documents": [],
        "latest_analysis": None,
    }


def analysis_payload():
    return {
        "id": "ana-1",
        "invention_id": "inv-1",
        "technical_summary": "Summary",
        "innovation_summary": "Innovation",
        "key_components": [],
        "technical_domains": [],
        "differentiators": [],
        "workflows": [],
        "technical_architecture": {},
        "innovation_highlights": [],
        "confidence_score": 0.8,
        "model_name": "test",
        "created_at": "2026-06-04T00:00:00Z",
    }


def test_create_invention_api():
    test_client = client()
    with patch("app.api.inventions.router.InventionService") as cls:
        cls.return_value.create_invention = AsyncMock(return_value=invention_payload())
        response = test_client.post("/api/v1/inventions", json={"title": "Adaptive Sensor"}, headers={"Authorization": "Bearer token"})
    assert response.status_code == 201
    assert response.json()["title"] == "Adaptive Sensor"


def test_analyze_invention_api():
    test_client = client()
    with patch("app.api.inventions.router.InventionService") as cls:
        cls.return_value.analyze_invention = AsyncMock(return_value=(invention_payload(), analysis_payload()))
        response = test_client.post("/api/v1/inventions/inv-1/analyze", headers={"Authorization": "Bearer token"})
    assert response.status_code == 200
    assert response.json()["analysis"]["technical_summary"] == "Summary"


def test_get_analysis_api():
    test_client = client()
    with patch("app.api.inventions.router.InventionService") as cls:
        cls.return_value.get_analysis = AsyncMock(return_value=analysis_payload())
        response = test_client.get("/api/v1/inventions/inv-1/analysis", headers={"Authorization": "Bearer token"})
    assert response.status_code == 200
    assert response.json()["confidence_score"] == 0.8
