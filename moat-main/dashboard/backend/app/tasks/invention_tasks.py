import asyncio

from app.celery_app import celery_app
from app.database import AsyncSessionLocal
from app.models.user import User
from app.services.inventions.service import InventionService


@celery_app.task(name="app.tasks.invention_tasks.analyze_invention_task")
def analyze_invention_task(invention_id: str, user_id: str) -> dict:
    return asyncio.run(_run(invention_id, user_id))


async def _run(invention_id: str, user_id: str) -> dict:
    async with AsyncSessionLocal() as db:
        user = await db.get(User, user_id)
        if not user:
            raise ValueError("User not found")
        invention, analysis = await InventionService(db).analyze_invention(invention_id, user)
        await db.commit()
        return {"invention_id": invention["id"], "analysis_id": analysis["id"]}
