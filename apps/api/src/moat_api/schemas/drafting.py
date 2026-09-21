from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import Field, field_validator

from moat_api.schemas.base import Schema
from moat_api.schemas.invention import PersonRef

# 37 CFR 1.72(b): the abstract must not exceed 150 words.
ABSTRACT_WORD_LIMIT = 150


class ClaimIn(Schema):
    number: int = Field(ge=1, le=999)
    kind: str = Field(pattern="^(independent|dependent)$")
    category: str = Field(
        default="other", pattern="^(apparatus|method|system|composition|crm|other)$"
    )
    preamble: str = Field(default="", max_length=2000)
    transition: str = Field(default="comprising", max_length=64)
    body: str = Field(default="", max_length=20000)
    # Claim NUMBERS, not ids: this is what a drafter types, and numbering is
    # resolved to ids server-side.
    depends_on: list[int] = Field(default_factory=list, max_length=20)


class ClaimOut(ClaimIn):
    id: uuid.UUID


class FindingOut(Schema):
    code: str
    severity: str
    message: str
    # The rule behind the finding. A finding a drafter cannot trace to a rule
    # is one they cannot act on.
    authority: str
    claim_number: int | None
    excerpt: str


class ClaimTreeNode(Schema):
    number: int
    kind: str
    category: str
    depth: int
    multiple_dependent: bool
    depends_on: list[int]
    children: list[ClaimTreeNode]


# Self-referential model: the forward reference in `children` must be resolved
# before the schema is used.
ClaimTreeNode.model_rebuild()


class ClaimSetOut(Schema):
    id: uuid.UUID
    revision: int
    status: str
    change_note: str
    created_at: datetime
    frozen_at: datetime | None
    created_by: PersonRef | None
    claims: list[ClaimOut]
    tree: list[ClaimTreeNode]
    findings: list[FindingOut]
    coverage: dict


class SpecificationIn(Schema):
    title: str = Field(min_length=4, max_length=500)
    abstract: str = Field(default="", max_length=8000)
    technical_field: str = Field(default="", max_length=20000)
    background: str = Field(default="", max_length=60000)
    summary: str = Field(default="", max_length=60000)
    brief_description_of_drawings: str = Field(default="", max_length=20000)
    detailed_description: str = Field(default="", max_length=400000)
    change_note: str = Field(default="", max_length=300)
    base_revision: int

    @field_validator("abstract")
    @classmethod
    def _abstract_length(cls, value: str) -> str:
        words = len(value.split())
        if words > ABSTRACT_WORD_LIMIT:
            raise ValueError(
                f"The abstract is {words} words. 37 CFR 1.72(b) limits it to "
                f"{ABSTRACT_WORD_LIMIT}."
            )
        return value


class DraftSummary(Schema):
    id: uuid.UUID
    ref: str
    title: str
    status: str
    revision: int
    jurisdiction: str
    invention_id: uuid.UUID
    invention_ref: str
    drafter: PersonRef | None
    claim_count: int
    independent_count: int
    open_errors: int
    updated_at: datetime


class DraftDetail(DraftSummary):
    claim_decision: ClaimSetDecisionOut | None = None
    abstract: str
    technical_field: str
    background: str
    summary: str
    brief_description_of_drawings: str
    detailed_description: str
    claim_set: ClaimSetOut | None
    change_note: str


class DraftCreate(Schema):
    invention_id: uuid.UUID
    jurisdiction: str = Field(default="US", max_length=8)


class ClaimSetIn(Schema):
    claims: list[ClaimIn] = Field(min_length=1, max_length=200)
    change_note: str = Field(default="", max_length=300)


class CheckRequest(Schema):
    """Run the checks against unsaved text, for live feedback while typing."""

    claims: list[ClaimIn] = Field(min_length=1, max_length=200)


class CheckResult(Schema):
    findings: list[FindingOut]
    tree: list[ClaimTreeNode]
    coverage: dict
    checker_version: str


class DraftQueueItem(Schema):
    """An approved disclosure with no draft started yet."""

    invention_id: uuid.UUID
    ref: str
    title: str
    summary: str
    approved_at: datetime | None
    reviewer: PersonRef | None
    contributors: list[PersonRef]


class ClaimSetDecisionIn(Schema):
    outcome: str = Field(pattern="^(approved|returned)$")
    rationale: str = Field(min_length=10, max_length=8000)
    # The reviewer states which claim set revision they read. If the drafter
    # amended it in the meantime, the decision is refused rather than applied
    # to claims nobody reviewed.
    claim_set_revision: int


class ClaimSetDecisionOut(Schema):
    id: uuid.UUID
    reviewer: PersonRef
    claim_set_revision: int
    outcome: str
    rationale: str
    decided_at: datetime
    # True once the drafter has amended past the reviewed revision.
    superseded: bool


class ExportRequest(Schema):
    format: str = Field(pattern="^(docx|pdf|xml)$")


class AssistSuggestion(Schema):
    field: str
    value: str
    # Why this was produced. Every suggestion is a restructuring of the
    # drafter's own text, and the rationale has to make that visible.
    rationale: str
    replaces_existing: bool


class AssistResponse(Schema):
    version: str
    template_generation: bool
    model_generation: bool
    model_note: str
    suggestions: list[AssistSuggestion]
