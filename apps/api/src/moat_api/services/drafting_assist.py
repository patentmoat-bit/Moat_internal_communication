"""Drafting assistance.

Deterministic, template-based generation -- not a language model. Nothing here
invents technical content: every suggestion is a restructuring of text the
drafter already wrote, which is why it can be trusted to be faithful.

That is a deliberate limit, not a placeholder. Two reasons:

  1. There is no model in this deployment. Every analysis run in this system
     records `model_version: "none"`, and shipping generation that silently
     required an external API would break that.
  2. An unfiled disclosure is a trade secret. Sending one to a third-party
     model is a decision with legal consequences for the customer, which is
     why the design doc specifies self-hosted inference for this path.

The transformations below are standard attorney practice. A Summary section
that mirrors the claims, and an abstract that restates claim 1, are how these
documents are actually written -- so generating them mechanically is faithful
to the craft rather than a shortcut around it.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

from moat_api.services.claims import ClaimInput

ASSIST_VERSION = "template-assist@1.0"

# 37 CFR 1.72(b)
ABSTRACT_WORD_LIMIT = 150

# Claim prose is written for legal precision; an abstract is written to be
# read. These are the standard substitutions between the two registers.
PLAIN_LANGUAGE = (
    (r"\bcomprising\b", "including"),
    (r"\bconsisting essentially of\b", "made substantially of"),
    (r"\bconsisting of\b", "made of"),
    # The article has to go with it: "a plurality of samples" becomes
    # "several samples", not "a several samples".
    (r"\ba\s+plurality\s+of\b", "several"),
    (r"\ban\s+plurality\s+of\b", "several"),
    (r"\bplurality\s+of\b", "several"),
    (r"\bconfigured to\b", "arranged to"),
    (r"\bwherein\b", "in which"),
    (r"\bsaid\b", "the"),
)


@dataclass(frozen=True, slots=True)
class Suggestion:
    field: str
    value: str
    # What produced it, in a sentence. A drafter must be able to see that this
    # is a restructuring of their own text, not new content.
    rationale: str
    replaces_existing: bool = False


def _clean(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip().rstrip(".;,")


def _claim_sentence(claim: ClaimInput) -> str:
    """One claim rendered as a readable sentence."""
    preamble = _clean(claim.preamble)
    transition = _clean(claim.transition)
    body = _clean(claim.body)
    parts = [part for part in (preamble, transition) if part]
    head = " ".join(parts)
    return f"{head} {body}".strip() if body else head


def _plain(text: str) -> str:
    for pattern, replacement in PLAIN_LANGUAGE:
        text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
    # Claim bodies are semicolon-separated element lists; prose is not.
    text = text.replace("; and", ", and").replace(";", ",")
    return re.sub(r"\s+", " ", text).strip()


def abstract_from_claims(claims: list[ClaimInput]) -> Suggestion | None:
    """Restate the broadest claim as an abstract.

    Standard practice: the abstract summarises what claim 1 covers, in plain
    language, within 150 words.
    """
    independents = [c for c in claims if c.kind == "independent"]
    if not independents:
        return None
    broadest = min(independents, key=lambda c: c.number)
    sentence = _plain(_claim_sentence(broadest))
    if not sentence:
        return None

    text = sentence[0].upper() + sentence[1:]
    if not text.endswith("."):
        text += "."

    words = text.split()
    if len(words) > ABSTRACT_WORD_LIMIT:
        # Trim at a sentence boundary rather than mid-clause, so the result
        # still reads as prose.
        trimmed = " ".join(words[:ABSTRACT_WORD_LIMIT])
        cut = trimmed.rfind(". ")
        text = (trimmed[: cut + 1] if cut > 40 else trimmed.rstrip(",") + ".")

    return Suggestion(
        field="abstract",
        value=text,
        rationale=(
            f"Restated from claim {broadest.number} in plain language, within the "
            f"{ABSTRACT_WORD_LIMIT}-word limit. No new technical content."
        ),
        replaces_existing=True,
    )


def summary_from_claims(claims: list[ClaimInput]) -> Suggestion | None:
    """Build the Summary section so it mirrors the claims.

    This is how the section is conventionally written: each independent claim
    becomes an "In one aspect" paragraph, each dependent an "In some
    embodiments" paragraph. Mirroring matters because §112(a) support is judged
    on whether the specification describes what the claims cover.
    """
    if not claims:
        return None

    ordered = sorted(claims, key=lambda c: c.number)
    paragraphs: list[str] = []

    for claim in ordered:
        sentence = _claim_sentence(claim)
        if not sentence:
            continue
        if claim.kind == "independent":
            opening = f"{sentence[0].lower()}{sentence[1:]}"
            paragraphs.append(f"In one aspect, there is provided {opening}.")
        else:
            parents = ", ".join(str(n) for n in claim.depends_on) or "the above"
            body = _clean(claim.body)
            if not body:
                continue
            paragraphs.append(
                f"In some embodiments of the aspect of claim {parents}, {body}."
            )

    if not paragraphs:
        return None

    return Suggestion(
        field="summary",
        value="\n\n".join(paragraphs),
        rationale=(
            "Generated from the current claim set so the Summary mirrors the claims. "
            "Section 112(a) support is judged on whether the specification describes "
            "what the claims cover."
        ),
        replaces_existing=True,
    )


def drawings_scaffold(detailed_description: str) -> Suggestion | None:
    """Scaffold the drawings section from figures already referenced."""
    figures = sorted(
        {
            int(match.group(1))
            for match in re.finditer(r"\bFIGS?\.?\s*(\d+)", detailed_description, re.IGNORECASE)
        }
    )
    if not figures:
        return None
    lines = [
        f"FIG. {number} is a diagram of ___." for number in figures
    ]
    return Suggestion(
        field="briefDescriptionOfDrawings",
        value="\n".join(lines),
        rationale=(
            f"Found {len(figures)} figure reference(s) in the detailed description. "
            f"Each needs a one-line description; fill in the blanks."
        ),
        replaces_existing=False,
    )


def claim_skeleton(title: str, concepts: list[str]) -> Suggestion | None:
    """Draft a claim 1 skeleton from the disclosure's extracted concepts.

    A skeleton, explicitly: the elements come from the inventor's own words and
    almost certainly need rewording. It saves the blank page, not the drafting.
    """
    usable = [concept for concept in concepts if concept][:6]
    if not usable:
        return None

    elements = [f"a {concept}" for concept in usable]
    body = "; ".join(elements[:-1])
    body = f"{body}; and {elements[-1]}." if len(elements) > 1 else f"{elements[0]}."

    preamble = re.sub(r"^(a|an|the)\s+", "", _clean(title), flags=re.IGNORECASE)
    return Suggestion(
        field="claim1",
        value=f"A {preamble.lower()}|comprising|{body}",
        rationale=(
            f"Skeleton built from {len(usable)} concept(s) extracted from the disclosure. "
            f"The element names are the inventor's words and will need rewording for "
            f"claim scope."
        ),
    )


def antecedent_fix(claim: ClaimInput, missing_term: str) -> Suggestion | None:
    """Suggest introducing an element that is referred to but never introduced.

    The fix for a §112(b) antecedent-basis problem is almost always to add the
    element to the independent claim, not to delete the reference.
    """
    term = missing_term.removeprefix("the ").strip()
    if not term:
        return None
    return Suggestion(
        field=f"claim{claim.number}",
        value=f"a {term}",
        rationale=(
            f'Claim {claim.number} refers to "the {term}" without introducing it. '
            f"Adding \"a {term}\" to the independent claim it depends on usually "
            f"resolves this; deleting the reference narrows the claim instead."
        ),
    )


def available() -> dict:
    """What assistance this deployment can offer, and what it cannot.

    Surfaced to the UI so a drafter is never left wondering whether a missing
    button is broken or absent by design.
    """
    return {
        "version": ASSIST_VERSION,
        "templateGeneration": True,
        # No model is configured. The UI says so rather than showing a button
        # that fails.
        "modelGeneration": False,
        "modelNote": (
            "No language model is configured in this deployment. Template assistance "
            "restructures text you already wrote and never invents technical content. "
            "Model-based drafting requires self-hosted inference, because an unfiled "
            "disclosure is a trade secret."
        ),
    }
