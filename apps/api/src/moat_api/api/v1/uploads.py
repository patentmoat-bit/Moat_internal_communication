from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, Response, UploadFile, status
from sqlalchemy import select

from moat_api.auth.deps import CurrentPrincipal, ScopedDB, require
from moat_api.auth.permissions import Permission
from moat_api.core import telemetry
from moat_api.core.config import get_settings
from moat_api.db.models import Invention, SourceObject, UploadSession
from moat_api.schemas.jobs import (
    JobAccepted,
    JobOut,
    SourceObjectOut,
    UploadComplete,
    UploadRequest,
    UploadReserved,
)
from moat_api.services import audit, jobs, storage

router = APIRouter(tags=["uploads"])
settings = get_settings()

# Read in chunks so a client that lies about its size is cut off at the limit
# rather than after the whole body has been buffered.
CHUNK = 1024 * 1024


@router.post("/uploads", response_model=UploadReserved, status_code=status.HTTP_201_CREATED)
async def reserve_upload(
    body: UploadRequest,
    db: ScopedDB,
    principal: CurrentPrincipal,
    request: Request,
    _: object = Depends(require(Permission.INVENTION_UPDATE)),
) -> UploadReserved:
    """Reserve a bounded upload slot.

    Validates the declaration and allocates a server-generated key under this
    tenant's quarantine prefix. The client never chooses where bytes land.
    """
    try:
        storage.validate_declaration(body.filename, body.content_type, body.size)
    except storage.StorageError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "upload_rejected", "message": str(error)},
        ) from error

    if body.invention_id is not None:
        # Existence is checked under the row policy, so another tenant's id
        # reads as "no such disclosure".
        exists = (
            await db.execute(select(Invention.id).where(Invention.id == body.invention_id))
        ).scalar_one_or_none()
        if exists is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"code": "not_found", "message": "No such disclosure."},
            )

    session_id = uuid.uuid4()
    key = storage.quarantine_key(principal.tenant_id, session_id, body.filename)
    expires_at = datetime.now(UTC) + timedelta(seconds=settings.upload_url_ttl_seconds)

    upload = UploadSession(
        id=session_id,
        tenant_id=principal.tenant_id,
        filename=body.filename,
        content_type=body.content_type,
        declared_size=body.size,
        object_key=key,
        state="reserved",
        created_by_id=principal.user_id,
        invention_id=body.invention_id,
        expires_at=expires_at,
    )
    db.add(upload)
    audit.record(
        db,
        principal,
        "upload.reserved",
        resource_type="upload",
        resource_id=session_id,
        request_id=getattr(request.state, "request_id", ""),
        filename=body.filename,
        size=body.size,
    )
    await db.flush()

    # Presigned direct-to-storage is the production path: it keeps large files
    # out of the API's memory and off its request budget entirely. It needs an
    # object endpoint the browser can reach and sign against, so when none is
    # configured the API streams the bytes instead -- correct, just not as
    # cheap.
    if settings.s3_public_endpoint:
        upload_url = await storage.presigned_put(key, body.content_type)
        method = "PUT"
    else:
        upload_url = f"/api/v1/uploads/{session_id}/content"
        method = "POST"

    return UploadReserved(
        upload_id=session_id,
        upload_url=upload_url,
        method=method,
        expires_at=expires_at,
        max_bytes=settings.upload_max_bytes,
    )


@router.post("/uploads/{upload_id}/content", status_code=status.HTTP_204_NO_CONTENT)
async def stream_upload(
    upload_id: uuid.UUID,
    file: UploadFile,
    db: ScopedDB,
    principal: CurrentPrincipal,
    response: Response,
    _: object = Depends(require(Permission.INVENTION_UPDATE)),
) -> Response:
    """Fallback path: accept bytes through the API into quarantine."""
    upload = (
        await db.execute(select(UploadSession).where(UploadSession.id == upload_id))
    ).scalar_one_or_none()
    if upload is None or upload.state != "reserved":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "not_found", "message": "No open upload with that id."},
        )
    if upload.expires_at <= datetime.now(UTC):
        upload.state = "expired"
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail={"code": "upload_expired", "message": "This upload slot has expired."},
        )

    buffer = bytearray()
    while chunk := await file.read(CHUNK):
        buffer.extend(chunk)
        if len(buffer) > settings.upload_max_bytes:
            # Cut off mid-stream rather than after buffering the whole body.
            upload.state = "rejected"
            upload.rejection_reason = "Exceeded the size limit."
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail={"code": "too_large", "message": "File exceeds the size limit."},
            )

    await storage.put_bytes(upload.object_key, bytes(buffer), upload.content_type)
    upload.state = "uploaded"
    upload.actual_size = len(buffer)
    upload.sha256 = storage.sha256_of(bytes(buffer))

    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@router.post(
    "/uploads/{upload_id}/complete",
    response_model=JobAccepted,
    status_code=status.HTTP_202_ACCEPTED,
)
async def complete_upload(
    upload_id: uuid.UUID,
    body: UploadComplete,
    db: ScopedDB,
    principal: CurrentPrincipal,
    request: Request,
    response: Response,
    _: object = Depends(require(Permission.INVENTION_UPDATE)),
) -> JobAccepted:
    """Verify what actually landed, then accept it for processing.

    A completed upload means accepted processing, not a usable document. The
    file stays quarantined until extraction has run; the UI shows scanning,
    extracting, ready or rejected separately (design doc §8).
    """
    upload = (
        await db.execute(select(UploadSession).where(UploadSession.id == upload_id))
    ).scalar_one_or_none()
    if upload is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "not_found", "message": "No such upload."},
        )
    if upload.state == "verified":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "already_complete", "message": "This upload was already completed."},
        )

    info = await storage.head(upload.object_key)
    if info is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "no_object", "message": "No bytes were received for this upload."},
        )
    if info.size > settings.upload_max_bytes:
        await storage.delete(upload.object_key)
        upload.state = "rejected"
        upload.rejection_reason = "Exceeded the size limit."
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail={"code": "too_large", "message": "File exceeds the size limit."},
        )

    digest = upload.sha256 or storage.sha256_of(await storage.get_bytes(upload.object_key))
    if body.sha256 and body.sha256.lower() != digest:
        await storage.delete(upload.object_key)
        upload.state = "rejected"
        upload.rejection_reason = "Checksum mismatch."
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "checksum_mismatch",
                "message": "The uploaded bytes do not match the checksum you sent.",
            },
        )

    upload.state = "verified"
    upload.actual_size = info.size
    upload.sha256 = digest

    # The same file uploaded twice is stored once per tenant.
    existing = (
        await db.execute(select(SourceObject).where(SourceObject.sha256 == digest))
    ).scalar_one_or_none()
    if existing is not None:
        await storage.delete(upload.object_key)
        source = existing
    else:
        source = SourceObject(
            tenant_id=principal.tenant_id,
            invention_id=upload.invention_id,
            upload_session_id=upload.id,
            filename=upload.filename,
            content_type=upload.content_type,
            object_key=upload.object_key,
            size_bytes=info.size,
            sha256=digest,
            state="quarantined",
            uploaded_by_id=principal.user_id,
        )
        db.add(source)
        await db.flush()

    try:
        job, created = await jobs.submit(
            db,
            principal,
            kind="extraction",
            idempotency_key=f"extraction:{source.id}",
            subject_type="source_object",
            subject_id=source.id,
            payload={
                "source_object_id": str(source.id),
                "requested_by": str(principal.user_id),
            },
            detail=f"Extracting {upload.filename}",
        )
    except jobs.AdmissionRefused as refused:
        telemetry.admission_rejections.labels("extraction", "tenant_cap").inc()
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

    audit.record(
        db,
        principal,
        "upload.completed",
        resource_type="source_object",
        resource_id=source.id,
        request_id=getattr(request.state, "request_id", ""),
        filename=upload.filename,
        size=info.size,
        sha256=digest,
    )
    await db.flush()

    response.headers["Location"] = f"/api/v1/jobs/{job.id}"
    return JobAccepted(
        job=JobOut.model_validate(job), status_url=f"/api/v1/jobs/{job.id}", created=created
    )


@router.get(
    "/inventions/{invention_id}/documents", response_model=list[SourceObjectOut]
)
async def list_documents(
    invention_id: uuid.UUID,
    db: ScopedDB,
    _: object = Depends(require(Permission.INVENTION_READ)),
) -> list[SourceObject]:
    return list(
        (
            await db.execute(
                select(SourceObject)
                .where(SourceObject.invention_id == invention_id)
                .order_by(SourceObject.created_at.desc())
            )
        ).scalars()
    )
