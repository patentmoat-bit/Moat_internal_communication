from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import Field

from moat_api.schemas.base import Schema


class JobOut(Schema):
    id: uuid.UUID
    kind: str
    status: str
    progress: int
    detail: str
    subject_type: str
    subject_id: uuid.UUID | None
    failure_category: str | None
    attempt_count: int
    created_at: datetime
    started_at: datetime | None
    finished_at: datetime | None
    result: dict

    @property
    def terminal(self) -> bool:
        return self.status in {"succeeded", "failed", "cancelled"}


class JobAccepted(Schema):
    """Returned by 202. Once this exists the work is durable: it will reach
    succeeded, failed or cancelled, and stays queryable until it does."""

    job: JobOut
    status_url: str
    # False when an identical request was already accepted; the same job is
    # returned rather than a second one being started.
    created: bool


class UploadRequest(Schema):
    filename: str = Field(min_length=1, max_length=300)
    content_type: str = Field(min_length=3, max_length=120)
    size: int = Field(gt=0)
    invention_id: uuid.UUID | None = None


class UploadReserved(Schema):
    upload_id: uuid.UUID
    # Where to PUT the bytes. A presigned S3 URL when a public object endpoint
    # is configured, otherwise this API's own streaming endpoint.
    upload_url: str
    method: str
    expires_at: datetime
    max_bytes: int


class UploadComplete(Schema):
    # Optional client-computed digest. When present it is compared against what
    # actually landed, so a truncated or altered upload is caught here rather
    # than surfacing as a corrupt extraction later.
    sha256: str | None = Field(default=None, min_length=64, max_length=64)


class SourceObjectOut(Schema):
    id: uuid.UUID
    filename: str
    content_type: str
    size_bytes: int
    state: str
    rejection_reason: str
    page_count: int | None
    pages_needing_ocr: int | None
    created_at: datetime
