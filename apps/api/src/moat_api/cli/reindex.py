"""Rebuild the public search index and cut the alias over.

    uv run python -m moat_api.cli.reindex

Builds a fresh versioned index, then swaps the alias atomically. Readers keep
their current results until the new index is complete, and the previous index
is retained so a bad build can be rolled back by repointing the alias.
"""

from __future__ import annotations

import asyncio
import logging

from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from moat_api.core.config import get_settings
from moat_api.services.search import client, embeddings, indexer

DEFAULT_CORPUS_REVISION = "local-corpus-2026.37"


async def run(corpus_revision: str) -> None:
    settings = get_settings()
    model = embeddings.model_identity()
    if model:
        print(f"embeddings   {model.name} ({model.dimensions}d)")
    else:
        # Stated loudly: retrieval still works, but it is lexical only, and
        # every result built from this index records that.
        print(f"embeddings   UNAVAILABLE -- {embeddings.unavailable_reason()}")
        print("             index will be BM25 only")

    engine = create_async_engine(settings.migration_dsn)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as session, session.begin():
        total = await indexer.corpus_size(session)
        print(f"corpus       {total} publications")
        manifest = await indexer.rebuild(session, corpus_revision)
        print(f"index        {manifest.index_name}")
        print(f"indexed      {manifest.document_count}")
        print(f"retrieval    {manifest.retrieval_version}")
        print(f"state        {manifest.state}")
        pruned = await indexer.prune(session)
        if pruned:
            print(f"pruned       {len(pruned)} superseded index(es)")
    await client.close()
    await engine.dispose()


def main() -> None:
    logging.basicConfig(level=logging.WARNING)
    import sys

    revision = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_CORPUS_REVISION
    asyncio.run(run(revision))


if __name__ == "__main__":
    main()
