"""Word mark similarity screening.

Measures the three things a likelihood-of-confusion analysis looks at first --
how marks LOOK, how they SOUND, and whether the goods and services overlap --
and reports each one separately with what produced it.

This is screening. It says which registered marks deserve an attorney's
attention, and why. It is not a clearance opinion: confusion also turns on
meaning, commercial impression, the strength of the earlier mark, channels of
trade and actual marketplace evidence, none of which string comparison can
see. A clearance position is recorded by a named reviewer, exactly as a
patentability decision is.
"""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass, field

import jellyfish

from moat_api.services.ip import nice

SIMILARITY_VERSION = "tm-screen@1.0"

# Words that describe the business form, not the brand. "ACME INC" and
# "ACME LLC" are the same mark for confusion purposes.
BUSINESS_DESIGNATORS = frozenset(
    {"inc", "llc", "ltd", "limited", "corp", "corporation", "co", "company", "gmbh",
     "plc", "pvt", "private", "sa", "ag", "bv", "llp", "the"}
)

# Spelling tricks that change a mark on paper but not in the ear. Applied
# before phonetic encoding because standard encoders miss them: plain metaphone
# gives KWK for "Kwik" and KK for "Quick" -- the single most common
# sound-alike pattern in trademark disputes, found while building this.
_SOUND_RULES: tuple[tuple[str, str], ...] = (
    (r"^e(?=x)", ""),          # express -> xpress: the dropped leading E
    (r"qu", "kw"),
    (r"ck", "k"),
    (r"ph", "f"),
    (r"gh(?=t|$)", ""),       # light -> lit, night -> nit
    (r"wh", "w"),
    (r"x", "ks"),
    (r"z", "s"),
    (r"c(?=[aou]|$|[^eiy])", "k"),
    (r"q", "k"),
    (r"(ee|ea|ie|ey)", "i"),
    (r"oo", "u"),
    (r"y$", "i"),
    (r"(?<=[a-z])e$", ""),     # silent final e: lite -> lit
    (r"(.)\1+", r"\1"),        # doubled letters
)

_DIGITS = {"0": "o", "1": "one", "2": "to", "3": "three", "4": "for", "5": "five",
           "6": "six", "7": "seven", "8": "eight", "9": "nine"}


def normalise(mark: str) -> str:
    """Case, accents, punctuation and business designators removed."""
    decomposed = unicodedata.normalize("NFKD", mark)
    ascii_only = "".join(ch for ch in decomposed if not unicodedata.combining(ch))
    lowered = ascii_only.lower().replace("&", " and ")
    words = re.findall(r"[a-z0-9]+", lowered)
    return " ".join(word for word in words if word not in BUSINESS_DESIGNATORS)


def _sound_word(word: str) -> str:
    spelled = "".join(_DIGITS.get(ch, ch) for ch in word)
    for pattern, replacement in _SOUND_RULES:
        spelled = re.sub(pattern, replacement, spelled)
    return jellyfish.metaphone(spelled) if spelled else ""


def sound_key(mark: str) -> str:
    """A phonetic key for the whole mark.

    Words are also run together and encoded, so "Sun Rise" and "Sunrise"
    produce comparable keys -- spacing is invisible when a mark is spoken.
    """
    words = normalise(mark).split()
    return " ".join(filter(None, (_sound_word(word) for word in words)))


def _compact(mark: str) -> str:
    return normalise(mark).replace(" ", "")


@dataclass(slots=True)
class Factor:
    name: str
    # 0..1, where 1 is identical on this axis.
    measure: float
    finding: str
    method: str


@dataclass(slots=True)
class Screening:
    candidate: str
    band: str  # "high" | "elevated" | "low"
    factors: list[Factor] = field(default_factory=list)
    identical_classes: list[int] = field(default_factory=list)
    related_classes: list[tuple[int, int]] = field(default_factory=list)
    reasons: list[str] = field(default_factory=list)


def _sight(proposed: str, registered: str) -> Factor:
    a, b = _compact(proposed), _compact(registered)
    if not a or not b:
        return Factor("appearance", 0.0, "Nothing to compare.", "")
    distance = jellyfish.damerau_levenshtein_distance(a, b)
    edit_ratio = 1 - distance / max(len(a), len(b))
    measure = round(max(jellyfish.jaro_winkler_similarity(a, b), edit_ratio), 3)

    if a == b:
        finding = "Identical in spelling once case, spacing and punctuation are ignored."
    elif distance == 1:
        finding = f'One letter apart ("{proposed}" / "{registered}").'
    elif measure >= 0.85:
        finding = "Very close in spelling."
    elif measure >= 0.7:
        finding = "Noticeably similar in spelling."
    else:
        finding = "Different in spelling."
    return Factor(
        "appearance",
        measure,
        finding,
        "Jaro-Winkler and Damerau-Levenshtein on the normalised mark",
    )


def _sound(proposed: str, registered: str) -> Factor:
    a, b = sound_key(proposed).replace(" ", ""), sound_key(registered).replace(" ", "")
    if not a or not b:
        return Factor("sound", 0.0, "Nothing to compare.", "")
    measure = round(jellyfish.jaro_winkler_similarity(a, b), 3)
    if a == b:
        finding = "Pronounced the same."
    elif measure >= 0.88:
        finding = "Sounds very similar."
    elif measure >= 0.75:
        finding = "Some similarity in sound."
    else:
        finding = "Sounds different."
    return Factor(
        "sound",
        measure,
        finding,
        "Metaphone after trademark sound-alike rewrites (qu/kw, ph/f, c/k, silent letters)",
    )


def _containment(proposed: str, registered: str) -> Factor:
    """Whether one mark swallows the other.

    Adding a word to someone else's mark rarely avoids confusion: "MOAT CLOUD"
    against a registered "MOAT" keeps the dominant, source-identifying part.
    """
    a_words, b_words = set(normalise(proposed).split()), set(normalise(registered).split())
    if not a_words or not b_words:
        return Factor("dominant element", 0.0, "Nothing to compare.", "")
    shared = a_words & b_words
    meaningful = {word for word in shared if len(word) > 2}
    if not meaningful:
        return Factor(
            "dominant element", 0.0, "No shared distinctive word.", "Word-level overlap"
        )
    measure = round(len(meaningful) / min(len(a_words), len(b_words)), 3)
    listed = ", ".join(sorted(word.upper() for word in meaningful))
    if a_words <= b_words or b_words <= a_words:
        finding = f"One mark is contained in the other ({listed})."
    else:
        finding = f"Shares the word(s) {listed}."
    return Factor("dominant element", min(measure, 1.0), finding, "Word-level overlap")


def screen(
    proposed: str,
    proposed_classes: list[int],
    registered: str,
    registered_classes: list[int],
) -> Screening:
    sight = _sight(proposed, registered)
    sound = _sound(proposed, registered)
    contained = _containment(proposed, registered)
    identical, related = nice.overlap(proposed_classes, registered_classes)

    goods_measure = 1.0 if identical else 0.6 if related else 0.0
    if identical:
        goods_finding = f"Same class: {', '.join(map(str, identical))}."
    elif related:
        goods_finding = "Related classes: " + ", ".join(f"{x} and {y}" for x, y in related) + "."
    else:
        goods_finding = "No shared or commonly related classes."
    goods = Factor(
        "goods and services",
        goods_measure,
        goods_finding,
        f"Class overlap against {nice.NICE_EDITION}, with a related-class table",
    )

    mark_similarity = max(sight.measure, sound.measure, contained.measure)
    reasons: list[str] = []

    # The band is deliberately coarse. Three levels are enough to decide what
    # an attorney reads first; a precise-looking percentage would invite
    # someone to treat it as the answer.
    if mark_similarity >= 0.9 and (identical or related):
        band = "high"
        reasons.append("The marks are nearly identical and the goods or services overlap.")
    elif mark_similarity >= 0.8 and identical:
        band = "high"
        reasons.append("The marks are close and filed in the same class.")
    elif mark_similarity >= 0.75 and (identical or related):
        band = "elevated"
        reasons.append("The marks are similar and the goods or services are related.")
    elif mark_similarity >= 0.95:
        band = "elevated"
        reasons.append(
            "The marks are nearly identical. Different classes reduce the risk but do not "
            "remove it -- a well-known mark can be protected beyond its own classes."
        )
    else:
        band = "low"
        reasons.append("Neither the marks nor the goods and services are close.")

    for factor in (sight, sound, contained):
        if factor.measure >= 0.85:
            reasons.append(factor.finding)

    return Screening(
        candidate=registered,
        band=band,
        factors=[sight, sound, contained, goods],
        identical_classes=identical,
        related_classes=related,
        reasons=reasons,
    )


def distinctiveness_notes(mark: str) -> list[str]:
    """Obvious weaknesses a mark may have regardless of any earlier registration.

    Not the spectrum of distinctiveness -- that needs to know the goods -- only
    the patterns that most often get a word mark refused on absolute grounds.
    """
    notes: list[str] = []
    words = normalise(mark).split()
    if len(_compact(mark)) <= 2:
        notes.append("Very short marks are hard to register and hard to enforce.")
    laudatory = {"best", "super", "ultra", "premium", "quality", "smart", "pro", "prime",
                 "perfect", "top", "first", "great", "fresh", "pure"}
    hits = laudatory & set(words)
    if hits:
        notes.append(
            "Contains laudatory wording (" + ", ".join(sorted(hits)).upper() + "), which "
            "examiners often treat as descriptive."
        )
    geographic = {"india", "chennai", "american", "usa", "london", "global", "international",
                  "asia", "european", "tamil", "bengaluru"}
    if geographic & set(words):
        notes.append(
            "Contains a geographic term, which can be refused as geographically descriptive."
        )
    if all(word.isdigit() for word in words) and words:
        notes.append("Purely numeric marks usually lack inherent distinctiveness.")
    return notes
