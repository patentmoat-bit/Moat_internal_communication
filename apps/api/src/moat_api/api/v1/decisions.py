from __future__ import annotations

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select

from moat_api.auth.deps import CurrentPrincipal, ScopedDB, require
from moat_api.auth.permissions import Permission
from moat_api.db.models import (
    Decision,
    Invention,
    InventionContributor,
    Notification,
    Submission,
)
from moat_api.schemas.invention import DecisionCreate, DecisionOut, PersonRef
from moat_api.services import audit

router = APIRouter(prefix="/inventions", tags=["review"])

OUTCOME_TO_STATUS = {"approved": "approved", "returned": "returned", "rejected": "returned"}


@router.post(
    "/{invention_id}/decisions",
    response_model=DecisionOut,
    status_code=status.HTTP_201_CREATED,
)
async def record_decision(
    invention_id: uuid.UUID,
    body: DecisionCreate,
    db: ScopedDB,
    principal: CurrentPrincipal,
    request: Request,
    _: object = Depends(require(Permission.DECISION_CREATE)),
) -> DecisionOut:
    """Record a reviewer's position on one exact revision.

    The reviewer states which revision they read. If the disclosure moved while
    they were reading, the decision is refused rather than applied to text
    nobody assessed -- the failure mode this whole revision model exists to
    prevent.
    """
    # SELECT ... FOR UPDATE: holds the invention row for the rest of the
    # transaction so two reviewers cannot decide the same revision at once.
    invention = (
        await db.execute(
            select(Invention).where(Invention.id == invention_id).with_for_update()
        )
    ).scalar_one_or_none()
    if invention is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "not_found", "message": "No such disclosure."},
        )

    if body.revision != invention.current_revision:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "revision_moved",
                "message": (
                    "The disclosure changed while you were reviewing. "
                    "Reload and assess the current revision."
                ),
                "current_revision": invention.current_revision,
                "reviewed_revision": body.revision,
            },
        )

    if invention.status not in {"submitted", "in_review"}:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "bad_state",
                "message": f"A disclosure in state '{invention.status}' is not awaiting review.",
            },
        )

    submission = (
        await db.execute(
            select(Submission)
            .where(
                Submission.invention_id == invention.id,
                Submission.revision == body.revision,
            )
            .with_for_update()
        )
    ).scalar_one_or_none()
    if submission is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "no_submission", "message": "That revision was never submitted."},
        )

    decision = Decision(
        tenant_id=principal.tenant_id,
        submission_id=submission.id,
        invention_id=invention.id,
        revision=body.revision,
        reviewer_id=principal.user_id,
        outcome=body.outcome,
        rationale=body.rationale,
        decided_at=datetime.now(UTC),
    )
    db.add(decision)

    submission.state = "decided"
    invention.status = OUTCOME_TO_STATUS[body.outcome]
    invention.updated_at = datetime.now(UTC)

    contributor_ids = list(
        (
            await db.execute(
                select(InventionContributor.user_id).where(
                    InventionContributor.invention_id == invention.id
                )
            )
        ).scalars()
    )
    for user_id in contributor_ids:
        db.add(
            Notification(
                tenant_id=principal.tenant_id,
                user_id=user_id,
                kind="approval_decision",
                title=f"{invention.ref} {body.outcome}",
                body=f"{principal.user_name} decided on revision {body.revision}.",
                target_type="invention",
                target_id=invention.id,
                action_url=f"/inventions/{invention.id}",
                priority="high",
                payload={"outcome": body.outcome, "revision": body.revision},
            )
        )

    audit.record(
        db,
        principal,
        "decision.create",
        resource_type="invention",
        resource_id=invention.id,
        request_id=getattr(request.state, "request_id", ""),
        outcome=body.outcome,
        revision=body.revision,
    )
    await db.flush()

    return DecisionOut(
        id=decision.id,
        reviewer=PersonRef(
            id=principal.user_id, name=principal.user_name, email=principal.user_email
        ),
        revision=decision.revision,
        outcome=decision.outcome,
        rationale=decision.rationale,
        decided_at=decision.decided_at,
        superseded=False,
    )
