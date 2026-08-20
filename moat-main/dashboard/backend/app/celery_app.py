from celery import Celery

from app.config import settings

celery_app = Celery("patent_intelligence", broker=settings.REDIS_URL, backend=settings.REDIS_URL)
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_routes={"app.tasks.invention_tasks.*": {"queue": "ai"}},
)
