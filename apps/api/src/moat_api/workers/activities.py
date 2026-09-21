"""Activities: everything that touches the outside world.

Workflow code must be deterministic and replayable, so every database write,
object read, search query and notification lives here instead.
"""

from __future__ import annotations

import uuid
from datetime import UTC, date, datetime

import structlog
from sqlalchemy import select
from temporalio import activity

from moat_api.db.models import (
    AnalysisConcept,
    AnalysisRun,
    Claim,
    ClaimDependency,
    ClaimSet,
    Document,
    DocumentVersion,
    EvidenceLink,
    ExtractionArtifact,
    Invention,
    InventionContributor,
    InventionVersion,
    Notification,
    SourceObject,
    Tenant,
    User,
)
from moat_api.db.session import tenant_session, unscoped_session
from moat_api.services import export, extraction, jobs, retrieval, storage
from moat_api.services.search import indexer
from moat_api.services.search.query import SearchUnavailable

log = structlog.get_logger(__name__)

# Inline text stays in PostgreSQL up to this size; anything larger goes to
# object storage so rows stay small and the database stays fast.
INLINE_TEXT_LIMIT = 40_000


def _ids(payload: dict) -> tuple[uuid.UUID, uuid.UUID]:
    return uuid.UUID(payload["tenant_id"]), uuid.UUID(payload["job_id"])


@activity.defn(name="start_job")
async def start_job(payload: dict) -> None:
    tenant_id, job_id = _ids(payload)
    async with tenant_session(tenant_id) as session:
        await jobs.mark_running(session, job_id, activity.info().workflow_id)


@activity.defn(name="fail_job")
async def fail_job(payload: dict) -> None:
    """Terminal failure handling.

    Also releases whatever the job was working on. An activity that crashes
    mid-flight would otherwise leave a document in `extracting` forever, which
    reads to a user as "still working" rather than "this failed".
    """
    tenant_id, job_id = _ids(payload)
    detail = payload.get("detail", "")
    category = payload.get("category", "unknown")

    async with tenant_session(tenant_id) as session:
        await jobs.mark_failed(session, job_id, category, detail)

        source_id = payload.get("source_object_id")
        if source_id:
            source = (
                await session.execute(
                    select(SourceObject).where(SourceObject.id == uuid.UUID(source_id))
                )
            ).scalar_one_or_none()
            if source is not None and source.state not in ("ready", "rejected"):
                source.state = "rejected"
                source.rejection_reason = (detail or "Processing failed.")[:300]


@activity.defn(name="run_analysis")
async def run_analysis(payload: dict) -> dict:
    """Retrieve prior art for one revision and persist the run with provenance."""
    tenant_id, job_id = _ids(payload)
    invention_id = uuid.UUID(payload["invention_id"])
    revision = int(payload["revision"])

    async with tenant_session(tenant_id) as session:
        version = (
            await session.execute(
                select(InventionVersion).where(
                    InventionVersion.invention_id == invention_id,
                    InventionVersion.revision == revision,
                )
            )
        ).scalar_one()
        title, summary, description = version.title, version.summary, version.description

    concepts = retrieval.extract_concepts(title, summary, description)
    full_text = " ".join([title, summary, description])

    async with unscoped_session() as corpus_session:
        manifest = await indexer.active_manifest(corpus_session)

    try:
        hits, retrieval_version = await retrieval.search(concepts, full_text)
        status = "complete" if hits else "insufficient_evidence"
        failure_category = None
    except SearchUnavailable as error:
        # Recorded as a failed run rather than an empty one. "Search was down"
        # and "no prior art found" must never look the same to a reviewer.
        hits, retrieval_version = [], "unavailable"
        status = "failed"
        failure_category = "search_unavailable"
        log.warning("analysis.search_unavailable", error=str(error)[:200])

    async with tenant_session(tenant_id) as session:
        run = AnalysisRun(
            tenant_id=tenant_id,
            invention_id=invention_id,
            invention_revision=revision,
            status=status,
            started_at=datetime.now(UTC),
            completed_at=datetime.now(UTC),
            corpus_revision=manifest.corpus_revision if manifest else "unknown",
            retrieval_version=retrieval_version,
            model_version="none (retrieval only, no generation)",
            prompt_version="none",
            failure_category=failure_category,
        )
        session.add(run)
        await session.flush()

        for position, concept in enumerate(concepts):
            session.add(
                AnalysisConcept(
                    tenant_id=tenant_id,
                    run_id=run.id,
                    label=concept.label,
                    matches=sum(1 for hit in hits if concept.label in hit.matched_concepts),
                    position=position,
                )
            )

        for hit in hits:
            session.add(
                EvidenceLink(
                    tenant_id=tenant_id,
                    run_id=run.id,
                    publication_id=hit.hit.publication_id,
                    title=hit.hit.title,
                    applicant=hit.hit.applicant,
                    jurisdiction=hit.hit.jurisdiction,
                    kind_code=hit.hit.kind_code,
                    published_on=(
                        date.fromisoformat(hit.hit.published_on[:10])
                        if hit.hit.published_on
                        else None
                    ),
                    passage=hit.passage,
                    retrieval_score=hit.score,
                    matched_concepts=hit.matched_concepts,
                )
            )

        if status == "failed":
            await jobs.mark_failed(session, job_id, "search_unavailable", "Retrieval unavailable.")
        else:
            await jobs.mark_succeeded(
                session,
                job_id,
                {"run_id": str(run.id), "evidence": len(hits)},
                f"{len(hits)} passages retrieved",
            )

        requester = payload.get("requested_by")
        if requester and status != "failed":
            session.add(
                Notification(
                    tenant_id=tenant_id,
                    user_id=uuid.UUID(requester),
                    kind="analysis_complete",
                    title=f"Prior-art search finished for revision {revision}",
                    body=f"{len(hits)} passages retrieved via {retrieval_version}.",
                    target_type="invention",
                    target_id=invention_id,
                    action_url=f"/inventions/{invention_id}",
                    priority="medium",
                    payload={"run_id": str(run.id)},
                )
            )

    return {"run_id": str(run.id), "status": status, "evidence": len(hits)}


@activity.defn(name="extract_document")
async def extract_document(payload: dict) -> dict:
    """Verify a quarantined object, extract its text, and release it."""
    tenant_id, job_id = _ids(payload)
    source_id = uuid.UUID(payload["source_object_id"])

    async with tenant_session(tenant_id) as session:
        source = (
            await session.execute(select(SourceObject).where(SourceObject.id == source_id))
        ).scalar_one()
        key, content_type = source.object_key, source.content_type
        filename, invention_id = source.filename, source.invention_id
        source.state = "extracting"

    try:
        # Magic bytes before the whole file: a mislabelled upload is rejected
        # after 8 bytes rather than after 100 MiB.
        storage.verify_magic(content_type, await storage.get_head_bytes(key, 16))
        data = await storage.get_bytes(key)
        result = extraction.extract(data, content_type)
    except (storage.StorageError, extraction.ExtractionError) as error:
        category = getattr(error, "category", "unreadable")
        async with tenant_session(tenant_id) as session:
            rejected = (
                await session.execute(select(SourceObject).where(SourceObject.id == source_id))
            ).scalar_one()
            rejected.state = "rejected"
            rejected.rejection_reason = str(error)[:300]
            await jobs.mark_failed(session, job_id, category, str(error))
        # The bytes are not kept: a file that cannot be read has no value and
        # holding it only widens the confidentiality surface.
        await storage.delete(key)
        return {"state": "rejected", "reason": str(error)[:200], "category": category}

    document_key = storage.document_key(tenant_id, source_id, content_type.rsplit("/", 1)[-1][:8])
    await storage.copy(key, document_key)
    await storage.delete(key)

    text_key = ""
    if len(result.text) > INLINE_TEXT_LIMIT:
        text_key = storage.artifact_key(tenant_id, source_id, "text", 0)
        await storage.put_bytes(text_key, result.text.encode("utf-8"), "text/plain")

    async with tenant_session(tenant_id) as session:
        stored = (
            await session.execute(select(SourceObject).where(SourceObject.id == source_id))
        ).scalar_one()
        stored.object_key = document_key
        stored.state = "ready"
        stored.page_count = result.page_count
        stored.pages_needing_ocr = result.pages_needing_ocr

        session.add(
            ExtractionArtifact(
                tenant_id=tenant_id,
                source_object_id=source_id,
                kind="text",
                page_number=0,
                object_key=text_key,
                inline_text="" if text_key else result.text,
                size_bytes=len(result.text.encode("utf-8")),
                sha256=storage.sha256_of(result.text.encode("utf-8")),
                extractor=result.extractor,
                detail={
                    "page_count": result.page_count,
                    "pages_needing_ocr": result.pages_needing_ocr,
                },
            )
        )

        await jobs.mark_succeeded(
            session,
            job_id,
            {
                "source_object_id": str(source_id),
                "characters": len(result.text),
                "pages_needing_ocr": result.pages_needing_ocr,
            },
            f"{len(result.text)} characters extracted",
        )

        if invention_id:
            contributors = list(
                (
                    await session.execute(
                        select(InventionContributor.user_id).where(
                            InventionContributor.invention_id == invention_id
                        )
                    )
                ).scalars()
            )
            invention = (
                await session.execute(select(Invention).where(Invention.id == invention_id))
            ).scalar_one_or_none()
            ocr_note = (
                f" {result.pages_needing_ocr} page(s) have no text layer and need OCR."
                if result.needs_ocr
                else ""
            )
            for user_id in contributors:
                session.add(
                    Notification(
                        tenant_id=tenant_id,
                        user_id=user_id,
                        kind="document_ready",
                        title=f"{filename} is ready",
                        body=f"Text extracted from {filename}.{ocr_note}",
                        target_type="invention",
                        target_id=invention_id,
                        action_url=f"/inventions/{invention_id}",
                        priority="low",
                        payload={"source_object_id": str(source_id)},
                    )
                )
            if invention is not None:
                invention.updated_at = datetime.now(UTC)

    return {
        "state": "ready",
        "characters": len(result.text),
        "page_count": result.page_count,
        "pages_needing_ocr": result.pages_needing_ocr,
    }


@activity.defn(name="export_document")
async def export_document(payload: dict) -> dict:
    """Render a specification to DOCX, PDF or XML and store it.

    Runs on its own queue so a 30-second office-suite render cannot delay
    interactive work, and so the conversion service can be scaled and failed
    independently of the API.
    """
    tenant_id, job_id = _ids(payload)
    document_id = uuid.UUID(payload["document_id"])
    fmt = payload.get("format", "docx")

    async with tenant_session(tenant_id) as session:
        document = (
            await session.execute(select(Document).where(Document.id == document_id))
        ).scalar_one()
        version = (
            await session.execute(
                select(DocumentVersion).where(
                    DocumentVersion.document_id == document.id,
                    DocumentVersion.revision == document.current_revision,
                )
            )
        ).scalar_one()

        claim_set = (
            await session.execute(
                select(ClaimSet)
                .where(ClaimSet.document_id == document.id)
                .order_by(ClaimSet.revision.desc())
                .limit(1)
            )
        ).scalar_one_or_none()

        export_claims: list[export.ExportClaim] = []
        if claim_set is not None:
            rows = list(
                (
                    await session.execute(
                        select(Claim)
                        .where(Claim.claim_set_id == claim_set.id)
                        .order_by(Claim.number)
                    )
                ).scalars()
            )
            edges = list(
                (
                    await session.execute(
                        select(ClaimDependency).where(
                            ClaimDependency.claim_set_id == claim_set.id
                        )
                    )
                ).scalars()
            )
            number_of = {row.id: row.number for row in rows}
            parents: dict[uuid.UUID, list[int]] = {}
            for edge in edges:
                if edge.parent_claim_id in number_of:
                    parents.setdefault(edge.claim_id, []).append(number_of[edge.parent_claim_id])
            export_claims = [
                export.ExportClaim(
                    number=row.number,
                    kind=row.kind,
                    preamble=row.preamble,
                    transition=row.transition,
                    body=row.body,
                    depends_on=sorted(parents.get(row.id, [])),
                )
                for row in rows
            ]

        inventors = list(
            (
                await session.execute(
                    select(User.name)
                    .join(InventionContributor, InventionContributor.user_id == User.id)
                    .where(InventionContributor.invention_id == document.invention_id)
                    .order_by(User.name)
                )
            ).scalars()
        )
        tenant_name = (
            await session.execute(select(Tenant.name).where(Tenant.id == tenant_id))
        ).scalar_one()

        payload_document = export.ExportDocument(
            ref=document.ref,
            title=version.title,
            jurisdiction=document.jurisdiction,
            abstract=version.abstract,
            technical_field=version.technical_field,
            background=version.background,
            summary=version.summary,
            brief_description_of_drawings=version.brief_description_of_drawings,
            detailed_description=version.detailed_description,
            claims=export_claims,
            inventors=inventors,
            applicant=tenant_name,
            revision=document.current_revision,
            claim_set_revision=claim_set.revision if claim_set else None,
        )
        ref = document.ref

    content_type, extension = export.FORMATS[fmt]

    try:
        if fmt == "xml":
            data = export.to_xml(payload_document)
        else:
            docx_bytes = export.to_docx(payload_document)
            data = (
                docx_bytes
                if fmt == "docx"
                else await export.to_pdf(docx_bytes, f"{ref}.docx")
            )
    except export.PdfUnavailable as error:
        # A conversion outage is reported as a failed export, not as an empty
        # file. A zero-byte PDF landing in a filing folder is worse than none.
        async with tenant_session(tenant_id) as session:
            await jobs.mark_failed(session, job_id, "conversion_unavailable", str(error))
        return {"state": "failed", "reason": str(error)[:200]}

    filename = f"{ref}-rev{payload_document.revision}.{extension}"
    key = f"exports/{tenant_id}/{document_id}/{job_id}.{extension}"
    await storage.put_bytes(key, data, content_type)

    async with tenant_session(tenant_id) as session:
        await jobs.mark_succeeded(
            session,
            job_id,
            {
                "object_key": key,
                "filename": filename,
                "content_type": content_type,
                "bytes": len(data),
                "format": fmt,
                "exporter": export.EXPORTER_VERSION,
            },
            f"{filename} ({len(data) // 1024} KB)",
        )

        requester = payload.get("requested_by")
        if requester:
            session.add(
                Notification(
                    tenant_id=tenant_id,
                    user_id=uuid.UUID(requester),
                    kind="export_ready",
                    title=f"{filename} is ready",
                    body=f"{fmt.upper()} export of {ref} finished.",
                    target_type="document",
                    target_id=document_id,
                    action_url=f"/drafts/{document_id}",
                    priority="low",
                    payload={"job_id": str(job_id), "format": fmt},
                )
            )

    return {"state": "ready", "bytes": len(data), "format": fmt, "filename": filename}
