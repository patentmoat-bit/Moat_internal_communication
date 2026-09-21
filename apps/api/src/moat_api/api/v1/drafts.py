from __future__ import annotations

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy import select

from moat_api.auth.deps import CurrentPrincipal, ScopedDB, require
from moat_api.auth.permissions import Permission
from moat_api.db.models import (
    ClaimSet,
    ClaimSetDecision,
    Decision,
    Document,
    DocumentVersion,
    Invention,
    InventionContributor,
    InventionVersion,
    Job,
    Notification,
    User,
)
from moat_api.schemas.drafting import (
    AssistResponse,
    AssistSuggestion,
    CheckRequest,
    CheckResult,
    ClaimOut,
    ClaimSetDecisionIn,
    ClaimSetDecisionOut,
    ClaimSetIn,
    ClaimSetOut,
    DraftCreate,
    DraftDetail,
    DraftQueueItem,
    DraftSummary,
    ExportRequest,
    FindingOut,
    SpecificationIn,
)
from moat_api.schemas.invention import PersonRef
from moat_api.schemas.jobs import JobAccepted, JobOut
from moat_api.services import audit, drafting, jobs, retrieval, storage
from moat_api.services import claims as claim_rules
from moat_api.services import drafting_assist as assist

router = APIRouter(prefix="/drafts", tags=["drafting"])


def _person(user: User | None) -> PersonRef | None:
    return PersonRef(id=user.id, name=user.name, email=user.email) if user else None


def _findings(findings: list[claim_rules.Finding]) -> list[FindingOut]:
    return [
        FindingOut(
            code=f.code,
            severity=str(f.severity),
            message=f.message,
            authority=f.authority,
            claim_number=f.claim_number,
            excerpt=f.excerpt,
        )
        for f in findings
    ]


async def _load(db: ScopedDB, document_id: uuid.UUID) -> Document:
    document = (
        await db.execute(select(Document).where(Document.id == document_id))
    ).scalar_one_or_none()
    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "not_found", "message": "No such draft."},
        )
    return document


async def _claim_set_out(db: ScopedDB, document: Document) -> ClaimSetOut | None:
    claim_set = await drafting.current_claim_set(db, document.id)
    if claim_set is None:
        return None

    rows, parents = await drafting.load_claims(db, claim_set.id)
    inputs, id_by_number = await drafting.as_inputs(db, claim_set.id)
    number_of = {row.id: row.number for row in rows}

    creator = (
        (
            await db.execute(select(User).where(User.id == claim_set.created_by_id))
        ).scalar_one_or_none()
        if claim_set.created_by_id
        else None
    )

    return ClaimSetOut(
        id=claim_set.id,
        revision=claim_set.revision,
        status=claim_set.status,
        change_note=claim_set.change_note,
        created_at=claim_set.created_at,
        frozen_at=claim_set.frozen_at,
        created_by=_person(creator),
        claims=[
            ClaimOut(
                id=row.id,
                number=row.number,
                kind=row.kind,
                category=row.category,
                preamble=row.preamble,
                transition=row.transition,
                body=row.body,
                depends_on=sorted(
                    number_of[p] for p in parents.get(row.id, []) if p in number_of
                ),
            )
            for row in rows
        ],
        tree=claim_rules.build_tree(inputs),
        findings=_findings(claim_rules.analyse(inputs)),
        coverage=claim_rules.coverage(inputs),
    )


async def _detail(db: ScopedDB, document: Document) -> DraftDetail:
    version = (
        await db.execute(
            select(DocumentVersion).where(
                DocumentVersion.document_id == document.id,
                DocumentVersion.revision == document.current_revision,
            )
        )
    ).scalar_one()
    invention = (
        await db.execute(select(Invention).where(Invention.id == document.invention_id))
    ).scalar_one()
    total, independent, errors = await drafting.summary_counts(db, document.id)
    claim_set = await drafting.current_claim_set(db, document.id)

    decision_row = (
        await db.execute(
            select(ClaimSetDecision, User)
            .join(User, User.id == ClaimSetDecision.reviewer_id)
            .where(ClaimSetDecision.document_id == document.id)
            .order_by(ClaimSetDecision.decided_at.desc())
            .limit(1)
        )
    ).first()
    claim_decision = None
    if decision_row is not None:
        decision, reviewer = decision_row
        claim_decision = ClaimSetDecisionOut(
            id=decision.id,
            reviewer=_person(reviewer),  # type: ignore[arg-type]
            claim_set_revision=decision.claim_set_revision,
            outcome=decision.outcome,
            rationale=decision.rationale,
            decided_at=decision.decided_at,
            # The drafter has amended past the revision that was reviewed, so
            # the decision no longer describes the current claims.
            superseded=claim_set is not None
            and claim_set.revision != decision.claim_set_revision,
        )

    return DraftDetail(
        id=document.id,
        ref=document.ref,
        title=document.title,
        status=document.status,
        revision=document.current_revision,
        jurisdiction=document.jurisdiction,
        invention_id=invention.id,
        invention_ref=invention.ref,
        drafter=_person(await drafting.drafter_of(db, document)),
        claim_count=total,
        independent_count=independent,
        open_errors=errors,
        updated_at=document.updated_at,
        abstract=version.abstract,
        technical_field=version.technical_field,
        background=version.background,
        summary=version.summary,
        brief_description_of_drawings=version.brief_description_of_drawings,
        detailed_description=version.detailed_description,
        change_note=version.change_note,
        claim_set=await _claim_set_out(db, document),
        claim_decision=claim_decision,
    )


@router.get("/queue", response_model=list[DraftQueueItem])
async def drafting_queue(
    db: ScopedDB,
    _: object = Depends(require(Permission.DOCUMENT_READ)),
) -> list[DraftQueueItem]:
    """Approved disclosures with no draft started.

    This is the drafter's inbox. A disclosure only appears once counsel has
    approved it -- drafting before that risks spending a week on something
    legal will not file.
    """
    started = select(Document.invention_id)
    rows = list(
        (
            await db.execute(
                select(Invention)
                .where(Invention.status == "approved", Invention.id.not_in(started))
                .order_by(Invention.updated_at.desc())
            )
        ).scalars()
    )

    items: list[DraftQueueItem] = []
    for invention in rows:
        decision_row = (
            await db.execute(
                select(Decision, User)
                .join(User, User.id == Decision.reviewer_id)
                .where(Decision.invention_id == invention.id, Decision.outcome == "approved")
                .order_by(Decision.decided_at.desc())
                .limit(1)
            )
        ).first()
        contributors = list(
            (
                await db.execute(
                    select(User)
                    .join(InventionContributor, InventionContributor.user_id == User.id)
                    .where(InventionContributor.invention_id == invention.id)
                    .order_by(User.name)
                )
            ).scalars()
        )
        items.append(
            DraftQueueItem(
                invention_id=invention.id,
                ref=invention.ref,
                title=invention.title,
                summary=invention.summary,
                approved_at=decision_row[0].decided_at if decision_row else None,
                reviewer=_person(decision_row[1]) if decision_row else None,
                contributors=[_person(user) for user in contributors],  # type: ignore[misc]
            )
        )
    return items


@router.get("", response_model=list[DraftSummary])
async def list_drafts(
    db: ScopedDB,
    _: object = Depends(require(Permission.DOCUMENT_READ)),
    status_filter: str | None = Query(default=None, alias="status"),
    limit: int = Query(default=50, ge=1, le=200),
) -> list[DraftSummary]:
    query = select(Document).order_by(Document.updated_at.desc(), Document.id.desc())
    if status_filter:
        query = query.where(Document.status == status_filter)
    documents = list((await db.execute(query.limit(limit))).scalars())

    summaries: list[DraftSummary] = []
    for document in documents:
        invention = (
            await db.execute(select(Invention).where(Invention.id == document.invention_id))
        ).scalar_one()
        total, independent, errors = await drafting.summary_counts(db, document.id)
        summaries.append(
            DraftSummary(
                id=document.id,
                ref=document.ref,
                title=document.title,
                status=document.status,
                revision=document.current_revision,
                jurisdiction=document.jurisdiction,
                invention_id=invention.id,
                invention_ref=invention.ref,
                drafter=_person(await drafting.drafter_of(db, document)),
                claim_count=total,
                independent_count=independent,
                open_errors=errors,
                updated_at=document.updated_at,
            )
        )
    return summaries


@router.post("", response_model=DraftDetail, status_code=status.HTTP_201_CREATED)
async def start_draft(
    body: DraftCreate,
    db: ScopedDB,
    principal: CurrentPrincipal,
    request: Request,
    _: object = Depends(require(Permission.DOCUMENT_CREATE)),
) -> DraftDetail:
    invention = (
        await db.execute(select(Invention).where(Invention.id == body.invention_id))
    ).scalar_one_or_none()
    if invention is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "not_found", "message": "No such disclosure."},
        )

    # Drafting before approval risks a week of work on something counsel will
    # not file.
    if invention.status != "approved":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "not_approved",
                "message": (
                    f"This disclosure is '{invention.status}'. Only an approved "
                    f"disclosure can go to drafting."
                ),
            },
        )

    existing = (
        await db.execute(select(Document).where(Document.invention_id == invention.id))
    ).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "already_drafting",
                "message": f"{existing.ref} is already being drafted from this disclosure.",
                "document_id": str(existing.id),
            },
        )

    source = (
        await db.execute(
            select(InventionVersion).where(
                InventionVersion.invention_id == invention.id,
                InventionVersion.revision == invention.current_revision,
            )
        )
    ).scalar_one()

    ref = await drafting.next_reference(db, principal.tenant_id, principal.tenant_slug)
    sections = await drafting.seed_from_invention(
        db, invention, {"problem": source.problem, "description": source.description}
    )

    document = Document(
        tenant_id=principal.tenant_id,
        invention_id=invention.id,
        ref=ref,
        title=sections["title"],
        status="drafting",
        current_revision=1,
        drafter_id=principal.user_id,
        jurisdiction=body.jurisdiction,
    )
    db.add(document)
    await db.flush()

    db.add(
        DocumentVersion(
            tenant_id=principal.tenant_id,
            document_id=document.id,
            revision=1,
            authored_by_id=principal.user_id,
            change_note=f"Seeded from {invention.ref} revision {invention.current_revision}",
            **sections,
        )
    )
    audit.record(
        db,
        principal,
        "document.create",
        resource_type="document",
        resource_id=document.id,
        request_id=getattr(request.state, "request_id", ""),
        ref=ref,
        invention=invention.ref,
    )
    await db.flush()
    return await _detail(db, document)


@router.get("/{document_id}", response_model=DraftDetail)
async def get_draft(
    document_id: uuid.UUID,
    db: ScopedDB,
    _: object = Depends(require(Permission.DOCUMENT_READ)),
) -> DraftDetail:
    return await _detail(db, await _load(db, document_id))


@router.put("/{document_id}", response_model=DraftDetail)
async def update_specification(
    document_id: uuid.UUID,
    body: SpecificationIn,
    db: ScopedDB,
    principal: CurrentPrincipal,
    request: Request,
    _: object = Depends(require(Permission.DOCUMENT_UPDATE)),
) -> DraftDetail:
    document = await _load(db, document_id)

    if document.status == "filed":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "immutable", "message": "A filed specification cannot be edited."},
        )

    if body.base_revision != document.current_revision:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "revision_conflict",
                "message": "Someone else saved a newer revision. Reload before editing.",
                "current_revision": document.current_revision,
            },
        )

    revision = document.current_revision + 1
    db.add(
        DocumentVersion(
            tenant_id=principal.tenant_id,
            document_id=document.id,
            revision=revision,
            title=body.title,
            abstract=body.abstract,
            technical_field=body.technical_field,
            background=body.background,
            summary=body.summary,
            brief_description_of_drawings=body.brief_description_of_drawings,
            detailed_description=body.detailed_description,
            authored_by_id=principal.user_id,
            change_note=body.change_note,
        )
    )
    document.title = body.title
    document.current_revision = revision
    document.updated_at = datetime.now(UTC)

    audit.record(
        db,
        principal,
        "document.update",
        resource_type="document",
        resource_id=document.id,
        request_id=getattr(request.state, "request_id", ""),
        revision=revision,
    )
    await db.flush()
    return await _detail(db, document)


@router.put("/{document_id}/claims", response_model=DraftDetail)
async def save_claims(
    document_id: uuid.UUID,
    body: ClaimSetIn,
    db: ScopedDB,
    principal: CurrentPrincipal,
    request: Request,
    _: object = Depends(require(Permission.DOCUMENT_UPDATE)),
) -> DraftDetail:
    """Replace the claim set.

    The whole set is submitted together because dependency, scope and
    antecedent basis are properties of the set, not of individual claims.
    """
    document = await _load(db, document_id)
    if document.status == "filed":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "immutable", "message": "A filed specification cannot be edited."},
        )

    try:
        claim_set = await drafting.save_claim_set(
            db,
            tenant_id=principal.tenant_id,
            document=document,
            claims=body.claims,
            author_id=principal.user_id,
            change_note=body.change_note,
        )
    except drafting.DraftingError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": error.code, "message": str(error), "findings": error.detail},
        ) from error

    document.updated_at = datetime.now(UTC)
    audit.record(
        db,
        principal,
        "claims.save",
        resource_type="document",
        resource_id=document.id,
        request_id=getattr(request.state, "request_id", ""),
        claim_set_revision=claim_set.revision,
        claims=len(body.claims),
    )
    await db.flush()
    return await _detail(db, document)


@router.post("/{document_id}/claims/submit", response_model=DraftDetail)
async def submit_claim_set(
    document_id: uuid.UUID,
    db: ScopedDB,
    principal: CurrentPrincipal,
    request: Request,
    _: object = Depends(require(Permission.DOCUMENT_UPDATE)),
) -> DraftDetail:
    """Freeze the current claim set and send it for counsel review.

    Freezing is what makes a later approval meaningful: the approved set is an
    immutable snapshot, and any change starts a new revision rather than
    silently altering approved text (design doc §6).
    """
    document = await _load(db, document_id)
    claim_set = await drafting.current_claim_set(db, document.id)
    if claim_set is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "no_claims", "message": "There are no claims to submit."},
        )
    if claim_set.frozen_at is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "already_submitted",
                "message": f"Claim set revision {claim_set.revision} was already submitted.",
            },
        )

    inputs, _ids = await drafting.as_inputs(db, claim_set.id)
    errors = [
        f for f in claim_rules.analyse(inputs) if f.severity == claim_rules.Severity.ERROR
    ]
    if errors:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "unresolved_errors",
                "message": (
                    f"{len(errors)} structural error(s) must be resolved before "
                    f"this claim set can be submitted."
                ),
                "findings": [
                    {"code": f.code, "message": f.message, "claimNumber": f.claim_number}
                    for f in errors
                ],
            },
        )

    claim_set.status = "submitted"
    claim_set.frozen_at = datetime.now(UTC)
    document.status = "in_review"
    document.updated_at = datetime.now(UTC)

    audit.record(
        db,
        principal,
        "claims.submit",
        resource_type="document",
        resource_id=document.id,
        request_id=getattr(request.state, "request_id", ""),
        claim_set_revision=claim_set.revision,
    )
    await db.flush()
    return await _detail(db, document)


@router.post("/check", response_model=CheckResult)
async def check_claims(
    body: CheckRequest,
    _: object = Depends(require(Permission.DOCUMENT_READ)),
) -> CheckResult:
    """Run the checks against unsaved claims.

    Stateless and touches no tenant data, so a drafter gets feedback while
    typing without every keystroke writing to the database.
    """
    inputs = drafting.to_inputs(body.claims)
    return CheckResult(
        findings=_findings(claim_rules.analyse(inputs)),
        tree=claim_rules.build_tree(inputs),
        coverage=claim_rules.coverage(inputs),
        checker_version=claim_rules.CHECKER_VERSION,
    )


@router.post(
    "/{document_id}/claim-decisions",
    response_model=DraftDetail,
    status_code=status.HTTP_201_CREATED,
)
async def decide_claim_set(
    document_id: uuid.UUID,
    body: ClaimSetDecisionIn,
    db: ScopedDB,
    principal: CurrentPrincipal,
    request: Request,
    _: object = Depends(require(Permission.DECISION_CREATE)),
) -> DraftDetail:
    """Counsel's decision on a submitted claim set.

    This is what closes the loop: without it a submitted draft sits in review
    forever. The decision names the claim set revision that was read, so a
    drafter amending during review cannot inherit an approval for claims
    nobody saw.
    """
    document = await _load(db, document_id)
    # Lock the set for the transaction so two reviewers cannot decide the same
    # revision at once.
    claim_set = (
        await db.execute(
            select(ClaimSet)
            .where(ClaimSet.document_id == document.id)
            .order_by(ClaimSet.revision.desc())
            .limit(1)
            .with_for_update()
        )
    ).scalar_one_or_none()

    if claim_set is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "no_claims", "message": "There is no claim set to decide on."},
        )
    if claim_set.frozen_at is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "not_submitted",
                "message": (
                    f"Claim set revision {claim_set.revision} has not been submitted for "
                    f"review."
                ),
            },
        )
    if body.claim_set_revision != claim_set.revision:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "revision_moved",
                "message": (
                    "The claim set changed while you were reviewing. Reload and assess "
                    "the current revision."
                ),
                "current_revision": claim_set.revision,
                "reviewed_revision": body.claim_set_revision,
            },
        )

    existing = (
        await db.execute(
            select(ClaimSetDecision).where(ClaimSetDecision.claim_set_id == claim_set.id)
        )
    ).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "already_decided",
                "message": (
                    f"Claim set revision {claim_set.revision} was already decided. "
                    f"A second opinion means a new revision, not a second verdict."
                ),
            },
        )

    db.add(
        ClaimSetDecision(
            tenant_id=principal.tenant_id,
            claim_set_id=claim_set.id,
            document_id=document.id,
            claim_set_revision=claim_set.revision,
            reviewer_id=principal.user_id,
            outcome=body.outcome,
            rationale=body.rationale,
            decided_at=datetime.now(UTC),
        )
    )

    if body.outcome == "approved":
        claim_set.status = "approved"
        document.status = "approved"
    else:
        # Returned: the set stays frozen (it is the reviewed artefact) and the
        # document goes back to drafting. Amending starts a new revision.
        document.status = "drafting"
    document.updated_at = datetime.now(UTC)

    if document.drafter_id:
        db.add(
            Notification(
                tenant_id=principal.tenant_id,
                user_id=document.drafter_id,
                kind="claims_decision",
                title=f"{document.ref} claim set {body.outcome}",
                body=f"{principal.user_name} decided on claim set revision {claim_set.revision}.",
                target_type="document",
                target_id=document.id,
                action_url=f"/drafts/{document.id}",
                priority="high",
                payload={"outcome": body.outcome, "claimSetRevision": claim_set.revision},
            )
        )

    audit.record(
        db,
        principal,
        "claims.decide",
        resource_type="document",
        resource_id=document.id,
        request_id=getattr(request.state, "request_id", ""),
        outcome=body.outcome,
        claim_set_revision=claim_set.revision,
    )
    await db.flush()
    return await _detail(db, document)


@router.post(
    "/{document_id}/exports",
    response_model=JobAccepted,
    status_code=status.HTTP_202_ACCEPTED,
)
async def export_draft(
    document_id: uuid.UUID,
    body: ExportRequest,
    db: ScopedDB,
    principal: CurrentPrincipal,
    request: Request,
    response: Response,
    _: object = Depends(require(Permission.DOCUMENT_EXPORT)),
) -> JobAccepted:
    """Queue an export.

    A job rather than a synchronous download: PDF conversion runs a full office
    suite in a separate service, and a 30-second render must not hold an API
    request open (design doc §9).
    """
    document = await _load(db, document_id)
    claim_set = await drafting.current_claim_set(db, document.id)

    try:
        job, created = await jobs.submit(
            db,
            principal,
            kind="export",
            # Keyed on the exact revisions, so asking twice for the same
            # document returns the same file rather than rendering it twice.
            idempotency_key=(
                f"export:{document.id}:{document.current_revision}:"
                f"{claim_set.revision if claim_set else 0}:{body.format}"
            ),
            subject_type="document",
            subject_id=document.id,
            payload={
                "document_id": str(document.id),
                "format": body.format,
                "requested_by": str(principal.user_id),
            },
            detail=f"Exporting {document.ref} as {body.format.upper()}",
        )
    except jobs.AdmissionRefused as refused:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={"code": "capacity_exhausted", "message": str(refused)},
            headers={"Retry-After": str(refused.retry_after)},
        ) from refused

    if created:
        audit.record(
            db,
            principal,
            "document.export",
            resource_type="document",
            resource_id=document.id,
            request_id=getattr(request.state, "request_id", ""),
            format=body.format,
        )
    await db.flush()

    response.headers["Location"] = f"/api/v1/jobs/{job.id}"
    return JobAccepted(
        job=JobOut.model_validate(job), status_url=f"/api/v1/jobs/{job.id}", created=created
    )


@router.get("/{document_id}/exports/{job_id}/download")
async def download_export(
    document_id: uuid.UUID,
    job_id: uuid.UUID,
    db: ScopedDB,
    _: object = Depends(require(Permission.DOCUMENT_EXPORT)),
) -> Response:
    """Stream a finished export.

    The job row is read under the tenant policy first, so a job id from another
    tenant is indistinguishable from one that does not exist.
    """
    job = (
        await db.execute(
            select(Job).where(
                Job.id == job_id, Job.subject_id == document_id, Job.kind == "export"
            )
        )
    ).scalar_one_or_none()
    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "not_found", "message": "No such export."},
        )
    if job.status != "succeeded":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "not_ready",
                "message": f"This export is {job.status}.",
                "job_status": job.status,
            },
        )

    key = str(job.result.get("object_key", ""))
    if not key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "no_artifact", "message": "The export produced no file."},
        )

    data = await storage.get_bytes(key)
    filename = str(job.result.get("filename", "specification"))
    content_type = str(job.result.get("content_type", "application/octet-stream"))
    return Response(
        content=data,
        media_type=content_type,
        headers={"content-disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{document_id}/assist", response_model=AssistResponse)
async def assist_draft(
    document_id: uuid.UUID,
    db: ScopedDB,
    _: object = Depends(require(Permission.DOCUMENT_READ)),
) -> AssistResponse:
    """Drafting suggestions for this document.

    Template-based: every suggestion restructures text the drafter already
    wrote. Nothing here invents technical content, and the response says so
    explicitly rather than leaving the drafter to assume.
    """
    document = await _load(db, document_id)
    version = (
        await db.execute(
            select(DocumentVersion).where(
                DocumentVersion.document_id == document.id,
                DocumentVersion.revision == document.current_revision,
            )
        )
    ).scalar_one()

    claim_set = await drafting.current_claim_set(db, document.id)
    claim_inputs = []
    if claim_set is not None:
        claim_inputs, _ids = await drafting.as_inputs(db, claim_set.id)

    suggestions = []
    for suggestion in (
        assist.abstract_from_claims(claim_inputs) if claim_inputs else None,
        assist.summary_from_claims(claim_inputs) if claim_inputs else None,
        assist.drawings_scaffold(version.detailed_description),
    ):
        if suggestion is not None:
            suggestions.append(suggestion)

    # With no claims yet, the useful help is a starting skeleton built from the
    # disclosure's own concepts.
    if not claim_inputs:
        invention_version = (
            await db.execute(
                select(InventionVersion)
                .where(InventionVersion.invention_id == document.invention_id)
                .order_by(InventionVersion.revision.desc())
                .limit(1)
            )
        ).scalar_one_or_none()
        if invention_version is not None:
            concepts = retrieval.extract_concepts(
                invention_version.title,
                invention_version.summary,
                invention_version.description,
            )
            skeleton = assist.claim_skeleton(document.title, [c.label for c in concepts])
            if skeleton is not None:
                suggestions.append(skeleton)

    state = assist.available()
    return AssistResponse(
        version=state["version"],
        template_generation=state["templateGeneration"],
        model_generation=state["modelGeneration"],
        model_note=state["modelNote"],
        suggestions=[
            AssistSuggestion(
                field=s.field,
                value=s.value,
                rationale=s.rationale,
                replaces_existing=s.replaces_existing,
            )
            for s in suggestions
        ],
    )
