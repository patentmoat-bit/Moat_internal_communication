from __future__ import annotations

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, UploadFile, status
from sqlalchemy import select

from moat_api.auth.deps import CurrentPrincipal, ScopedDB, require
from moat_api.auth.permissions import Permission
from moat_api.db.models import (
    Document,
    Drawing,
    DrawingReview,
    DrawingVersion,
    Notification,
    SourceObject,
    User,
)
from moat_api.schemas.design import (
    DrawingAssign,
    DrawingOut,
    DrawingRequest,
    DrawingReviewIn,
    DrawingReviewOut,
    DrawingsSummary,
    DrawingVersionOut,
)
from moat_api.schemas.invention import PersonRef
from moat_api.services import audit, design, storage

router = APIRouter(tags=["drawings"])

CHUNK = 512 * 1024


def _person(user: User | None) -> PersonRef | None:
    return PersonRef(id=user.id, name=user.name, email=user.email) if user else None


async def _user(db: ScopedDB, user_id: uuid.UUID | None) -> User | None:
    if user_id is None:
        return None
    return (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()


async def _out(db: ScopedDB, drawing: Drawing) -> DrawingOut:
    document = (
        await db.execute(select(Document).where(Document.id == drawing.document_id))
    ).scalar_one()

    versions = []
    for version, source in await design.versions_of(db, drawing.id):
        uploader = await _user(db, version.uploaded_by_id)
        versions.append(
            DrawingVersionOut(
                id=version.id,
                version=version.version,
                notes=version.notes,
                uploaded_by=_person(uploader),
                created_at=version.created_at,
                has_file=source is not None,
                content_type=source.content_type if source else "",
                size_bytes=source.size_bytes if source else 0,
            )
        )

    reviews = []
    for review in await design.reviews_of(db, drawing.id):
        reviewer = await _user(db, review.reviewer_id)
        reviews.append(
            DrawingReviewOut(
                id=review.id,
                version=review.version,
                reviewer=_person(reviewer),  # type: ignore[arg-type]
                outcome=review.outcome,
                notes=review.notes,
                created_at=review.created_at,
            )
        )

    return DrawingOut(
        id=drawing.id,
        document_id=drawing.document_id,
        document_ref=document.ref,
        figure_number=drawing.figure_number,
        caption=drawing.caption,
        brief=drawing.brief,
        status=drawing.status,
        current_version=drawing.current_version,
        requested_by=_person(await _user(db, drawing.requested_by_id)),
        assigned_to=_person(await _user(db, drawing.assigned_to_id)),
        due_at=drawing.due_at,
        created_at=drawing.created_at,
        updated_at=drawing.updated_at,
        versions=versions,
        reviews=reviews,
    )


async def _load(db: ScopedDB, drawing_id: uuid.UUID) -> Drawing:
    drawing = (
        await db.execute(select(Drawing).where(Drawing.id == drawing_id))
    ).scalar_one_or_none()
    if drawing is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "not_found", "message": "No such figure."},
        )
    return drawing


@router.get("/drawings/queue", response_model=list[DrawingOut])
async def drawing_queue(
    db: ScopedDB,
    principal: CurrentPrincipal,
    _: object = Depends(require(Permission.DRAWING_READ)),
    mine: bool = Query(default=False),
) -> list[DrawingOut]:
    """The design team's inbox.

    Everything not yet approved, newest first. Unassigned work is visible to
    the whole team so a figure cannot sit waiting because one person is away.
    """
    query = (
        select(Drawing)
        .where(Drawing.status.in_(("requested", "in_progress", "rework")))
        .order_by(Drawing.due_at.asc().nulls_last(), Drawing.updated_at.desc())
    )
    if mine:
        query = query.where(Drawing.assigned_to_id == principal.user_id)
    rows = list((await db.execute(query)).scalars())
    return [await _out(db, drawing) for drawing in rows]


@router.get("/drafts/{document_id}/drawings", response_model=list[DrawingOut])
async def list_drawings(
    document_id: uuid.UUID,
    db: ScopedDB,
    _: object = Depends(require(Permission.DRAWING_READ)),
) -> list[DrawingOut]:
    rows = list(
        (
            await db.execute(
                select(Drawing)
                .where(Drawing.document_id == document_id)
                .order_by(Drawing.figure_number)
            )
        ).scalars()
    )
    return [await _out(db, drawing) for drawing in rows]


@router.get("/drafts/{document_id}/drawings/summary", response_model=DrawingsSummary)
async def drawings_summary(
    document_id: uuid.UUID,
    db: ScopedDB,
    _: object = Depends(require(Permission.DRAWING_READ)),
) -> DrawingsSummary:
    """The drawings section, composed from the figures that exist.

    Keeps the specification's wording in step with the actual figures as they
    are added and reworked.
    """
    rows = list(
        (
            await db.execute(select(Drawing).where(Drawing.document_id == document_id))
        ).scalars()
    )
    text, approved, outstanding = design.brief_description(rows)
    return DrawingsSummary(text=text, approved=approved, outstanding=outstanding)


@router.post(
    "/drafts/{document_id}/drawings", response_model=DrawingOut, status_code=status.HTTP_201_CREATED
)
async def request_drawing(
    document_id: uuid.UUID,
    body: DrawingRequest,
    db: ScopedDB,
    principal: CurrentPrincipal,
    request: Request,
    _: object = Depends(require(Permission.DRAWING_REQUEST)),
) -> DrawingOut:
    """Ask the design team for a figure."""
    document = (
        await db.execute(select(Document).where(Document.id == document_id))
    ).scalar_one_or_none()
    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "not_found", "message": "No such draft."},
        )

    clash = (
        await db.execute(
            select(Drawing).where(
                Drawing.document_id == document_id,
                Drawing.figure_number == body.figure_number,
            )
        )
    ).scalar_one_or_none()
    if clash is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "figure_exists",
                "message": f"FIG. {body.figure_number} already exists on this draft.",
            },
        )

    drawing = Drawing(
        tenant_id=principal.tenant_id,
        document_id=document_id,
        figure_number=body.figure_number,
        caption=body.caption,
        brief=body.brief,
        status="requested",
        requested_by_id=principal.user_id,
        due_at=body.due_at,
    )
    db.add(drawing)
    await db.flush()

    # Notify the design team. Unassigned on purpose -- whoever is free takes it.
    from moat_api.db.models import Membership, MembershipRole, Role

    designers = list(
        (
            await db.execute(
                select(Membership.user_id)
                .join(MembershipRole, MembershipRole.membership_id == Membership.id)
                .join(Role, Role.id == MembershipRole.role_id)
                .where(
                    Membership.tenant_id == principal.tenant_id,
                    Membership.is_active.is_(True),
                    Role.key == "design",
                )
            )
        ).scalars()
    )
    for user_id in designers:
        db.add(
            Notification(
                tenant_id=principal.tenant_id,
                user_id=user_id,
                kind="drawing_requested",
                title=f"FIG. {body.figure_number} requested for {document.ref}",
                body=body.brief[:280],
                target_type="drawing",
                target_id=drawing.id,
                action_url="/design",
                priority="medium",
                payload={"figure": body.figure_number},
            )
        )

    audit.record(
        db,
        principal,
        "drawing.request",
        resource_type="drawing",
        resource_id=drawing.id,
        request_id=getattr(request.state, "request_id", ""),
        figure=body.figure_number,
        document=document.ref,
    )
    await db.flush()
    return await _out(db, drawing)


@router.post("/drawings/{drawing_id}/assign", response_model=DrawingOut)
async def assign_drawing(
    drawing_id: uuid.UUID,
    body: DrawingAssign,
    db: ScopedDB,
    principal: CurrentPrincipal,
    _: object = Depends(require(Permission.DRAWING_UPLOAD)),
) -> DrawingOut:
    """Take a figure, or hand it to a colleague."""
    drawing = await _load(db, drawing_id)
    assignee = body.assignee_id or principal.user_id
    try:
        drawing.status = design.next_status(drawing.status, "assign")
    except design.DesignError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": error.code, "message": str(error)},
        ) from error
    drawing.assigned_to_id = assignee
    drawing.updated_at = datetime.now(UTC)
    await db.flush()
    return await _out(db, drawing)


@router.post(
    "/drawings/{drawing_id}/versions",
    response_model=DrawingOut,
    status_code=status.HTTP_201_CREATED,
)
async def upload_drawing(
    drawing_id: uuid.UUID,
    db: ScopedDB,
    principal: CurrentPrincipal,
    request: Request,
    file: UploadFile,
    notes: str = Query(default="", max_length=4000),
    _: object = Depends(require(Permission.DRAWING_UPLOAD)),
) -> DrawingOut:
    """Upload a rendition of a figure.

    Synchronous rather than a job: a figure is an image with nothing to
    extract, so queueing it would add latency for no benefit. The same
    validation applies -- declared type, size, and magic bytes on what
    actually arrived.
    """
    drawing = await _load(db, drawing_id)

    content_type = file.content_type or "application/octet-stream"
    buffer = bytearray()
    while chunk := await file.read(CHUNK):
        buffer.extend(chunk)
        if len(buffer) > design.MAX_DRAWING_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail={
                    "code": "too_large",
                    "message": f"A figure is limited to "
                    f"{design.MAX_DRAWING_BYTES // (1024 * 1024)} MB.",
                },
            )

    data = bytes(buffer)
    try:
        design.validate_drawing_upload(content_type, len(data), file.filename or "")
        # What arrived must match what was declared.
        storage.verify_magic(content_type, data[:16])
    except (design.DesignError, storage.StorageError) as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": getattr(error, "code", "rejected"), "message": str(error)},
        ) from error

    digest = storage.sha256_of(data)
    version_number = drawing.current_version + 1
    key = f"drawings/{principal.tenant_id}/{drawing.id}/v{version_number}"
    await storage.put_bytes(key, data, content_type)

    source = SourceObject(
        tenant_id=principal.tenant_id,
        filename=file.filename or f"fig-{drawing.figure_number}",
        content_type=content_type,
        object_key=key,
        size_bytes=len(data),
        sha256=digest,
        # Images carry no text to extract, so they are ready once validated.
        state="ready",
        uploaded_by_id=principal.user_id,
    )
    db.add(source)
    await db.flush()

    db.add(
        DrawingVersion(
            tenant_id=principal.tenant_id,
            drawing_id=drawing.id,
            version=version_number,
            source_object_id=source.id,
            notes=notes,
            uploaded_by_id=principal.user_id,
        )
    )

    try:
        drawing.status = design.next_status(drawing.status, "upload")
    except design.DesignError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": error.code, "message": str(error)},
        ) from error
    drawing.current_version = version_number
    drawing.assigned_to_id = drawing.assigned_to_id or principal.user_id
    drawing.updated_at = datetime.now(UTC)

    if drawing.requested_by_id:
        db.add(
            Notification(
                tenant_id=principal.tenant_id,
                user_id=drawing.requested_by_id,
                kind="drawing_submitted",
                title=f"FIG. {drawing.figure_number} is ready to review",
                body=f"{principal.user_name} uploaded version {version_number}.",
                target_type="drawing",
                target_id=drawing.id,
                action_url=f"/drafts/{drawing.document_id}",
                priority="medium",
                payload={"version": version_number},
            )
        )

    audit.record(
        db,
        principal,
        "drawing.upload",
        resource_type="drawing",
        resource_id=drawing.id,
        request_id=getattr(request.state, "request_id", ""),
        version=version_number,
        bytes=len(data),
    )
    await db.flush()
    return await _out(db, drawing)


@router.post(
    "/drawings/{drawing_id}/reviews", response_model=DrawingOut, status_code=status.HTTP_201_CREATED
)
async def review_drawing(
    drawing_id: uuid.UUID,
    body: DrawingReviewIn,
    db: ScopedDB,
    principal: CurrentPrincipal,
    request: Request,
    _: object = Depends(require(Permission.DRAWING_REVIEW)),
) -> DrawingOut:
    """Accept a figure, or send it back with notes."""
    drawing = await _load(db, drawing_id)

    if body.version != drawing.current_version:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "version_moved",
                "message": (
                    "A newer version was uploaded while you were reviewing. "
                    "Reload and look at the current one."
                ),
                "current_version": drawing.current_version,
            },
        )

    version = (
        await db.execute(
            select(DrawingVersion).where(
                DrawingVersion.drawing_id == drawing.id,
                DrawingVersion.version == body.version,
            )
        )
    ).scalar_one_or_none()
    if version is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "no_version", "message": "That version does not exist."},
        )

    existing = (
        await db.execute(
            select(DrawingReview).where(DrawingReview.drawing_version_id == version.id)
        )
    ).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "already_reviewed",
                "message": f"Version {body.version} was already reviewed.",
            },
        )

    db.add(
        DrawingReview(
            tenant_id=principal.tenant_id,
            drawing_id=drawing.id,
            drawing_version_id=version.id,
            version=body.version,
            reviewer_id=principal.user_id,
            outcome=body.outcome,
            notes=body.notes,
        )
    )

    try:
        drawing.status = design.next_status(
            drawing.status, "approve" if body.outcome == "approved" else "rework"
        )
    except design.DesignError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": error.code, "message": str(error)},
        ) from error
    drawing.updated_at = datetime.now(UTC)

    if drawing.assigned_to_id:
        db.add(
            Notification(
                tenant_id=principal.tenant_id,
                user_id=drawing.assigned_to_id,
                kind="drawing_reviewed",
                title=f"FIG. {drawing.figure_number} {body.outcome}",
                body=body.notes[:280] or f"{principal.user_name} reviewed version {body.version}.",
                target_type="drawing",
                target_id=drawing.id,
                action_url="/design",
                priority="high" if body.outcome == "rework" else "medium",
                payload={"outcome": body.outcome, "version": body.version},
            )
        )

    audit.record(
        db,
        principal,
        "drawing.review",
        resource_type="drawing",
        resource_id=drawing.id,
        request_id=getattr(request.state, "request_id", ""),
        outcome=body.outcome,
        version=body.version,
    )
    await db.flush()
    return await _out(db, drawing)


@router.get("/drawings/{drawing_id}/versions/{version}/file")
async def drawing_file(
    drawing_id: uuid.UUID,
    version: int,
    db: ScopedDB,
    _: object = Depends(require(Permission.DRAWING_READ)),
) -> Response:
    """Serve a figure image.

    Read under the tenant policy, so a figure id from another tenant is
    indistinguishable from one that does not exist.
    """
    drawing = await _load(db, drawing_id)
    row = (
        await db.execute(
            select(DrawingVersion).where(
                DrawingVersion.drawing_id == drawing.id, DrawingVersion.version == version
            )
        )
    ).scalar_one_or_none()
    if row is None or row.source_object_id is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "not_found", "message": "No file for that version."},
        )
    source = (
        await db.execute(select(SourceObject).where(SourceObject.id == row.source_object_id))
    ).scalar_one()

    data = await storage.get_bytes(source.object_key, max_bytes=design.MAX_DRAWING_BYTES)
    return Response(
        content=data,
        media_type=source.content_type,
        headers={
            # Figures are confidential: never cached by a shared proxy.
            "cache-control": "private, max-age=60",
            "content-disposition": f'inline; filename="fig-{drawing.figure_number}"',
        },
    )
