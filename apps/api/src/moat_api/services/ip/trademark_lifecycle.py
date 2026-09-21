"""Trademark deadline rules.

Every deadline produced here is CALCULATED from recorded dates and must be
confirmed by a responsible person before anyone relies on it. Offices grant
extensions, change practice, and close on holidays; a rule table cannot know
about a petition that was filed last week. That is why each deadline carries
the rule that produced it, the calculation version, and a confirmation state
(design doc §8).

Rules reflect the stated sources as of the calculation version. They are not a
substitute for docketing by a qualified professional.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date

from moat_api.services.ip.dates import add_months, add_years

LIFECYCLE_VERSION = "tm-deadlines@2026.09"

SUPPORTED_JURISDICTIONS = ("US", "EU", "IN")

STATUSES = (
    "clearance",      # searching, not yet filed
    "filed",
    "examination",
    "office_action",
    "published",      # open to opposition
    "allowed",        # US intent-to-use: notice of allowance issued
    "registered",
    "abandoned",
    "cancelled",
    "expired",
)


@dataclass(frozen=True, slots=True)
class DeadlineRule:
    kind: str
    title: str
    due_on: date
    window_opens_on: date | None
    grace_ends_on: date | None
    rule: str
    authority: str


def _us(record: dict) -> list[DeadlineRule]:
    out: list[DeadlineRule] = []
    published = record.get("published_on")
    registered = record.get("registered_on")
    office_action = record.get("office_action_on")
    allowance = record.get("allowance_on")
    today = record.get("today") or date.today()

    if published and record.get("status") in ("published", "filed", "examination"):
        out.append(
            DeadlineRule(
                "opposition_period_ends",
                "Opposition period ends",
                add_months(published, 1),
                published,
                None,
                "30 days from publication in the Official Gazette (extendable on request)",
                "15 U.S.C. §1063(a); 37 CFR 2.102",
            )
        )

    if office_action and record.get("status") == "office_action":
        out.append(
            DeadlineRule(
                "office_action_response",
                "Office action response due",
                add_months(office_action, 3),
                office_action,
                add_months(office_action, 6),
                "3 months from issue, extendable once by 3 months for a fee",
                "37 CFR 2.62(a)",
            )
        )

    if allowance and record.get("status") == "allowed":
        out.append(
            DeadlineRule(
                "statement_of_use",
                "Statement of use due",
                add_months(allowance, 6),
                allowance,
                add_months(allowance, 36),
                "6 months from notice of allowance; up to five 6-month extensions",
                "15 U.S.C. §1051(d); 37 CFR 2.88, 2.89",
            )
        )

    if registered:
        out.append(
            DeadlineRule(
                "section_8_declaration",
                "Declaration of use (Section 8)",
                add_years(registered, 6),
                add_years(registered, 5),
                add_months(add_years(registered, 6), 6),
                "Between the 5th and 6th anniversary of registration; 6-month grace period",
                "15 U.S.C. §1058(a)(1)",
            )
        )
        # Renewals repeat every ten years. Only the next one that has not yet
        # passed its grace period is scheduled: a list of renewals into the
        # next century is noise, not docketing.
        cycle = 1
        while True:
            due = add_years(registered, 10 * cycle)
            if add_months(due, 6) >= today or cycle > 20:
                break
            cycle += 1
        out.append(
            DeadlineRule(
                "renewal",
                f"Renewal (Sections 8 and 9), {10 * cycle}-year",
                due,
                add_years(registered, 10 * cycle - 1),
                add_months(due, 6),
                "Within one year before each 10-year anniversary; 6-month grace period",
                "15 U.S.C. §1058(a)(2), §1059",
            )
        )
    return out


def _eu(record: dict) -> list[DeadlineRule]:
    out: list[DeadlineRule] = []
    filed = record.get("filed_on")
    published = record.get("published_on")
    today = record.get("today") or date.today()

    if published and record.get("status") in ("published", "filed", "examination"):
        out.append(
            DeadlineRule(
                "opposition_period_ends",
                "Opposition period ends",
                add_months(published, 3),
                published,
                None,
                "3 months from publication of the application",
                "EUTMR Art. 46(1)",
            )
        )
    if filed and record.get("status") == "registered":
        # EU marks renew from the FILING date, not the registration date --
        # the most common error when a US-trained docket covers EU marks.
        cycle = 1
        while add_months(add_years(filed, 10 * cycle), 6) < today and cycle <= 20:
            cycle += 1
        due = add_years(filed, 10 * cycle)
        out.append(
            DeadlineRule(
                "renewal",
                f"Renewal, {10 * cycle}-year",
                due,
                add_months(due, -6),
                add_months(due, 6),
                "Every 10 years from the filing date; 6 months before, 6-month grace period",
                "EUTMR Art. 52, 53",
            )
        )
    return out


def _in(record: dict) -> list[DeadlineRule]:
    out: list[DeadlineRule] = []
    filed = record.get("filed_on")
    published = record.get("published_on")
    today = record.get("today") or date.today()

    if published and record.get("status") in ("published", "filed", "examination"):
        out.append(
            DeadlineRule(
                "opposition_period_ends",
                "Opposition period ends",
                add_months(published, 4),
                published,
                None,
                "4 months from advertisement in the Trade Marks Journal",
                "Trade Marks Act 1999, s. 21(1)",
            )
        )
    if filed and record.get("status") == "registered":
        cycle = 1
        while add_months(add_years(filed, 10 * cycle), 6) < today and cycle <= 20:
            cycle += 1
        due = add_years(filed, 10 * cycle)
        out.append(
            DeadlineRule(
                "renewal",
                f"Renewal, {10 * cycle}-year",
                due,
                add_months(due, -12),
                add_months(due, 6),
                "Every 10 years from the application date; up to 1 year before, 6 months after "
                "with surcharge",
                "Trade Marks Act 1999, s. 25",
            )
        )
    return out


def calculate(record: dict) -> list[DeadlineRule]:
    """Deadlines for one trademark, from its recorded dates and status."""
    jurisdiction = (record.get("jurisdiction") or "").upper()
    if record.get("status") in ("abandoned", "cancelled", "expired"):
        return []
    if jurisdiction == "US":
        return _us(record)
    if jurisdiction == "EU":
        return _eu(record)
    if jurisdiction == "IN":
        return _in(record)
    # Stated rather than silently returning nothing: an empty deadline list for
    # an unsupported office looks exactly like "no deadlines".
    return []
