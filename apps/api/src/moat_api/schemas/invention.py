from __future__ import annotations

import uuid
from datetime import date, datetime

from pydantic import Field

from moat_api.schemas.base import Schema


class PersonRef(Schema):
    id: uuid.UUID
    name: str
    email: str


class ConceptOut(Schema):
    id: uuid.UUID
    label: str
    matches: int


class EvidenceOut(Schema):
    id: uuid.UUID
    publication_id: str
    title: str
    applicant: str
    jurisdiction: str
    kind_code: str
    published_on: date | None
    passage: str
    # Named to resist being read as a patentability measure at the call site.
    retrieval_score: float
    matched_concepts: list[str]


class AnalysisOut(Schema):
    id: uuid.UUID
    invention_revision: int
    status: str
    started_at: datetime
    completed_at: datetime | None
    corpus_revision: str
    retrieval_version: str
    model_version: str
    prompt_version: str
    failure_category: str | None
    concepts: list[ConceptOut]
    evidence: list[EvidenceOut]


class DecisionOut(Schema):
    id: uuid.UUID
    reviewer: PersonRef
    revision: int
    outcome: str
    rationale: str
    decided_at: datetime
    # True when the disclosure moved on after this decision was recorded, so
    # the UI can say so instead of implying the current text was approved.
    superseded: bool


class InventionSummary(Schema):
    id: uuid.UUID
    ref: str
    title: str
    summary: str
    status: str
    revision: int
    created_at: datetime
    updated_at: datetime
    contributors: list[PersonRef]
    classifications: list[str]
    evidence_count: int
    evidence_revision: int | None


class InventionDetail(InventionSummary):
    problem: str
    description: str
    latest_analysis: AnalysisOut | None
    decision: DecisionOut | None


class InventionCreate(Schema):
    title: str = Field(min_length=4, max_length=500)
    summary: str = Field(default="", max_length=4000)
    problem: str = Field(default="", max_length=20000)
    description: str = Field(default="", max_length=100000)
    classifications: list[str] = Field(default_factory=list, max_length=20)


class InventionUpdate(Schema):
    title: str = Field(min_length=4, max_length=500)
    summary: str = Field(default="", max_length=4000)
    problem: str = Field(default="", max_length=20000)
    description: str = Field(default="", max_length=100000)
    classifications: list[str] = Field(default_factory=list, max_length=20)
    # Optimistic concurrency: the revision the editor started from. A mismatch
    # is a 409, never a silent overwrite of someone else's edit.
    base_revision: int


class SubmitRequest(Schema):
    note: str = Field(default="", max_length=2000)


class DecisionCreate(Schema):
    outcome: str = Field(pattern="^(approved|returned|rejected)$")
    rationale: str = Field(min_length=10, max_length=8000)
    # The reviewer states which revision they read. If the disclosure has moved
    # on, the decision is refused rather than silently applied to new text.
    revision: int


class Page(Schema):
    items: list
    next_cursor: str | None = None
