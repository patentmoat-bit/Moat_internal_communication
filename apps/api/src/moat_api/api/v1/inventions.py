from __future__ import annotations

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, select

from moat_api.auth.deps import CurrentPrincipal, ScopedDB, require
from moat_api.auth.permissions import Permission
from moat_api.db.models import (
    AnalysisConcept,
    Decision,
    EvidenceLink,
    Invention,
    InventionContributor,
    InventionVersion,
    Membership,
    MembershipRole,
    Notification,
    Role,
    Submission,
    User,
)
from moat_api.schemas.invention import (
    InventionCreate,
    InventionDetail,
    InventionSummary,
    InventionUpdate,
    SubmitRequest,
)
from moat_api.services import audit
from moat_api.services import inventions as service

router = APIRouter(prefix="/inventions", tags=["inventions"])


async def _load(db: ScopedDB, invention_id: uuid.UUID) -> Invention:
    """Fetch within the caller's tenant.

    The row policy already restricts this to the caller's tenant, so a wrong or
    guessed id from another tenant is indistinguishable from one that does not
    exist -- which is the correct answer to give.
    """
    invention = (
        await db.execute(select(Invention).where(Invention.id == invention_id))
    ).scalar_one_or_none()
    if invention is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "not_found", "message": "No such disclosure."},
        )
    return invention


@router.get("", response_model=list[InventionSummary])
async def list_inventions(
    db: ScopedDB,
    principal: CurrentPrincipal,
    _: object = Depends(require(Permission.INVENTION_READ)),
    status_filter: str | None = Query(default=None, alias="status"),
    mine: bool = Query(default=False),
    limit: int = Query(default=50, ge=1, le=200),
) -> list[InventionSummary]:
    query = select(Invention).order_by(Invention.updated_at.desc(), Invention.id.desc())
    if status_filter:
        query = query.where(Invention.status == status_filter)
    if mine:
        query = query.join(
            InventionContributor,
            InventionContributor.invention_id == Invention.id,
        ).where(InventionContributor.user_id == principal.user_id)

    rows = list((await db.execute(query.limit(limit))).scalars())
    ids = [row.id for row in rows]
    contributors = await service.contributors_of(db, ids)

    summaries: list[InventionSummary] = []
    for invention in rows:
        run = await service.latest_run(db, invention.id)
        count = 0
        if run is not None:
            count = (
                await db.execute(
                    select(func.count())
                    .select_from(EvidenceLink)
                    .where(EvidenceLink.run_id == run.id)
                )
            ).scalar_one()
        summaries.append(
            service.summary_out(invention, contributors.get(invention.id, []), run, count)
        )
    return summaries


@router.get("/{invention_id}", response_model=InventionDetail)
async def get_invention(
    invention_id: uuid.UUID,
    db: ScopedDB,
    _: object = Depends(require(Permission.INVENTION_READ)),
) -> InventionDetail:
    invention = await _load(db, invention_id)

    version = (
        await db.execute(
            select(InventionVersion).where(
                InventionVersion.invention_id == invention.id,
                InventionVersion.revision == invention.current_revision,
            )
        )
    ).scalar_one()

    contributors = (await service.contributors_of(db, [invention.id])).get(invention.id, [])

    analysis = None
    run = await service.latest_run(db, invention.id)
    if run is not None:
        concepts = list(
            (
                await db.execute(
                    select(AnalysisConcept).where(AnalysisConcept.run_id == run.id)
                )
            ).scalars()
        )
        evidence = list(
            (await db.execute(select(EvidenceLink).where(EvidenceLink.run_id == run.id))).scalars()
        )
        analysis = service.analysis_out(run, concepts, evidence)

    decision_row = (
        await db.execute(
            select(Decision, User)
            .join(User, User.id == Decision.reviewer_id)
            .where(Decision.invention_id == invention.id)
            .order_by(Decision.decided_at.desc())
            .limit(1)
        )
    ).first()
    decision, reviewer = decision_row if decision_row else (None, None)

    return service.detail_out(invention, version, contributors, analysis, decision, reviewer)


@router.post("", response_model=InventionDetail, status_code=status.HTTP_201_CREATED)
async def create_invention(
    body: InventionCreate,
    db: ScopedDB,
    principal: CurrentPrincipal,
    request: Request,
    _: object = Depends(require(Permission.INVENTION_CREATE)),
) -> InventionDetail:
    ref = await service.next_reference(db, principal.tenant_id, principal.tenant_slug)

    invention = Invention(
        tenant_id=principal.tenant_id,
        ref=ref,
        title=body.title,
        summary=body.summary,
        status="draft",
        current_revision=1,
        classifications=body.classifications,
        created_by_id=principal.user_id,
    )
    db.add(invention)
    await db.flush()

    version = InventionVersion(
        tenant_id=principal.tenant_id,
        invention_id=invention.id,
        revision=1,
        title=body.title,
        summary=body.summary,
        problem=body.problem,
        description=body.description,
        classifications=body.classifications,
        authored_by_id=principal.user_id,
    )
    db.add(version)
    # Inventorship is legally significant, so the creator is recorded explicitly
    # rather than inferred from the audit trail later.
    db.add(
        InventionContributor(
            tenant_id=principal.tenant_id,
            invention_id=invention.id,
            user_id=principal.user_id,
            contribution="Author",
        )
    )
    audit.record(
        db,
        principal,
        "invention.create",
        resource_type="invention",
        resource_id=invention.id,
        request_id=getattr(request.state, "request_id", ""),
        ref=ref,
    )
    await db.flush()

    contributors = (await service.contributors_of(db, [invention.id])).get(invention.id, [])
    return service.detail_out(invention, version, contributors, None, None, None)


@router.put("/{invention_id}", response_model=InventionDetail)
async def update_invention(
    invention_id: uuid.UUID,
    body: InventionUpdate,
    db: ScopedDB,
    principal: CurrentPrincipal,
    request: Request,
    _: object = Depends(require(Permission.INVENTION_UPDATE)),
) -> InventionDetail:
    invention = await _load(db, invention_id)

    if invention.status in {"filed"}:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "immutable", "message": "A filed disclosure cannot be edited."},
        )

    # Optimistic concurrency. Two people editing the same revision: the second
    # save is refused with the current revision so the client can merge, rather
    # than silently discarding the first person's work.
    if body.base_revision != invention.current_revision:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "revision_conflict",
                "message": "Someone else saved a newer revision. Reload before editing.",
                "current_revision": invention.current_revision,
            },
        )

    revision = invention.current_revision + 1
    db.add(
        InventionVersion(
            tenant_id=principal.tenant_id,
            invention_id=invention.id,
            revision=revision,
            title=body.title,
            summary=body.summary,
            problem=body.problem,
            description=body.description,
            classifications=body.classifications,
            authored_by_id=principal.user_id,
        )
    )

    invention.title = body.title
    invention.summary = body.summary
    invention.classifications = body.classifications
    invention.current_revision = revision
    invention.updated_at = datetime.now(UTC)
    # Editing after a decision returns the disclosure to draft: the previous
    # approval was for text that no longer exists.
    if invention.status in {"approved", "returned", "in_review", "submitted"}:
        invention.status = "draft"

    audit.record(
        db,
        principal,
        "invention.update",
        resource_type="invention",
        resource_id=invention.id,
        request_id=getattr(request.state, "request_id", ""),
        revision=revision,
    )
    await db.flush()
    return await get_invention(invention.id, db)  # type: ignore[arg-type]


@router.post("/{invention_id}/submit", response_model=InventionDetail)
async def submit_invention(
    invention_id: uuid.UUID,
    body: SubmitRequest,
    db: ScopedDB,
    principal: CurrentPrincipal,
    request: Request,
    _: object = Depends(require(Permission.INVENTION_SUBMIT)),
) -> InventionDetail:
    invention = await _load(db, invention_id)

    if invention.status not in {"draft", "returned"}:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "bad_state",
                "message": f"A disclosure in state '{invention.status}' cannot be submitted.",
            },
        )

    existing = (
        await db.execute(
            select(Submission).where(
                Submission.invention_id == invention.id,
                Submission.revision == invention.current_revision,
            )
        )
    ).scalar_one_or_none()

    if existing is None:
        db.add(
            Submission(
                tenant_id=principal.tenant_id,
                invention_id=invention.id,
                revision=invention.current_revision,
                state="open",
                submitted_by_id=principal.user_id,
                note=body.note,
            )
        )

    invention.status = "submitted"
    invention.updated_at = datetime.now(UTC)

    # Notifications are persisted before any realtime delivery is attempted.
    # The row is the record; delivery is only a hint that one exists.
    reviewer_ids = list(
        (
            await db.execute(
                select(Membership.user_id)
                .join(MembershipRole, MembershipRole.membership_id == Membership.id)
                .join(Role, Role.id == MembershipRole.role_id)
                .where(
                    Membership.tenant_id == principal.tenant_id,
                    Membership.is_active.is_(True),
                    Role.key == "counsel",
                )
            )
        ).scalars()
    )
    for reviewer_id in reviewer_ids:
        db.add(
            Notification(
                tenant_id=principal.tenant_id,
                user_id=reviewer_id,
                kind="approval_request",
                title=f"{invention.ref} submitted for review",
                body=f"{principal.user_name} submitted revision {invention.current_revision}.",
                target_type="invention",
                target_id=invention.id,
                action_url=f"/inventions/{invention.id}",
                priority="high",
                payload={"revision": invention.current_revision},
            )
        )

    audit.record(
        db,
        principal,
        "invention.submit",
        resource_type="invention",
        resource_id=invention.id,
        request_id=getattr(request.state, "request_id", ""),
        revision=invention.current_revision,
    )
    await db.flush()
    return await get_invention(invention.id, db)  # type: ignore[arg-type]
