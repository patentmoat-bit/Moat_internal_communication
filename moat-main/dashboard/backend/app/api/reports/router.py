import json
import uuid
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User
from app.models.report import Report, ScheduledReport, ReportStatus, ReportFormat, ScheduledReportSchedule
from app.schemas.reporting import (
    ReportRequest, ReportResponse, ReportListResponse,
    ScheduledReportCreate, ScheduledReportResponse,
)
from app.services.reporting.service import ReportingService
from app.api.auth.router import get_current_user

router = APIRouter(prefix="/reporting", tags=["reporting"])


@router.post("/generate")
async def generate_report(
    req: ReportRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    report_id = str(uuid.uuid4())
    report = Report(
        id=report_id,
        name=f"Report_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}",
        user_id=current_user.id,
        format=ReportFormat.PDF if req.format == "pdf" else ReportFormat.XLSX,
        status=ReportStatus.PENDING,
        patent_ids=json.dumps(req.patent_ids),
    )
    db.add(report)
    await db.commit()

    background_tasks.add_task(
        _generate_report_task, report_id, req, db
    )

    return {"id": report_id, "status": "pending", "message": "Report generation started"}


async def _generate_report_task(report_id: str, req: ReportRequest, db: AsyncSession):
    try:
        result = await db.execute(select(Report).where(Report.id == report_id))
        report = result.scalar_one_or_none()
        if not report:
            return

        report.status = ReportStatus.GENERATING
        await db.commit()

        service = ReportingService(db)

        if req.format == "xlsx":
            content = await service.generate_xlsx_report(req.patent_ids)
            file_url = f"/reports/{report_id}.xlsx"
        else:
            content = await service.generate_pdf_report(
                req.patent_ids, req.include_ai_summary, req.include_claims, req.include_metadata
            )
            file_url = f"/reports/{report_id}.pdf"

        import os
        reports_dir = "/app/reports"
        os.makedirs(reports_dir, exist_ok=True)
        ext = "xlsx" if req.format == "xlsx" else "pdf"
        file_path = os.path.join(reports_dir, f"{report_id}.{ext}")
        with open(file_path, "wb") as f:
            f.write(content)

        report.status = ReportStatus.COMPLETED
        report.file_url = file_url
        report.completed_at = datetime.now(timezone.utc)
        await db.commit()

    except Exception as e:
        result = await db.execute(select(Report).where(Report.id == report_id))
        report = result.scalar_one_or_none()
        if report:
            report.status = ReportStatus.FAILED
            report.error_message = str(e)
            await db.commit()


@router.get("/reports", response_model=ReportListResponse)
async def list_reports(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Report).where(Report.user_id == current_user.id).order_by(Report.created_at.desc())
    )
    reports = result.scalars().all()
    return ReportListResponse(
        reports=[
            ReportResponse(
                id=r.id,
                name=r.name,
                format=r.format.value if hasattr(r.format, 'value') else str(r.format),
                status=r.status.value if hasattr(r.status, 'value') else str(r.status),
                file_url=r.file_url,
                created_at=r.created_at,
            )
            for r in reports
        ],
        total=len(reports),
    )


@router.get("/reports/{report_id}", response_model=ReportResponse)
async def get_report(
    report_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Report).where(Report.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    if report.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    return ReportResponse(
        id=report.id,
        name=report.name,
        format=report.format.value if hasattr(report.format, 'value') else str(report.format),
        status=report.status.value if hasattr(report.status, 'value') else str(report.status),
        file_url=report.file_url,
        created_at=report.created_at,
    )


@router.post("/scheduled")
async def create_scheduled_report(
    req: ScheduledReportCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    schedule_map = {
        "daily": ScheduledReportSchedule.DAILY,
        "weekly": ScheduledReportSchedule.WEEKLY,
        "monthly": ScheduledReportSchedule.MONTHLY,
    }
    schedule_enum = schedule_map.get(req.schedule, ScheduledReportSchedule.WEEKLY)

    now = datetime.now(timezone.utc)
    next_run = _calculate_next_run(schedule_enum, now)

    scheduled = ScheduledReport(
        id=str(uuid.uuid4()),
        name=req.name,
        user_id=current_user.id,
        query=req.query,
        filters=json.dumps(req.filters) if req.filters else None,
        schedule=schedule_enum,
        format=ReportFormat.PDF if req.format == "pdf" else ReportFormat.XLSX,
        recipients=json.dumps(req.recipients) if req.recipients else None,
        is_active=True,
        next_run_at=next_run,
    )
    db.add(scheduled)
    await db.commit()
    await db.refresh(scheduled)

    return ScheduledReportResponse(
        id=scheduled.id,
        name=scheduled.name,
        query=scheduled.query,
        schedule=schedule_enum.value,
        format=scheduled.format.value,
        recipients=json.loads(scheduled.recipients) if scheduled.recipients else [],
        last_run_at=scheduled.last_run_at,
        next_run_at=scheduled.next_run_at,
        is_active=scheduled.is_active,
        created_at=scheduled.created_at,
    )


@router.get("/scheduled", response_model=list[ScheduledReportResponse])
async def list_scheduled_reports(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ScheduledReport).where(
            ScheduledReport.user_id == current_user.id
        ).order_by(ScheduledReport.created_at.desc())
    )
    reports = result.scalars().all()
    return [
        ScheduledReportResponse(
            id=r.id,
            name=r.name,
            query=r.query,
            schedule=r.schedule.value,
            format=r.format.value,
            recipients=json.loads(r.recipients) if r.recipients else [],
            last_run_at=r.last_run_at,
            next_run_at=r.next_run_at,
            is_active=r.is_active,
            created_at=r.created_at,
        )
        for r in reports
    ]


def _calculate_next_run(schedule: ScheduledReportSchedule, from_date: datetime) -> datetime:
    if schedule == ScheduledReportSchedule.DAILY:
        return from_date + timedelta(days=1)
    elif schedule == ScheduledReportSchedule.WEEKLY:
        return from_date + timedelta(weeks=1)
    elif schedule == ScheduledReportSchedule.MONTHLY:
        return from_date + timedelta(days=30)
    return from_date + timedelta(weeks=1)
