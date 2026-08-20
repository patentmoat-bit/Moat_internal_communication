import json
from datetime import datetime, timezone
from sqlalchemy import select
from app.celery_app import celery_app
from app.database import AsyncSessionLocal
from app.models.report import ScheduledReport, Report, ReportStatus, ReportFormat
from app.services.reporting.service import ReportingService


@celery_app.task
def execute_scheduled_reports():
    import asyncio
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(_execute_scheduled_reports())
    finally:
        loop.close()


async def _execute_scheduled_reports():
    from sqlalchemy.ext.asyncio import AsyncSession
    from sqlalchemy.orm import sessionmaker

    async with AsyncSessionLocal() as db:
        now = datetime.now(timezone.utc)
        result = await db.execute(
            select(ScheduledReport).where(
                ScheduledReport.is_active == True,
                ScheduledReport.next_run_at <= now,
            )
        )
        scheduled = result.scalars().all()

        for s in scheduled:
            try:
                query = s.query or ""
                filters = json.loads(s.filters) if s.filters else {}
                patent_ids = filters.get("patent_ids", [])

                if not patent_ids:
                    continue

                report_id = str(__import__("uuid").uuid4())
                report = Report(
                    id=report_id,
                    name=f"Scheduled: {s.name}",
                    user_id=s.user_id,
                    format=s.format,
                    status=ReportStatus.GENERATING,
                    patent_ids=json.dumps(patent_ids),
                )
                db.add(report)
                await db.commit()

                service = ReportingService(db)

                if s.format == ReportFormat.XLSX:
                    content = await service.generate_xlsx_report(patent_ids)
                else:
                    content = await service.generate_pdf_report(patent_ids, True, True, True)

                import os
                reports_dir = "/app/reports"
                os.makedirs(reports_dir, exist_ok=True)
                ext = "xlsx" if s.format == ReportFormat.XLSX else "pdf"
                file_path = os.path.join(reports_dir, f"{report_id}.{ext}")
                with open(file_path, "wb") as f:
                    f.write(content)

                report.status = ReportStatus.COMPLETED
                report.file_url = f"/reports/{report_id}.{ext}"
                report.completed_at = datetime.now(timezone.utc)
                s.last_run_at = datetime.now(timezone.utc)
                s.next_run_at = s.last_run_at + __import__("datetime").timedelta(
                    days=1 if s.schedule.value == "daily" else 7 if s.schedule.value == "weekly" else 30
                )
                await db.commit()

            except Exception as e:
                report.status = ReportStatus.FAILED
                report.error_message = str(e)
                await db.commit()
