from __future__ import annotations

from datetime import datetime
from typing import Any

# Alias the application queries. Concrete indices are versioned behind it, so a
# rebuild is an alias cutover rather than an outage, and a bad build is rolled
# back by pointing the alias at the previous one (design doc §8).
PUBLICATIONS_ALIAS = "moat-publications"

# Normalises BM25 and vector scores onto a common range before combining them.
# Without this the two score distributions are not comparable and one silently
# dominates.
HYBRID_PIPELINE = "moat-hybrid"


def index_name(corpus_revision: str, retrieval_version: str, build: str) -> str:
    """Concrete index name, carrying what produced it and when.

    Encoding corpus and retrieval version means an operator can see from the
    index list alone which build is serving. The build stamp makes every
    rebuild a distinct index: reindexing the same corpus is a routine
    operation -- after a mapping change, a corruption, or simply to verify the
    pipeline -- and it must not collide with the index already serving.
    """
    safe = f"{corpus_revision}-{retrieval_version}".lower()
    safe = "".join(char if char.isalnum() or char in "-." else "-" for char in safe)
    return f"{PUBLICATIONS_ALIAS}-{safe}-{build}"


def build_stamp(moment: datetime) -> str:
    """Sortable, lowercase, index-name safe."""
    return moment.strftime("%Y%m%d%H%M%S")


def publication_mapping(embedding_dimensions: int) -> dict[str, Any]:
    properties: dict[str, Any] = {
        "publication_id": {"type": "keyword"},
        "title": {"type": "text", "analyzer": "english"},
        "abstract": {"type": "text", "analyzer": "english"},
        "claims_text": {"type": "text", "analyzer": "english"},
        "applicant": {
            "type": "text",
            "fields": {"raw": {"type": "keyword", "ignore_above": 256}},
        },
        "jurisdiction": {"type": "keyword"},
        "kind_code": {"type": "keyword"},
        "published_on": {"type": "date"},
        "classifications": {"type": "keyword"},
        # Leading CPC section/class, for coarse filtering without wildcards.
        "cpc_prefixes": {"type": "keyword"},
        "corpus_revision": {"type": "keyword"},
        "source": {"type": "keyword"},
    }

    settings: dict[str, Any] = {
        "index": {
            # Single shard at pilot size. Shard sizing is a measured decision in
            # phase 5, not a guess made now (design doc §13).
            "number_of_shards": 1,
            "number_of_replicas": 0,
            "refresh_interval": "1s",
        }
    }

    if embedding_dimensions > 0:
        settings["index"]["knn"] = True
        properties["embedding"] = {
            "type": "knn_vector",
            "dimension": embedding_dimensions,
            "method": {
                "name": "hnsw",
                "space_type": "cosinesimil",
                "engine": "lucene",
                "parameters": {"ef_construction": 128, "m": 16},
            },
        }

    return {"settings": settings, "mappings": {"properties": properties}}


HYBRID_PIPELINE_BODY: dict[str, Any] = {
    "description": "Normalise and combine BM25 with vector scores",
    "phase_results_processors": [
        {
            "normalization-processor": {
                "normalization": {"technique": "min_max"},
                "combination": {
                    "technique": "arithmetic_mean",
                    # Even weighting to start. Tuning this is a measurement
                    # exercise against a labelled set, not a taste decision.
                    "parameters": {"weights": [0.5, 0.5]},
                },
            }
        }
    ],
}
