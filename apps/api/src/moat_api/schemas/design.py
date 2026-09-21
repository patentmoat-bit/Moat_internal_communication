from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import Field

from moat_api.schemas.base import Schema
from moat_api.schemas.invention import PersonRef


class DrawingVersionOut(Schema):
    id: uuid.UUID
    version: int
    notes: str
    uploaded_by: PersonRef | None
    created_at: datetime
    has_file: bool
    content_type: str
    size_bytes: int


class DrawingReviewOut(Schema):
    id: uuid.UUID
    version: int
    reviewer: PersonRef
    outcome: str
    notes: str
    created_at: datetime


class DrawingOut(Schema):
    id: uuid.UUID
    document_id: uuid.UUID
    document_ref: str
    figure_number: int
    caption: str
    brief: str
    status: str
    current_version: int
    requested_by: PersonRef | None
    assigned_to: PersonRef | None
    due_at: datetime | None
    created_at: datetime
    updated_at: datetime
    versions: list[DrawingVersionOut]
    reviews: list[DrawingReviewOut]


class DrawingRequest(Schema):
    figure_number: int = Field(ge=1, le=999)
    caption: str = Field(default="", max_length=500)
    # What the drafter needs shown. The design team cannot read minds, and a
    # vague brief is the main cause of rework.
    brief: str = Field(min_length=5, max_length=5000)
    due_at: datetime | None = None


class DrawingReviewIn(Schema):
    outcome: str = Field(pattern="^(approved|rework)$")
    notes: str = Field(default="", max_length=4000)
    # The version being reviewed. A later upload must not inherit an approval.
    version: int


class DrawingAssign(Schema):
    assignee_id: uuid.UUID | None = None


class DrawingsSummary(Schema):
    """What the spec's "Brief description of the drawings" would say."""

    text: str
    approved: int
    outstanding: int
