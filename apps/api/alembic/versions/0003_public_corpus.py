"""Public patent corpus with lexical search

Revision ID: 0003_public_corpus
Revises: 0002_tenant_isolation
Create Date: 2026-09-11

The public corpus is deliberately NOT tenant-owned: it is the same published
art for every customer, and giving it a tenant column would both waste storage
and invite a policy that filters out real prior art.

Retrieval here is lexical only (Postgres full-text). That is a real, explainable
baseline and it is honest about what it is -- semantic retrieval arrives with
OpenSearch, and the API reports which retrieval version produced every result
so the two are never confused after the fact.
"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0003_public_corpus"
down_revision: str | None = "0002_tenant_isolation"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "publications",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("publication_id", sa.String(64), nullable=False, unique=True),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("abstract", sa.Text(), nullable=False, server_default=""),
        sa.Column("claims_text", sa.Text(), nullable=False, server_default=""),
        sa.Column("applicant", sa.String(300), nullable=False, server_default=""),
        sa.Column("jurisdiction", sa.String(8), nullable=False),
        sa.Column("kind_code", sa.String(8), nullable=False, server_default=""),
        sa.Column("published_on", sa.Date(), nullable=True),
        sa.Column(
            "classifications",
            postgresql.ARRAY(sa.String(32)),
            nullable=False,
            server_default=sa.text("'{}'::varchar[]"),
        ),
        # Provenance of the corpus itself: which import produced this row.
        sa.Column("source", sa.String(64), nullable=False, server_default=""),
        sa.Column("corpus_revision", sa.String(64), nullable=False, server_default=""),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
    )

    # Generated column: the index can never drift from the text it indexes,
    # because the database derives it rather than the application remembering to.
    # Title is weighted above abstract, and claims below both.
    op.execute(
        """
        ALTER TABLE publications ADD COLUMN search_vector tsvector
        GENERATED ALWAYS AS (
            setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
            setweight(to_tsvector('english', coalesce(abstract, '')), 'B') ||
            setweight(to_tsvector('english', coalesce(claims_text, '')), 'C')
        ) STORED
        """
    )
    op.execute("CREATE INDEX ix_publications_search ON publications USING GIN (search_vector)")
    op.create_index("ix_publications_published_on", "publications", ["published_on"])
    op.create_index(
        "ix_publications_jurisdiction", "publications", ["jurisdiction", "published_on"]
    )

    # Read-only for the application: the corpus is written by import jobs
    # running under different credentials, never by a request handler.
    op.execute("GRANT SELECT ON publications TO moat_app")


def downgrade() -> None:
    op.drop_table("publications")
