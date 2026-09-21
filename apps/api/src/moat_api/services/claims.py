"""Claim set validation and analysis.

Everything here is a drafting aid, not a legal opinion. Each finding names the
rule it came from and the text that triggered it, so a drafter can judge it
rather than trust it. A checker that is confidently wrong about claim scope is
worse than no checker at all.
"""

from __future__ import annotations

import re
from collections import defaultdict, deque
from dataclasses import dataclass, field
from enum import StrEnum

CHECKER_VERSION = "claim-checks@1.0"

# 37 CFR 1.75(c) and the USPTO fee schedule. Exceeding these is legal but
# costs money, so it is a warning rather than an error.
FREE_INDEPENDENT_CLAIMS = 3
FREE_TOTAL_CLAIMS = 20

# Open-ended transitions admit unrecited elements; closed ones do not. The
# difference decides whether a competitor adding one component escapes the
# claim, so it is surfaced explicitly rather than left in the prose.
OPEN_TRANSITIONS = {"comprising", "including", "containing", "having"}
CLOSED_TRANSITIONS = {"consisting of", "consisting essentially of"}


class Severity(StrEnum):
    ERROR = "error"      # would be rejected, or is structurally invalid
    WARNING = "warning"  # legal but costly, or likely a drafting mistake
    INFO = "info"        # worth knowing


@dataclass(frozen=True, slots=True)
class Finding:
    code: str
    severity: Severity
    message: str
    # The rule this comes from. A finding a drafter cannot trace to a rule is
    # a finding they cannot act on.
    authority: str = ""
    claim_number: int | None = None
    excerpt: str = ""


@dataclass(slots=True)
class ClaimInput:
    number: int
    kind: str
    category: str
    preamble: str
    transition: str
    body: str
    depends_on: list[int] = field(default_factory=list)

    @property
    def text(self) -> str:
        transition = f" {self.transition}" if self.transition else ""
        return f"{self.preamble}{transition}: {self.body}".strip()


# --------------------------------------------------------------------------
# Structural validation
# --------------------------------------------------------------------------


def validate_structure(claims: list[ClaimInput]) -> list[Finding]:
    """Rules a claim set must satisfy to be structurally coherent.

    These are refused at the API rather than warned about: a set with a
    dependency cycle or a claim depending on a later claim is not a claim set
    with a problem, it is not a claim set.
    """
    findings: list[Finding] = []
    if not claims:
        return [
            Finding(
                "empty_set",
                Severity.ERROR,
                "A claim set must contain at least one claim.",
                authority="35 U.S.C. §112(b)",
            )
        ]

    by_number = {claim.number: claim for claim in claims}
    numbers = sorted(by_number)

    # Numbering must be 1..n with no gaps. Gaps are how a claim silently goes
    # missing between drafting and filing.
    expected = list(range(1, len(claims) + 1))
    if numbers != expected:
        findings.append(
            Finding(
                "numbering",
                Severity.ERROR,
                f"Claims must be numbered consecutively from 1. Found: "
                f"{', '.join(str(n) for n in numbers)}.",
                authority="37 CFR 1.126",
            )
        )

    independents = [c for c in claims if c.kind == "independent"]
    if not independents:
        findings.append(
            Finding(
                "no_independent",
                Severity.ERROR,
                "A claim set needs at least one independent claim.",
                authority="37 CFR 1.75(c)",
            )
        )

    for claim in claims:
        if claim.kind == "independent" and claim.depends_on:
            findings.append(
                Finding(
                    "independent_with_parent",
                    Severity.ERROR,
                    f"Claim {claim.number} is marked independent but refers to "
                    f"claim {', '.join(str(n) for n in claim.depends_on)}.",
                    authority="37 CFR 1.75(c)",
                    claim_number=claim.number,
                )
            )

        if claim.kind == "dependent":
            if not claim.depends_on:
                findings.append(
                    Finding(
                        "dependent_without_parent",
                        Severity.ERROR,
                        f"Claim {claim.number} is dependent but refers to no earlier claim.",
                        authority="37 CFR 1.75(c)",
                        claim_number=claim.number,
                    )
                )
            for parent in claim.depends_on:
                if parent not in by_number:
                    findings.append(
                        Finding(
                            "missing_parent",
                            Severity.ERROR,
                            f"Claim {claim.number} refers to claim {parent}, which "
                            f"is not in this set.",
                            claim_number=claim.number,
                        )
                    )
                elif parent >= claim.number:
                    # A claim referring forward cannot be read in order, and
                    # the patent offices reject it.
                    findings.append(
                        Finding(
                            "forward_reference",
                            Severity.ERROR,
                            f"Claim {claim.number} refers to claim {parent}. A claim "
                            f"may only refer back to a lower-numbered claim.",
                            authority="37 CFR 1.75(c)",
                            claim_number=claim.number,
                        )
                    )

        # A multiple dependent claim may not depend on another multiple
        # dependent claim.
        if len(claim.depends_on) > 1:
            for parent in claim.depends_on:
                parent_claim = by_number.get(parent)
                if parent_claim and len(parent_claim.depends_on) > 1:
                    findings.append(
                        Finding(
                            "multiple_on_multiple",
                            Severity.ERROR,
                            f"Claim {claim.number} is a multiple dependent claim that "
                            f"refers to claim {parent}, itself multiple dependent.",
                            authority="37 CFR 1.75(c)",
                            claim_number=claim.number,
                        )
                    )

    findings.extend(_detect_cycles(claims))
    return findings


def _detect_cycles(claims: list[ClaimInput]) -> list[Finding]:
    """Find dependency cycles.

    Forward references are already rejected above, which makes a cycle
    impossible in a valid set -- but validation runs on unsaved input where
    numbering may not yet be correct, and a cycle would make tree building and
    antecedent inheritance loop forever.
    """
    edges: dict[int, list[int]] = {c.number: list(c.depends_on) for c in claims}
    colour: dict[int, int] = dict.fromkeys(edges, 0)  # 0 unvisited, 1 in stack, 2 done
    findings: list[Finding] = []

    def walk(node: int, path: list[int]) -> None:
        colour[node] = 1
        for parent in edges.get(node, []):
            if parent not in colour:
                continue
            if colour[parent] == 1:
                cycle = (
                    [*path[path.index(parent) :], node, parent]
                    if parent in path
                    else [node, parent]
                )
                findings.append(
                    Finding(
                        "dependency_cycle",
                        Severity.ERROR,
                        "Claims depend on each other in a loop: "
                        + " → ".join(str(n) for n in cycle),
                        claim_number=node,
                    )
                )
            elif colour[parent] == 0:
                walk(parent, [*path, node])
        colour[node] = 2

    for number in sorted(edges):
        if colour[number] == 0:
            walk(number, [])
    return findings


# --------------------------------------------------------------------------
# Antecedent basis
# --------------------------------------------------------------------------

_WORD = re.compile(r"[A-Za-z][A-Za-z0-9\-]*")

_ARTICLES_INDEFINITE = frozenset({"a", "an"})
_ARTICLES_DEFINITE = frozenset({"the", "said"})

# Words that end an element name. Claim prose runs elements together --
# "a thermistor coupled to the winding and configured to produce a signal" --
# so without a boundary the extractor swallows the rest of the clause and then
# fails to match a term that was introduced perfectly well.
_PHRASE_ENDS = frozenset(
    {
        "a", "an", "the", "said",
        "and", "or", "of", "to", "for", "with", "in", "on", "at", "by", "from",
        "that", "which", "wherein", "whereby", "thereby", "therein", "thereof",
        "is", "are", "be", "being", "been", "was", "were", "has", "have", "had",
        "configured", "coupled", "connected", "adapted", "arranged", "operable",
        "capable", "responsive", "having", "comprising", "including", "containing",
        "when", "if", "so", "such", "as", "into", "onto", "upon", "via", "through",
        "between", "further", "also", "then", "than", "each", "least",
    }
)

# Collective nouns that introduce the real element after "of": "a plurality of
# blades" introduces blades, not a plurality. This construction appears in
# almost every patent claim, so treating "of" as a hard boundary would miss
# most of the elements in a typical set.
_COLLECTIVES = frozenset(
    {"plurality", "number", "set", "group", "series", "pair", "array", "multitude",
     "collection", "sequence", "portion", "part", "subset"}
)

# Element names longer than this are almost always the extractor running on.
_MAX_PHRASE_WORDS = 4

# Phrases that use "the" without needing an antecedent. Without this the
# checker produces so much noise that a drafter stops reading it, which is
# worse than not having it.
_NO_ANTECEDENT_NEEDED = frozenset(
    {
        "art", "invention", "same", "like", "prior art", "present invention",
        "group consisting", "group", "claim", "preceding claims", "preceding claim",
        "art of record", "case", "other", "others", "following", "above", "first",
        "second", "third", "one", "ones", "extent", "order", "time", "number",
        "amount", "type", "kind", "use", "person", "art unit", "steps", "step",
    }
)

_PLURAL_EXCEPTIONS = {"gas", "bias", "lens", "series", "apparatus", "process", "status"}


def _normalise(phrase: str) -> str:
    """Lowercase, collapse spaces, and crudely singularise the head noun.

    Crude on purpose: a full lemmatiser would pull in a model and a download
    for a gain that does not change the finding in practice.
    """
    words = phrase.lower().split()
    if not words:
        return ""
    head = words[-1]
    if head not in _PLURAL_EXCEPTIONS:
        if head.endswith("ies") and len(head) > 4:
            head = head[:-3] + "y"
        elif head.endswith("ses") and len(head) > 4:
            head = head[:-2]
        elif head.endswith("s") and not head.endswith("ss") and len(head) > 3:
            head = head[:-1]
    return " ".join([*words[:-1], head])


def _is_participle(word: str) -> bool:
    """Whether a word reads as a participle opening a modifying clause."""
    return len(word) > 4 and (word.endswith("ing") or word.endswith("ed"))


def _phrases_after(text: str, articles: frozenset[str]) -> list[list[str]]:
    """Element names following each of the given articles.

    Walks tokens rather than matching a regex of fixed width, so the phrase
    stops where the element name stops rather than after a fixed number of
    words.
    """
    tokens = [match.group(0).lower() for match in _WORD.finditer(text)]
    found: list[list[str]] = []
    for index, token in enumerate(tokens):
        if token not in articles:
            continue

        cursor = index + 1
        # "a plurality of blades" names blades. Step over the collective and
        # its "of" so the element itself is what gets registered.
        if (
            cursor < len(tokens)
            and tokens[cursor] in _COLLECTIVES
            and cursor + 1 < len(tokens)
            and tokens[cursor + 1] == "of"
        ):
            cursor += 2

        phrase: list[str] = []
        for follower in tokens[cursor : cursor + _MAX_PHRASE_WORDS]:
            if follower in _PHRASE_ENDS:
                break
            # A participle after the element name starts a modifying clause:
            # "a controller deriving a ceiling" names a controller, not a
            # "controller deriving". Only once at least one word has been
            # taken, because plenty of element names are themselves
            # participles -- a winding, a housing, a bearing, a coating.
            if phrase and _is_participle(follower):
                break
            phrase.append(follower)
        if phrase:
            found.append(phrase)
    return found


def _introduced_terms(text: str) -> set[str]:
    """Every element this text introduces, including its shorter forms.

    "a winding temperature sensor" can later be referred to as "the temperature
    sensor" or "the sensor", so the trailing sub-phrases are registered too.
    """
    terms: set[str] = set()
    for phrase in _phrases_after(text, _ARTICLES_INDEFINITE):
        for start in range(len(phrase)):
            terms.add(_normalise(" ".join(phrase[start:])))
    return terms


def _satisfied(phrase: list[str], known: set[str]) -> str | None:
    """Return the unmatched head if unsatisfied, or None if satisfied.

    Prefixes are tried longest-first because the extractor may still have taken
    a trailing verb ("the controller re-derives"); suffixes are tried because a
    reference may add adjectives ("the rotatable control shaft" against an
    introduced "a control shaft").
    """
    for length in range(len(phrase), 0, -1):
        candidate = _normalise(" ".join(phrase[:length]))
        if not candidate or candidate in _NO_ANTECEDENT_NEEDED or candidate in known:
            return None
    for start in range(1, len(phrase)):
        if _normalise(" ".join(phrase[start:])) in known:
            return None
    # Report the head alone: it is the most likely actual element name, and
    # quoting the over-matched clause would make the finding hard to act on.
    return phrase[0]


def check_antecedent_basis(claims: list[ClaimInput]) -> list[Finding]:
    """Flag definite references with no antecedent.

    §112(b) requires claims to point out the subject matter distinctly. A "the
    widget" that was never introduced as "a widget" is indefinite, and it is
    one of the most common grounds for an office action.

    This is a heuristic over text, not a parse of claim structure. It finds the
    common cases and will occasionally be wrong in both directions, which is
    why every finding quotes the phrase that triggered it.
    """
    by_number = {claim.number: claim for claim in claims}
    findings: list[Finding] = []

    # Terms available to each claim: its own, plus everything its ancestors
    # introduced. A dependent claim inherits its parent's elements.
    inherited: dict[int, set[str]] = {}

    def resolve(number: int, seen: frozenset[int] = frozenset()) -> set[str]:
        if number in inherited:
            return inherited[number]
        if number in seen:
            return set()  # cycle; reported separately by validate_structure
        claim = by_number.get(number)
        if claim is None:
            return set()
        terms = _introduced_terms(claim.text)
        for parent in claim.depends_on:
            terms |= resolve(parent, seen | {number})
        inherited[number] = terms
        return terms

    for claim in sorted(claims, key=lambda c: c.number):
        available = resolve(claim.number)
        # A dependent claim's preamble legitimately says "The method of claim
        # 1" -- that is a reference to the parent, not a missing element.
        body_only = claim.body if claim.kind == "dependent" else claim.text

        reported: set[str] = set()
        for phrase in _phrases_after(body_only, _ARTICLES_DEFINITE):
            head = _satisfied(phrase, available)
            if head is None or head in reported:
                continue
            reported.add(head)
            findings.append(
                Finding(
                    "antecedent_basis",
                    Severity.WARNING,
                    f'Claim {claim.number} refers to "the {head}" with no earlier '
                    f"mention introducing it.",
                    authority="35 U.S.C. §112(b)",
                    claim_number=claim.number,
                    excerpt=f"the {head}",
                )
            )
    return findings


# --------------------------------------------------------------------------
# Scope and cost
# --------------------------------------------------------------------------


def check_scope(claims: list[ClaimInput]) -> list[Finding]:
    findings: list[Finding] = []
    independents = [c for c in claims if c.kind == "independent"]

    if len(independents) > FREE_INDEPENDENT_CLAIMS:
        findings.append(
            Finding(
                "excess_independent",
                Severity.WARNING,
                f"{len(independents)} independent claims. Each beyond "
                f"{FREE_INDEPENDENT_CLAIMS} incurs an excess claim fee.",
                authority="37 CFR 1.16(h)",
            )
        )
    if len(claims) > FREE_TOTAL_CLAIMS:
        findings.append(
            Finding(
                "excess_total",
                Severity.WARNING,
                f"{len(claims)} claims. Each beyond {FREE_TOTAL_CLAIMS} incurs an "
                f"excess claim fee.",
                authority="37 CFR 1.16(i)",
            )
        )

    categories = {c.category for c in independents if c.category != "other"}
    if len(categories) == 1 and "method" in categories:
        findings.append(
            Finding(
                "single_category",
                Severity.INFO,
                "Every independent claim is a method claim. An apparatus or "
                "system claim usually covers a different infringer -- the party "
                "that makes or sells, not only the one that performs the steps.",
            )
        )

    for claim in claims:
        transition = claim.transition.strip().lower()
        if claim.kind == "independent" and transition in CLOSED_TRANSITIONS:
            findings.append(
                Finding(
                    "closed_transition",
                    Severity.WARNING,
                    f'Claim {claim.number} uses "{claim.transition}", which excludes '
                    f"unrecited elements. A competitor adding one component would "
                    f"fall outside this claim.",
                    claim_number=claim.number,
                    excerpt=claim.transition,
                )
            )
        elif claim.kind == "independent" and transition and transition not in OPEN_TRANSITIONS:
            findings.append(
                Finding(
                    "unusual_transition",
                    Severity.INFO,
                    f'Claim {claim.number} uses the transition "{claim.transition}". '
                    f"Scope may be read narrowly.",
                    claim_number=claim.number,
                    excerpt=claim.transition,
                )
            )

        if claim.kind == "dependent" and not claim.body.strip():
            findings.append(
                Finding(
                    "dependent_adds_nothing",
                    Severity.ERROR,
                    f"Claim {claim.number} depends on another claim but adds no "
                    f"limitation, so it does not narrow anything.",
                    authority="37 CFR 1.75(c)",
                    claim_number=claim.number,
                )
            )

        # Relative terms without a stated reference point are a standard
        # indefiniteness rejection.
        for vague in ("substantially", "about", "approximately", "relatively", "essentially"):
            if re.search(rf"\b{vague}\b", claim.text, re.IGNORECASE):
                findings.append(
                    Finding(
                        "relative_term",
                        Severity.INFO,
                        f'Claim {claim.number} uses "{vague}". Relative terms need a '
                        f"standard in the specification, or they invite a §112(b) "
                        f"rejection.",
                        authority="MPEP 2173.05(b)",
                        claim_number=claim.number,
                        excerpt=vague,
                    )
                )
                break

    return findings


def analyse(claims: list[ClaimInput]) -> list[Finding]:
    """Every check, most severe first."""
    findings = [
        *validate_structure(claims),
        *check_antecedent_basis(claims),
        *check_scope(claims),
    ]
    order = {Severity.ERROR: 0, Severity.WARNING: 1, Severity.INFO: 2}
    return sorted(findings, key=lambda f: (order[f.severity], f.claim_number or 0))


# --------------------------------------------------------------------------
# Tree
# --------------------------------------------------------------------------


def build_tree(claims: list[ClaimInput]) -> list[dict]:
    """Claim hierarchy as a forest, for the dependency view.

    A claim with several parents appears under each of them. That duplication
    is the honest rendering: the claim really is a narrowing of each parent,
    and collapsing it to one place would hide a dependency.
    """
    by_number = {claim.number: claim for claim in claims}
    children: dict[int, list[int]] = defaultdict(list)
    for claim in claims:
        for parent in claim.depends_on:
            children[parent].append(claim.number)

    def node(number: int, depth: int, seen: frozenset[int]) -> dict:
        claim = by_number[number]
        return {
            "number": number,
            "kind": claim.kind,
            "category": claim.category,
            "depth": depth,
            "multipleDependent": len(claim.depends_on) > 1,
            "dependsOn": sorted(claim.depends_on),
            "children": [
                node(child, depth + 1, seen | {number})
                for child in sorted(children.get(number, []))
                if child not in seen  # a cycle is reported, not recursed into
            ],
        }

    roots = [c.number for c in claims if not c.depends_on]
    return [node(number, 0, frozenset()) for number in sorted(roots)]


def coverage(claims: list[ClaimInput]) -> dict:
    """Shape of the set, for the drafter's overview."""
    independents = [c for c in claims if c.kind == "independent"]
    depths: dict[int, int] = {}
    by_number = {c.number: c for c in claims}

    queue = deque((c.number, 0) for c in independents)
    while queue:
        number, depth = queue.popleft()
        if number in depths and depths[number] <= depth:
            continue
        depths[number] = depth
        for claim in claims:
            if number in claim.depends_on:
                queue.append((claim.number, depth + 1))

    return {
        "total": len(claims),
        "independent": len(independents),
        "dependent": len(claims) - len(independents),
        "multipleDependent": sum(1 for c in claims if len(c.depends_on) > 1),
        "maxDepth": max(depths.values(), default=0),
        "categories": sorted({c.category for c in by_number.values()}),
    }
