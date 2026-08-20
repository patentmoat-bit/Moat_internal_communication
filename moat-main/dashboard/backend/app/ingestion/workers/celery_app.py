from celery import Celery

from app.config import settings

celery_app = Celery(
    "patent_intelligence",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.ingestion.workers.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,
    task_soft_time_limit=25 * 60,
    worker_max_tasks_per_child=50,
    task_queues={
        "ingestion": {"exchange": "ingestion", "routing_key": "ingestion.*"},
        "indexing": {"exchange": "indexing", "routing_key": "indexing.*"},
        "default": {"exchange": "default", "routing_key": "default.*"},
    },
    task_routes={
        "app.ingestion.workers.tasks.process_patent_document": {"queue": "ingestion"},
        "app.ingestion.workers.tasks.batch_ingest": {"queue": "ingestion"},
        "app.ingestion.workers.tasks.index_patent_to_es": {"queue": "indexing"},
    },
)
