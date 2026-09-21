"""Drawings workflow.

A figure is requested by the drafter, drawn by the design team, and accepted
back by the drafter. Each upload is a version and each review names the version
it judged, for the same reason claim sets are versioned: "approved" has to mean
"approved this one".
"""

from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from moat_api.db.models import Drawing, DrawingReview, DrawingVersion, SourceObject

# Drawings are images. Patent offices want line art, but accepting common
# raster formats is the practical choice -- conversion happens at filing.
ALLOWED_DRAWING_TYPES = {"image/png", "image/jpeg", "application/pdf"}

# Generous for a figure, far below the general upload cap.
MAX_DRAWING_BYTES = 20 * 1024 * 1024


class DesignError(Exception):
    def __init__(self, message: str, code: str = "invalid") -> None:
        super().__init__(message)
        self.code = code


def next_status(current: str, event: str) -> str:
    """The figure lifecycle, in one place.

    Written as an explicit table rather than scattered assignments, so an
    illegal transition is visible rather than something that merely never
    happens to be exercised.
    """
    transitions = {
        ("requested", "assign"): "in_progress",
        ("requested", "upload"): "submitted",
        ("in_progress", "upload"): "submitted",
        ("rework", "upload"): "submitted",
        ("rework", "assign"): "in_progress",
        ("submitted", "approve"): "approved",
        ("submitted", "rework"): "rework",
        # Re-opening an approved figure is legitimate: the specification can
        # change after a figure was accepted.
        ("approved", "rework"): "rework",
        ("approved", "upload"): "submitted",
    }
    result = transitions.get((current, event))
    if result is None:
        raise DesignError(
            f"A figure that is '{current}' cannot be {event}ed.", code="bad_state"
        )
    return result


async def versions_of(
    session: AsyncSession, drawing_id: uuid.UUID
) -> list[tuple[DrawingVersion, SourceObject | None]]:
    rows = list(
        (
            await session.execute(
                select(DrawingVersion)
                .where(DrawingVersion.drawing_id == drawing_id)
                .order_by(DrawingVersion.version.desc())
            )
        ).scalars()
    )
    out: list[tuple[DrawingVersion, SourceObject | None]] = []
    for version in rows:
        source = None
        if version.source_object_id:
            source = (
                await session.execute(
                    select(SourceObject).where(SourceObject.id == version.source_object_id)
                )
            ).scalar_one_or_none()
        out.append((version, source))
    return out


async def reviews_of(session: AsyncSession, drawing_id: uuid.UUID) -> list[DrawingReview]:
    return list(
        (
            await session.execute(
                select(DrawingReview)
                .where(DrawingReview.drawing_id == drawing_id)
                .order_by(DrawingReview.created_at.desc())
            )
        ).scalars()
    )


def brief_description(drawings: list[Drawing]) -> tuple[str, int, int]:
    """Compose the specification's drawings section from the figures.

    The section has to list every figure in order, and its wording has to match
    the figures that actually exist. Generating it from the drawings themselves
    is the only way those two stay in step as figures are added and reworked.
    """
    approved = [d for d in drawings if d.status == "approved"]
    outstanding = [d for d in drawings if d.status != "approved"]

    lines: list[str] = []
    for drawing in sorted(drawings, key=lambda d: d.figure_number):
        caption = drawing.caption.strip() or "___"
        marker = "" if drawing.status == "approved" else "  [not yet approved]"
        lines.append(f"FIG. {drawing.figure_number} {caption}{marker}")

    return "\n".join(lines), len(approved), len(outstanding)


def validate_drawing_upload(content_type: str, size: int, filename: str) -> None:
    if content_type not in ALLOWED_DRAWING_TYPES:
        raise DesignError(
            f"A figure must be PNG, JPEG or PDF. Got {content_type}.", code="bad_type"
        )
    if size <= 0:
        raise DesignError("The file is empty.", code="empty")
    if size > MAX_DRAWING_BYTES:
        raise DesignError(
            f"A figure is limited to {MAX_DRAWING_BYTES // (1024 * 1024)} MB.", code="too_large"
        )
    if not filename.strip():
        raise DesignError("The file needs a name.", code="no_name")
