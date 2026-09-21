"""Specification and claim set persistence.

Claims are saved as a whole set, validated together. Saving one claim in
isolation is not supported on purpose: dependency, scope and antecedent basis
are all properties of the set, so a "valid" individual claim is not a
meaningful idea.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from moat_api.db.models import (
    Claim,
    ClaimDependency,
    ClaimSet,
    Document,
    Invention,
    User,
)
from moat_api.schemas.drafting import ClaimIn
from moat_api.services import claims as claim_rules


class DraftingError(Exception):
    """A refusal the caller should see verbatim."""

    def __init__(self, message: str, code: str = "invalid", detail: object = None) -> None:
        super().__init__(message)
        self.code = code
        self.detail = detail


async def next_reference(session: AsyncSession, tenant_id: uuid.UUID, slug: str) -> str:
    """Allocate the next document reference for a tenant.

    Same transaction-scoped advisory lock as invention references: two
    simultaneous drafts must not be handed the same number.
    """
    await session.execute(
        text("SELECT pg_advisory_xact_lock(hashtext(:key))"),
        {"key": f"document-ref:{tenant_id}"},
    )
    year = datetime.now(UTC).year
    prefix = f"{slug.upper()[:4]}-SPEC-{year}-"
    highest = (
        await session.execute(
            select(func.max(Document.ref)).where(
                Document.tenant_id == tenant_id, Document.ref.like(f"{prefix}%")
            )
        )
    ).scalar_one_or_none()
    sequence = int(highest.rsplit("-", 1)[1]) + 1 if highest else 1
    return f"{prefix}{sequence:04d}"


def to_inputs(claims: list[ClaimIn]) -> list[claim_rules.ClaimInput]:
    return [
        claim_rules.ClaimInput(
            number=claim.number,
            kind=claim.kind,
            category=claim.category,
            preamble=claim.preamble,
            transition=claim.transition,
            body=claim.body,
            depends_on=sorted(set(claim.depends_on)),
        )
        for claim in claims
    ]


async def current_claim_set(session: AsyncSession, document_id: uuid.UUID) -> ClaimSet | None:
    return (
        await session.execute(
            select(ClaimSet)
            .where(ClaimSet.document_id == document_id)
            .order_by(ClaimSet.revision.desc())
            .limit(1)
        )
    ).scalar_one_or_none()


async def load_claims(
    session: AsyncSession, claim_set_id: uuid.UUID
) -> tuple[list[Claim], dict[uuid.UUID, list[uuid.UUID]]]:
    rows = list(
        (
            await session.execute(
                select(Claim).where(Claim.claim_set_id == claim_set_id).order_by(Claim.number)
            )
        ).scalars()
    )
    edges = list(
        (
            await session.execute(
                select(ClaimDependency).where(ClaimDependency.claim_set_id == claim_set_id)
            )
        ).scalars()
    )
    parents: dict[uuid.UUID, list[uuid.UUID]] = {}
    for edge in edges:
        parents.setdefault(edge.claim_id, []).append(edge.parent_claim_id)
    return rows, parents


async def as_inputs(
    session: AsyncSession, claim_set_id: uuid.UUID
) -> tuple[list[claim_rules.ClaimInput], dict[int, uuid.UUID]]:
    rows, parents = await load_claims(session, claim_set_id)
    number_of = {row.id: row.number for row in rows}
    inputs = [
        claim_rules.ClaimInput(
            number=row.number,
            kind=row.kind,
            category=row.category,
            preamble=row.preamble,
            transition=row.transition,
            body=row.body,
            depends_on=sorted(
                number_of[parent] for parent in parents.get(row.id, []) if parent in number_of
            ),
        )
        for row in rows
    ]
    return inputs, {row.number: row.id for row in rows}


async def save_claim_set(
    session: AsyncSession,
    *,
    tenant_id: uuid.UUID,
    document: Document,
    claims: list[ClaimIn],
    author_id: uuid.UUID,
    change_note: str,
) -> ClaimSet:
    """Persist a claim set, replacing the current draft or starting a new revision.

    Validation runs BEFORE anything is written. A structurally invalid set --
    a cycle, a forward reference, a gap in numbering -- is refused rather than
    stored, because the stored set is what gets filed.
    """
    inputs = to_inputs(claims)

    errors = [
        finding
        for finding in claim_rules.validate_structure(inputs)
        if finding.severity == claim_rules.Severity.ERROR
    ]
    if errors:
        raise DraftingError(
            "The claim set is not structurally valid.",
            code="invalid_claim_set",
            detail=[
                {
                    "code": f.code,
                    "message": f.message,
                    "authority": f.authority,
                    "claimNumber": f.claim_number,
                }
                for f in errors
            ],
        )

    # Serialise claim-set writes for this document. Two drafters saving at once
    # could otherwise each validate against a set the other is replacing, and
    # commit a combination neither of them checked (design doc §6).
    await session.execute(
        text("SELECT pg_advisory_xact_lock(hashtext(:key))"),
        {"key": f"claim-set:{document.id}"},
    )

    existing = await current_claim_set(session, document.id)

    if existing is not None and existing.frozen_at is None:
        # The current set is still a draft: replace its contents in place.
        target = existing
        target.change_note = change_note or target.change_note
        await session.execute(
            ClaimDependency.__table__.delete().where(
                ClaimDependency.claim_set_id == target.id
            )
        )
        await session.execute(Claim.__table__.delete().where(Claim.claim_set_id == target.id))
        await session.flush()
    else:
        # The current set was submitted or approved, so it is immutable. A
        # change starts a new revision and leaves the approved one intact.
        if existing is not None:
            existing.status = "superseded"
        target = ClaimSet(
            tenant_id=tenant_id,
            document_id=document.id,
            revision=(existing.revision + 1) if existing else 1,
            status="draft",
            created_by_id=author_id,
            change_note=change_note,
        )
        session.add(target)
        await session.flush()

    by_number: dict[int, Claim] = {}
    for claim in sorted(claims, key=lambda c: c.number):
        row = Claim(
            tenant_id=tenant_id,
            claim_set_id=target.id,
            number=claim.number,
            kind=claim.kind,
            category=claim.category,
            preamble=claim.preamble,
            transition=claim.transition,
            body=claim.body,
        )
        session.add(row)
        by_number[claim.number] = row
    await session.flush()

    for claim in claims:
        for parent_number in sorted(set(claim.depends_on)):
            parent = by_number.get(parent_number)
            if parent is None:
                continue
            session.add(
                ClaimDependency(
                    tenant_id=tenant_id,
                    claim_set_id=target.id,
                    claim_id=by_number[claim.number].id,
                    parent_claim_id=parent.id,
                )
            )
    await session.flush()
    return target


async def drafter_of(session: AsyncSession, document: Document) -> User | None:
    if document.drafter_id is None:
        return None
    return (
        await session.execute(select(User).where(User.id == document.drafter_id))
    ).scalar_one_or_none()


async def summary_counts(session: AsyncSession, document_id: uuid.UUID) -> tuple[int, int, int]:
    """Claim count, independent count, and open structural errors.

    Errors are recomputed rather than cached: a set can become invalid when
    something it depends on changes, and a stale badge saying "0 errors" is
    worse than no badge.
    """
    claim_set = await current_claim_set(session, document_id)
    if claim_set is None:
        return 0, 0, 0
    inputs, _ = await as_inputs(session, claim_set.id)
    if not inputs:
        return 0, 0, 0
    errors = sum(
        1
        for finding in claim_rules.validate_structure(inputs)
        if finding.severity == claim_rules.Severity.ERROR
    )
    return len(inputs), sum(1 for c in inputs if c.kind == "independent"), errors


async def seed_from_invention(
    session: AsyncSession, invention: Invention, version_text: dict[str, str]
) -> dict[str, str]:
    """Initial specification sections, carried over from the disclosure.

    Deliberately a copy, not a link. The specification is a separate legal
    document with its own revisions; once drafting starts, editing the
    disclosure must not silently rewrite the text being prepared for filing.
    """
    return {
        "title": invention.title,
        "abstract": "",
        "technical_field": "",
        "background": version_text.get("problem", ""),
        "summary": invention.summary,
        "brief_description_of_drawings": "",
        "detailed_description": version_text.get("description", ""),
    }
