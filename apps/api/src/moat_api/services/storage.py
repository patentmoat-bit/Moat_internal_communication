from __future__ import annotations

import hashlib
import uuid
from contextlib import asynccontextmanager
from dataclasses import dataclass
from datetime import UTC, datetime

import aioboto3
from botocore.config import Config
from botocore.exceptions import ClientError

from moat_api.core.config import get_settings

settings = get_settings()

# Quarantine first, always. Nothing moves to the readable prefix until MIME
# validation, size and checksum checks have passed (design doc §8).
QUARANTINE_PREFIX = "quarantine"
DOCUMENTS_PREFIX = "documents"
ARTIFACTS_PREFIX = "artifacts"

# Allowlist, not a blocklist. Anything not named here is refused, so a new
# dangerous format cannot arrive by default.
ALLOWED_CONTENT_TYPES: dict[str, tuple[str, ...]] = {
    "application/pdf": (".pdf",),
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": (".docx",),
    "text/plain": (".txt", ".md"),
    "text/markdown": (".md", ".txt"),
    "image/png": (".png",),
    "image/jpeg": (".jpg", ".jpeg"),
}

# Leading bytes that must match the declared type. A .pdf that does not begin
# with %PDF is not a PDF, whatever the upload said.
MAGIC_BYTES: dict[str, tuple[bytes, ...]] = {
    "application/pdf": (b"%PDF-",),
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": (b"PK\x03\x04",),
    "image/png": (b"\x89PNG\r\n\x1a\n",),
    "image/jpeg": (b"\xff\xd8\xff",),
}


@dataclass(frozen=True, slots=True)
class ObjectInfo:
    key: str
    size: int
    etag: str


class StorageError(RuntimeError):
    pass


_session = aioboto3.Session()


@asynccontextmanager
async def s3():
    async with _session.client(
        "s3",
        endpoint_url=settings.s3_endpoint,
        aws_access_key_id=settings.s3_access_key or "moat-dev",
        aws_secret_access_key=settings.s3_secret_key or "moat-dev-secret",
        region_name=settings.s3_region,
        config=Config(
            signature_version="s3v4",
            # Path style: SeaweedFS and most self-hosted S3 implementations do
            # not do virtual-host buckets, and DNS for them would not resolve.
            s3={"addressing_style": "path"},
            retries={"max_attempts": 2, "mode": "standard"},
        ),
    ) as client:
        yield client


async def ensure_bucket() -> None:
    async with s3() as client:
        try:
            await client.head_bucket(Bucket=settings.s3_bucket)
        except ClientError:
            await client.create_bucket(Bucket=settings.s3_bucket)


def quarantine_key(tenant_id: uuid.UUID, session_id: uuid.UUID, filename: str) -> str:
    """Server-generated key.

    A client never chooses where its bytes land: the tenant is taken from the
    authenticated principal and the rest is random, so one tenant cannot write
    into another's prefix or overwrite an existing object.
    """
    suffix = filename.rsplit(".", 1)[-1].lower()[:12] if "." in filename else "bin"
    safe = "".join(char for char in suffix if char.isalnum()) or "bin"
    return f"{QUARANTINE_PREFIX}/{tenant_id}/{session_id}.{safe}"


def document_key(tenant_id: uuid.UUID, object_id: uuid.UUID, suffix: str) -> str:
    return f"{DOCUMENTS_PREFIX}/{tenant_id}/{object_id}.{suffix}"


def artifact_key(tenant_id: uuid.UUID, source_id: uuid.UUID, kind: str, page: int) -> str:
    return f"{ARTIFACTS_PREFIX}/{tenant_id}/{source_id}/{kind}-{page}.txt"


def validate_declaration(filename: str, content_type: str, size: int) -> None:
    """Check what the client claims, before any bytes are accepted."""
    if size <= 0:
        raise StorageError("File is empty.")
    if size > settings.upload_max_bytes:
        limit = settings.upload_max_bytes // (1024 * 1024)
        raise StorageError(f"File exceeds the {limit} MiB limit.")
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise StorageError(f"Files of type {content_type} are not accepted.")
    extensions = ALLOWED_CONTENT_TYPES[content_type]
    if not any(filename.lower().endswith(extension) for extension in extensions):
        raise StorageError(f"A {content_type} file must end in {' or '.join(extensions)}.")


def verify_magic(content_type: str, head: bytes) -> None:
    """Check what actually arrived against the declared type."""
    expected = MAGIC_BYTES.get(content_type)
    if expected and not any(head.startswith(prefix) for prefix in expected):
        raise StorageError("File content does not match its declared type.")


async def presigned_put(key: str, content_type: str) -> str:
    """A short-lived URL that can write exactly one object and nothing else."""
    async with s3() as client:
        return await client.generate_presigned_url(
            "put_object",
            Params={"Bucket": settings.s3_bucket, "Key": key, "ContentType": content_type},
            ExpiresIn=settings.upload_url_ttl_seconds,
        )


async def put_bytes(key: str, data: bytes, content_type: str) -> ObjectInfo:
    async with s3() as client:
        response = await client.put_object(
            Bucket=settings.s3_bucket, Key=key, Body=data, ContentType=content_type
        )
    return ObjectInfo(key=key, size=len(data), etag=str(response.get("ETag", "")).strip('"'))


async def head(key: str) -> ObjectInfo | None:
    async with s3() as client:
        try:
            response = await client.head_object(Bucket=settings.s3_bucket, Key=key)
        except ClientError:
            return None
    return ObjectInfo(
        key=key,
        size=int(response["ContentLength"]),
        etag=str(response.get("ETag", "")).strip('"'),
    )


async def get_bytes(key: str, max_bytes: int | None = None) -> bytes:
    """Read an object, refusing oversized ones before any bytes are transferred.

    The size check happens against object metadata first: a worker must not
    stream a gigabyte into memory only to discover it was over the limit.
    """
    limit = max_bytes or settings.upload_max_bytes
    async with s3() as client:
        try:
            meta = await client.head_object(Bucket=settings.s3_bucket, Key=key)
        except ClientError as error:
            raise StorageError(f"Object {key} is not readable.") from error

        size = int(meta["ContentLength"])
        if size > limit:
            raise StorageError(
                f"Object is {size} bytes, over the {limit} byte processing limit."
            )

        response = await client.get_object(Bucket=settings.s3_bucket, Key=key)
        async with response["Body"] as stream:
            data = await stream.read()

    if len(data) > limit:
        raise StorageError("Object grew past the processing limit while being read.")
    return data


async def get_head_bytes(key: str, count: int) -> bytes:
    """Read only the first bytes of an object, for magic-number validation."""
    async with s3() as client:
        try:
            response = await client.get_object(
                Bucket=settings.s3_bucket, Key=key, Range=f"bytes=0-{max(count - 1, 0)}"
            )
        except ClientError as error:
            raise StorageError(f"Object {key} is not readable.") from error
        async with response["Body"] as stream:
            return await stream.read()


async def copy(source_key: str, target_key: str) -> None:
    async with s3() as client:
        await client.copy_object(
            Bucket=settings.s3_bucket,
            CopySource={"Bucket": settings.s3_bucket, "Key": source_key},
            Key=target_key,
        )


async def delete(key: str) -> None:
    # Deleting an object that is already gone reaches the desired end state,
    # so a missing-key error is success. contextlib.suppress cannot be used
    # here: it is a synchronous context manager and this block is `async with`.
    async with s3() as client:
        try:
            await client.delete_object(Bucket=settings.s3_bucket, Key=key)
        except ClientError:  # noqa: S110 -- absence is the desired end state
            return


def sha256_of(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def expiry(seconds: int) -> datetime:
    return datetime.fromtimestamp(datetime.now(UTC).timestamp() + seconds, tz=UTC)
