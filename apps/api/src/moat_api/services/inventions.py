from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from moat_api.db.models import (
    AnalysisConcept,
    AnalysisRun,
    Decision,
    EvidenceLink,
    Invention,
    InventionContributor,
    InventionVersion,
    User,
)
from moat_api.schemas.invention import (
    AnalysisOut,
    ConceptOut,
    DecisionOut,
    EvidenceOut,
    InventionDetail,
    InventionSummary,
    PersonRef,
)


async def next_reference(session: AsyncSession, tenant_id: uuid.UUID, slug: str) -> str:
    """Allocate the next human-facing docket reference for a tenant.

    A transaction-scoped advisory lock serialises allocation per tenant, so two
    simultaneous submissions cannot be handed the same number. It is released
    at commit whether or not the transaction succeeds.
    """
    await session.execute(
        text("SELECT pg_advisory_xact_lock(hashtext(:key))"),
        {"key": f"invention-ref:{tenant_id}"},
    )
    year = datetime.now(UTC).year
    prefix = f"{slug.upper()[:4]}-{year}-"
    highest = (
        await session.execute(
            select(func.max(Invention.ref)).where(
                Invention.tenant_id == tenant_id, Invention.ref.like(f"{prefix}%")
            )
        )
    ).scalar_one_or_none()
    sequence = int(highest.rsplit("-", 1)[1]) + 1 if highest else 1
    return f"{prefix}{sequence:04d}"


async def contributors_of(
    session: AsyncSession, invention_ids: list[uuid.UUID]
) -> dict[uuid.UUID, list[PersonRef]]:
    """Batch the contributor lookup: one query for the whole page rather than
    one per row."""
    if not invention_ids:
        return {}
    rows = (
        await session.execute(
            select(InventionContributor.invention_id, User)
            .join(User, User.id == InventionContributor.user_id)
            .where(InventionContributor.invention_id.in_(invention_ids))
            .order_by(User.name)
        )
    ).all()
    grouped: dict[uuid.UUID, list[PersonRef]] = {}
    for invention_id, user in rows:
        grouped.setdefault(invention_id, []).append(
            PersonRef(id=user.id, name=user.name, email=user.email)
        )
    return grouped


async def latest_run(session: AsyncSession, invention_id: uuid.UUID) -> AnalysisRun | None:
    return (
        await session.execute(
            select(AnalysisRun)
            .where(AnalysisRun.invention_id == invention_id)
            .order_by(AnalysisRun.started_at.desc())
            .limit(1)
        )
    ).scalar_one_or_none()


def analysis_out(
    run: AnalysisRun, concepts: list[AnalysisConcept], evidence: list[EvidenceLink]
) -> AnalysisOut:
    return AnalysisOut(
        id=run.id,
        invention_revision=run.invention_revision,
        status=run.status,
        started_at=run.started_at,
        completed_at=run.completed_at,
        corpus_revision=run.corpus_revision,
        retrieval_version=run.retrieval_version,
        model_version=run.model_version,
        prompt_version=run.prompt_version,
        failure_category=run.failure_category,
        concepts=[
            ConceptOut(id=c.id, label=c.label, matches=c.matches)
            for c in sorted(concepts, key=lambda c: c.position)
        ],
        evidence=[
            EvidenceOut(
                id=e.id,
                publication_id=e.publication_id,
                title=e.title,
                applicant=e.applicant,
                jurisdiction=e.jurisdiction,
                kind_code=e.kind_code,
                published_on=e.published_on,
                passage=e.passage,
                retrieval_score=e.retrieval_score,
                matched_concepts=list(e.matched_concepts),
            )
            for e in sorted(evidence, key=lambda e: e.retrieval_score, reverse=True)
        ],
    )


def summary_out(
    invention: Invention,
    contributors: list[PersonRef],
    run: AnalysisRun | None,
    evidence_count: int,
) -> InventionSummary:
    return InventionSummary(
        id=invention.id,
        ref=invention.ref,
        title=invention.title,
        summary=invention.summary,
        status=invention.status,
        revision=invention.current_revision,
        created_at=invention.created_at,
        updated_at=invention.updated_at,
        contributors=contributors,
        classifications=list(invention.classifications),
        evidence_count=evidence_count,
        evidence_revision=run.invention_revision if run else None,
    )


def detail_out(
    invention: Invention,
    version: InventionVersion,
    contributors: list[PersonRef],
    analysis: AnalysisOut | None,
    decision: Decision | None,
    reviewer: User | None,
) -> InventionDetail:
    decision_out = None
    if decision is not None and reviewer is not None:
        decision_out = DecisionOut(
            id=decision.id,
            reviewer=PersonRef(id=reviewer.id, name=reviewer.name, email=reviewer.email),
            revision=decision.revision,
            outcome=decision.outcome,
            rationale=decision.rationale,
            decided_at=decision.decided_at,
            # The invention has moved past the text this reviewer read, so the
            # decision no longer describes the current disclosure.
            superseded=decision.revision != invention.current_revision,
        )

    return InventionDetail(
        id=invention.id,
        ref=invention.ref,
        title=invention.title,
        summary=invention.summary,
        status=invention.status,
        revision=invention.current_revision,
        created_at=invention.created_at,
        updated_at=invention.updated_at,
        contributors=contributors,
        classifications=list(invention.classifications),
        evidence_count=len(analysis.evidence) if analysis else 0,
        evidence_revision=analysis.invention_revision if analysis else None,
        problem=version.problem,
        description=version.description,
        latest_analysis=analysis,
        decision=decision_out,
    )
