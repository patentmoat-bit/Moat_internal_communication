from __future__ import annotations

import re
from dataclasses import dataclass

from moat_api.core import telemetry
from moat_api.services.search import query as search_query

# Recorded on every run. Change this whenever extraction behaviour changes, or
# past results become impossible to interpret.
CONCEPT_EXTRACTION_VERSION = "phrase-heuristic@1.0"

MAX_CONCEPTS = 8
MAX_EVIDENCE = 12

# Words that carry no discriminating power in patent prose. Keeping this small
# and visible beats an opaque model for a baseline whose job is to be explainable.
STOPWORDS = frozenset(
    [
        "a", "an", "the", "and", "or", "of", "for", "to", "in", "on", "at", "by", "with", "from",
        "as", "is", "are", "be", "being", "been", "that", "this", "these", "those", "which",
        "where", "when", "while", "it", "its", "into", "than", "then", "so", "such", "may", "can",
        "could", "would", "should", "shall", "will", "method", "system", "apparatus", "device",
        "means", "configured", "wherein", "comprising", "said", "plurality", "one", "two",
        "first", "second", "embodiment", "invention", "present", "according", "thereof",
        "therein", "herein",
    ]
)


@dataclass(frozen=True, slots=True)
class Concept:
    label: str
    query: str


@dataclass(frozen=True, slots=True)
class Hit:
    hit: search_query.SearchHit
    score: float
    passage: str
    matched_concepts: list[str]


def extract_concepts(*texts: str) -> list[Concept]:
    """Pull candidate technical concepts out of a disclosure.

    A deliberately simple, inspectable heuristic: consecutive runs of
    content-bearing words, longest first. It is a baseline, not a claim about
    understanding the invention -- which is exactly why the UI labels what
    produced each concept.
    """
    blob = " ".join(t for t in texts if t)
    tokens = re.findall(r"[A-Za-z][A-Za-z0-9\-]{2,}", blob.lower())

    phrases: list[list[str]] = []
    run: list[str] = []
    for token in tokens:
        if token in STOPWORDS:
            if len(run) >= 2:
                phrases.append(run)
            run = []
        else:
            run.append(token)
    if len(run) >= 2:
        phrases.append(run)

    seen: set[str] = set()
    concepts: list[Concept] = []
    # Longer phrases are more specific, so they earn their place first.
    for phrase in sorted(phrases, key=len, reverse=True):
        words = phrase[:5]
        label = " ".join(words)
        key = " ".join(sorted(words))
        if key in seen or len(words) < 2:
            continue
        seen.add(key)
        concepts.append(Concept(label=label, query=" & ".join(words)))
        if len(concepts) >= MAX_CONCEPTS:
            break
    return concepts


def _snippet(hit: search_query.SearchHit, terms: set[str]) -> str:
    """The sentence that best justifies the match, so a reader can judge the
    hit without opening the document.

    Prefers the engine's own highlight fragment: it reflects what actually
    matched, including stemming this code does not reimplement.
    """
    if hit.highlights:
        fragment = hit.highlights[0].strip()
        if fragment:
            return fragment if len(fragment) <= 420 else fragment[:417] + "\u2026"

    body = hit.abstract or hit.claims_text or hit.title
    sentences = re.split(r"(?<=[.;])\s+", body)
    best, best_overlap = sentences[0] if sentences else body, 0
    for sentence in sentences:
        words = set(re.findall(r"[a-z][a-z0-9\-]{2,}", sentence.lower()))
        overlap = len(words & terms)
        if overlap > best_overlap:
            best, best_overlap = sentence, overlap
    snippet = best.strip()
    return snippet if len(snippet) <= 420 else snippet[:417] + "\u2026"


async def search(concepts: list[Concept], full_text: str) -> tuple[list[Hit], str]:
    """Retrieve prior art for a disclosure.

    One query over the whole disclosure rather than one per concept: hybrid
    retrieval already handles a long multi-topic query, and N queries would
    multiply cluster load for a worse result. Per-concept coverage is then
    computed from the documents that came back.

    Returns the hits and the retrieval version that produced them, so the
    stored run can say exactly how it was obtained.
    """
    if not concepts and not full_text.strip():
        return [], "none"

    # Concept labels first: they are the distinctive phrases. The remaining
    # text follows, truncated to stay inside the query complexity cap.
    query_text = " ".join([c.label for c in concepts] + [full_text])[
        : search_query.MAX_QUERY_CHARS
    ]
    words = re.findall(r"\w+", query_text)
    if len(words) > search_query.MAX_TERMS:
        query_text = " ".join(words[: search_query.MAX_TERMS])

    try:
        hits, version = await search_query.search(query_text, size=MAX_EVIDENCE)
    except Exception:
        telemetry.search_queries.labels("unavailable", "unknown").inc()
        raise
    telemetry.search_queries.labels("ok" if hits else "empty", version).inc()

    terms = {word for concept in concepts for word in concept.query.split(" & ")}
    results: list[Hit] = []
    for hit in hits:
        haystack = " ".join([hit.title, hit.abstract, hit.claims_text]).lower()
        matched = [
            concept.label
            for concept in concepts
            if all(word in haystack for word in concept.query.split(" & "))
        ]
        results.append(
            Hit(
                hit=hit,
                score=hit.score,
                passage=_snippet(hit, terms),
                matched_concepts=matched,
            )
        )
    return results, version
