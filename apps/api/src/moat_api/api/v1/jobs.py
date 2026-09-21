from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select

from moat_api.auth.deps import CurrentPrincipal, ScopedDB, require
from moat_api.auth.permissions import Permission
from moat_api.db.models import Job
from moat_api.schemas.jobs import JobOut

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("/{job_id}", response_model=JobOut)
async def get_job(
    job_id: uuid.UUID,
    db: ScopedDB,
    _: object = Depends(require(Permission.INVENTION_READ)),
) -> Job:
    """Durable progress for accepted work.

    Answers for the life of the job, including after it finished, so a browser
    that was closed mid-run can still find out what happened (design doc §7).
    """
    job = (await db.execute(select(Job).where(Job.id == job_id))).scalar_one_or_none()
    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "not_found", "message": "No such job."},
        )
    return job


@router.get("", response_model=list[JobOut])
async def list_jobs(
    db: ScopedDB,
    principal: CurrentPrincipal,
    _: object = Depends(require(Permission.INVENTION_READ)),
    subject_id: uuid.UUID | None = Query(default=None),
    active_only: bool = Query(default=False),
    limit: int = Query(default=25, ge=1, le=100),
) -> list[Job]:
    query = select(Job).order_by(Job.created_at.desc())
    if subject_id:
        query = query.where(Job.subject_id == subject_id)
    if active_only:
        query = query.where(Job.status.in_(("queued", "running")))
    return list((await db.execute(query.limit(limit))).scalars())
