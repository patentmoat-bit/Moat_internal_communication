from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select

from moat_api.auth.deps import CurrentPrincipal, ScopedDB, require
from moat_api.auth.permissions import Permission
from moat_api.core import telemetry
from moat_api.db.models import Invention
from moat_api.schemas.jobs import JobAccepted, JobOut
from moat_api.services import audit, jobs

router = APIRouter(prefix="/inventions", tags=["analysis"])

# No language model generates or judges anything on this path: retrieval finds
# passages, a named reviewer decides. Stating that beats inventing a version
# string that would make retrieved text look generated.
MODEL_VERSION = "none (retrieval only, no generation)"
PROMPT_VERSION = "none"


@router.post(
    "/{invention_id}/analyses",
    response_model=JobAccepted,
    status_code=status.HTTP_202_ACCEPTED,
)
async def run_analysis(
    invention_id: uuid.UUID,
    db: ScopedDB,
    principal: CurrentPrincipal,
    request: Request,
    response: Response,
    _: object = Depends(require(Permission.ANALYSIS_RUN)),
) -> JobAccepted:
    """Accept a prior-art search for the current revision.

    Returns 202, not a result. Retrieval that is fast today will not be fast
    against a 120-million-document corpus with a reranking budget, and the
    contract that survives that change is a durable job -- so it is the
    contract from the start (design doc §7).
    """
    invention = (
        await db.execute(select(Invention).where(Invention.id == invention_id))
    ).scalar_one_or_none()
    if invention is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "not_found", "message": "No such disclosure."},
        )

    try:
        job, created = await jobs.submit(
            db,
            principal,
            kind="analysis",
            # Keyed on the exact revision: asking twice for the same text
            # returns the same job instead of running retrieval twice.
            idempotency_key=f"analysis:{invention.id}:{invention.current_revision}",
            subject_type="invention",
            subject_id=invention.id,
            payload={
                "invention_id": str(invention.id),
                "revision": invention.current_revision,
                "requested_by": str(principal.user_id),
            },
            detail=f"Prior-art search for revision {invention.current_revision}",
        )
    except jobs.AdmissionRefused as refused:
        # 429, before acceptance. Saying no now is honest; accepting work that
        # cannot be run is not. Counted separately from errors: this is the
        # system working as designed, and must not read as unavailability.
        telemetry.admission_rejections.labels("analysis", "tenant_cap").inc()
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "code": "capacity_exhausted",
                "message": str(refused),
                "running": refused.running,
                "pending": refused.pending,
            },
            headers={"Retry-After": str(refused.retry_after)},
        ) from refused

    if created:
        audit.record(
            db,
            principal,
            "analysis.requested",
            resource_type="invention",
            resource_id=invention.id,
            request_id=getattr(request.state, "request_id", ""),
            revision=invention.current_revision,
            job_id=str(job.id),
        )
    await db.flush()

    response.headers["Location"] = f"/api/v1/jobs/{job.id}"
    return JobAccepted(
        job=JobOut.model_validate(job), status_url=f"/api/v1/jobs/{job.id}", created=created
    )
