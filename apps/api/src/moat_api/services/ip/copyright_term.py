"""Copyright term and registration posture, United States.

Scope is deliberate and stated: works created on or after 1 January 1978 under
the Copyright Act of 1976. Earlier works depend on publication, notice and
renewal history under the 1909 Act, which a date calculation cannot establish
-- those are returned for manual review rather than given a confident answer
that could be wrong by decades.

Terms outside the US (life plus 70 across the EU and many others, life plus 60
in India) are not calculated here.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date

from moat_api.services.ip.dates import add_months, end_of_year

TERM_VERSION = "us-copyright-term@1976act-1.0"

WORK_TYPES = (
    "literary",
    "software",
    "visual_art",
    "photograph",
    "audiovisual",
    "sound_recording",
    "musical",
    "dramatic",
    "architectural",
    "other",
)


@dataclass(slots=True)
class Author:
    name: str
    death_year: int | None = None


@dataclass(slots=True)
class TermResult:
    status: str  # "calculated" | "ongoing" | "manual_review"
    expires_on: date | None
    basis: str
    authority: str
    notes: list[str] = field(default_factory=list)


@dataclass(slots=True)
class RegistrationPosture:
    status: str  # "protected" | "window_open" | "window_missed" | "unpublished" | "not_applicable"
    deadline: date | None
    summary: str
    consequences: list[str] = field(default_factory=list)


def term(
    *,
    created_on: date | None,
    published_on: date | None,
    made_for_hire: bool,
    anonymous: bool,
    authors: list[Author],
) -> TermResult:
    if created_on is None:
        return TermResult(
            "manual_review",
            None,
            "No creation date is recorded, so the term cannot be determined.",
            "17 U.S.C. §302",
        )

    if created_on.year < 1978:
        return TermResult(
            "manual_review",
            None,
            "Created before 1978. The term depends on publication, copyright notice and "
            "renewal history under the 1909 Act, which dates alone cannot establish.",
            "17 U.S.C. §§303, 304",
        )

    notes: list[str] = []

    if made_for_hire or anonymous:
        from_creation = created_on.year + 120
        if published_on is None:
            expiry_year = from_creation
            basis = "Work made for hire or anonymous, unpublished: 120 years from creation."
        else:
            from_publication = published_on.year + 95
            expiry_year = min(from_publication, from_creation)
            which = "publication" if from_publication <= from_creation else "creation"
            basis = (
                "Work made for hire or anonymous: 95 years from first publication or 120 "
                f"years from creation, whichever expires first (here, {which})."
            )
        notes.append("All terms run to the end of the calendar year in which they would expire.")
        return TermResult(
            "calculated",
            end_of_year(expiry_year),
            basis,
            "17 U.S.C. §302(c), §305",
            notes,
        )

    if not authors:
        return TermResult(
            "manual_review",
            None,
            "Not a work made for hire and no authors are recorded, so the term cannot be "
            "measured from an author's life.",
            "17 U.S.C. §302(a)",
        )

    living = [author.name for author in authors if author.death_year is None]
    if living:
        return TermResult(
            "ongoing",
            None,
            "Life of the last surviving author plus 70 years. At least one author has no "
            "recorded year of death, so the expiry is not yet fixed.",
            "17 U.S.C. §302(a), (b), §305",
            [f"No year of death recorded for: {', '.join(living)}."],
        )

    last_death = max(author.death_year for author in authors if author.death_year)
    basis = (
        "Joint work: 70 years after the death of the last surviving author."
        if len(authors) > 1
        else "70 years after the death of the author."
    )
    return TermResult(
        "calculated",
        end_of_year(last_death + 70),
        basis,
        "17 U.S.C. §302(a), (b), §305",
        ["All terms run to the end of the calendar year in which they would expire."],
    )


def registration_posture(
    *,
    published_on: date | None,
    registered_on: date | None,
    us_work: bool,
    today: date | None = None,
) -> RegistrationPosture:
    """Whether registration timing still preserves statutory damages.

    The single most valuable copyright deadline most teams do not track: in the
    US, statutory damages and attorney's fees are only available if the work was
    registered before the infringement began, OR within three months of first
    publication. Miss that window and a later infringer can be pursued for
    actual damages only -- often not worth the cost of the suit.
    """
    today = today or date.today()
    consequences: list[str] = []

    if us_work and registered_on is None:
        consequences.append(
            "A US work must be registered (or refused) before an infringement suit can be "
            "filed. 17 U.S.C. §411(a)."
        )

    if published_on is None:
        return RegistrationPosture(
            "unpublished",
            None,
            "Unpublished. Statutory damages require registration before an infringement "
            "begins, so register before the work is shared.",
            consequences,
        )

    window_closes = add_months(published_on, 3)

    if registered_on is not None:
        if registered_on <= window_closes:
            return RegistrationPosture(
                "protected",
                None,
                "Registered within three months of first publication: statutory damages and "
                "attorney's fees are available regardless of when infringement began.",
                consequences,
            )
        return RegistrationPosture(
            "protected",
            None,
            f"Registered after the three-month window. Statutory damages are available only "
            f"for infringement that began after {registered_on.isoformat()}.",
            consequences,
        )

    if today <= window_closes:
        days = (window_closes - today).days
        return RegistrationPosture(
            "window_open",
            window_closes,
            f"Register by {window_closes.isoformat()} ({days} days) to keep statutory damages "
            f"available for any infringement since publication.",
            consequences,
        )

    consequences.append(
        "Statutory damages and attorney's fees will not be available for infringement that "
        "began before registration. 17 U.S.C. §412."
    )
    return RegistrationPosture(
        "window_missed",
        None,
        f"The three-month window closed on {window_closes.isoformat()}. Registering now "
        f"still protects against infringement that begins afterwards.",
        consequences,
    )
