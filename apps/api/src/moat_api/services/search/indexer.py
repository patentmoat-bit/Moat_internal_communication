from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from opensearchpy.exceptions import NotFoundError
from opensearchpy.helpers import async_bulk
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from moat_api.db.models import IndexManifest, Publication
from moat_api.services.search import embeddings
from moat_api.services.search.client import client
from moat_api.services.search.schema import (
    HYBRID_PIPELINE,
    HYBRID_PIPELINE_BODY,
    PUBLICATIONS_ALIAS,
    build_stamp,
    index_name,
    publication_mapping,
)

BATCH_SIZE = 200


def retrieval_version() -> str:
    """Identifies the retrieval configuration in every stored result.

    Changing how retrieval works changes this string, so a result recorded a
    year ago can still be interpreted correctly.
    """
    model = embeddings.model_identity()
    return f"hybrid-bm25+{model.name.split('/')[-1]}@1.0" if model else "opensearch-bm25@1.0"


def _cpc_prefixes(codes: list[str]) -> list[str]:
    """Coarse classification keys: 'B25J 9/16' -> ['B', 'B25', 'B25J'].

    Prefix terms let a filter on a technology area avoid wildcard queries,
    which do not use the index.
    """
    prefixes: set[str] = set()
    for code in codes:
        compact = code.replace(" ", "")
        if not compact:
            continue
        prefixes.add(compact[:1])
        if len(compact) >= 3:
            prefixes.add(compact[:3])
        if len(compact) >= 4:
            prefixes.add(compact[:4])
    return sorted(prefixes)


def _document(publication: Publication, vector: list[float] | None) -> dict[str, Any]:
    body: dict[str, Any] = {
        "publication_id": publication.publication_id,
        "title": publication.title,
        "abstract": publication.abstract,
        "claims_text": publication.claims_text,
        "applicant": publication.applicant,
        "jurisdiction": publication.jurisdiction,
        "kind_code": publication.kind_code,
        "published_on": publication.published_on.isoformat() if publication.published_on else None,
        "classifications": list(publication.classifications),
        "cpc_prefixes": _cpc_prefixes(list(publication.classifications)),
        "corpus_revision": publication.corpus_revision,
        "source": publication.source,
    }
    if vector is not None:
        body["embedding"] = vector
    return body


def _embedding_text(publication: Publication) -> str:
    """What gets embedded. Title first, then abstract, then claims -- truncated,
    because a static embedding over very long text averages away the signal."""
    return " ".join(
        filter(None, [publication.title, publication.abstract, publication.claims_text])
    )[:2000]


async def rebuild(session: AsyncSession, corpus_revision: str) -> IndexManifest:
    """Build a fresh index and cut the alias over to it.

    Never mutates the serving index: readers keep their current results until
    the new index is fully built, then the alias swap is atomic. The previous
    index is retained for rollback.
    """
    os_client = client()
    model = embeddings.model_identity()
    dimensions = model.dimensions if model else 0
    version = retrieval_version()
    started_at = datetime.now(UTC)
    target = index_name(corpus_revision, version, build_stamp(started_at))

    manifest = IndexManifest(
        index_name=target,
        alias=PUBLICATIONS_ALIAS,
        corpus_revision=corpus_revision,
        retrieval_version=version,
        embedding_model=model.name if model else "",
        embedding_dimensions=dimensions,
        state="building",
        detail={"embedding_unavailable": embeddings.unavailable_reason() or ""},
    )
    session.add(manifest)
    await session.flush()

    if await os_client.indices.exists(index=target):
        await os_client.indices.delete(index=target)
    await os_client.indices.create(index=target, body=publication_mapping(dimensions))

    if dimensions > 0:
        await os_client.transport.perform_request(
            "PUT", f"/_search/pipeline/{HYBRID_PIPELINE}", body=HYBRID_PIPELINE_BODY
        )

    total = 0
    offset = 0
    while True:
        rows = list(
            (
                await session.execute(
                    select(Publication)
                    .order_by(Publication.publication_id)
                    .offset(offset)
                    .limit(BATCH_SIZE)
                )
            ).scalars()
        )
        if not rows:
            break

        vectors = embeddings.encode([_embedding_text(row) for row in rows]) if dimensions else None
        actions = [
            {
                "_index": target,
                "_id": row.publication_id,
                "_source": _document(row, vectors[index] if vectors else None),
            }
            for index, row in enumerate(rows)
        ]
        await async_bulk(os_client, actions, refresh=False)
        total += len(rows)
        offset += BATCH_SIZE

    await os_client.indices.refresh(index=target)

    # Atomic cutover: remove the alias from every previous index and add it to
    # this one in a single action, so there is never a moment with no index or
    # two behind the alias.
    actions: list[dict[str, Any]] = []
    try:
        existing = await os_client.indices.get_alias(name=PUBLICATIONS_ALIAS)
    except NotFoundError:
        # First build: there is no alias to move yet.
        existing = {}
    for previous in existing:
        if previous != target:
            actions.append({"remove": {"index": previous, "alias": PUBLICATIONS_ALIAS}})
    actions.append({"add": {"index": target, "alias": PUBLICATIONS_ALIAS}})
    await os_client.indices.update_aliases(body={"actions": actions})

    await session.execute(
        IndexManifest.__table__.update()
        .where(IndexManifest.alias == PUBLICATIONS_ALIAS, IndexManifest.id != manifest.id)
        .values(state="superseded")
    )
    manifest.document_count = total
    manifest.state = "active"
    manifest.activated_at = datetime.now(UTC)
    await session.flush()
    return manifest


async def prune(session: AsyncSession, keep: int = 2) -> list[str]:
    """Delete superseded indices beyond the newest few.

    Keeps at least one previous build so a bad cutover can be rolled back by
    repointing the alias. Older ones are dead weight on disk, and OpenSearch
    going read-only at its disk watermark is the most common way search fails.
    """
    os_client = client()
    rows = list(
        (
            await session.execute(
                select(IndexManifest)
                .where(IndexManifest.state == "superseded")
                .order_by(IndexManifest.created_at.desc())
                .offset(keep)
            )
        ).scalars()
    )
    removed: list[str] = []
    for row in rows:
        if await os_client.indices.exists(index=row.index_name):
            await os_client.indices.delete(index=row.index_name)
        row.state = "failed"
        row.detail = {**(row.detail or {}), "pruned": True}
        removed.append(row.index_name)
    return removed


async def active_manifest(session: AsyncSession) -> IndexManifest | None:
    return (
        await session.execute(
            select(IndexManifest)
            .where(IndexManifest.state == "active")
            .order_by(IndexManifest.activated_at.desc())
            .limit(1)
        )
    ).scalar_one_or_none()


async def corpus_size(session: AsyncSession) -> int:
    return (await session.execute(select(func.count()).select_from(Publication))).scalar_one()
