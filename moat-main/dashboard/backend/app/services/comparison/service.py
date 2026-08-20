from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.patent_repository import PatentRepository
from app.models.patent import Patent
from app.ai.client import get_weaviate_client, get_openai_client
from app.ai.embeddings import PATENT_COLLECTION_NAME
from app.core.logging import logger
import weaviate.classes as wvc
from typing import Any
import json


class ComparisonService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.patent_repo = PatentRepository(db)

    async def get_patents_for_comparison(self, patent_ids: list[str]) -> list[Patent]:
        patents = []
        for pid in patent_ids:
            patent = await self.patent_repo.get(pid)
            if patent:
                patents.append(patent)
        return patents

    async def compute_claim_comparison(self, patents: list[Patent]) -> list[dict[str, Any]]:
        results = []
        for i in range(len(patents)):
            for j in range(i + 1, len(patents)):
                a, b = patents[i], patents[j]
                claims_a = self._parse_claims(a.claims)
                claims_b = self._parse_claims(b.claims)
                pairs = self._compare_claim_sets(claims_a, claims_b)
                overlapping = sum(1 for p in pairs if p["overlap_score"] > 0.3)
                results.append({
                    "source_patent_id": str(a.id),
                    "target_patent_id": str(b.id),
                    "total_source_claims": len(claims_a),
                    "total_target_claims": len(claims_b),
                    "overlapping_claims": overlapping,
                    "claim_pairs": pairs[:20],
                })
        return results

    def _parse_claims(self, claims: Any) -> list[str]:
        if not claims:
            return []
        if isinstance(claims, list):
            return [str(c) for c in claims]
        return str(claims).split("\n")

    def _compare_claim_sets(self, claims_a: list[str], claims_b: list[str]) -> list[dict]:
        pairs = []
        for i, ca in enumerate(claims_a[:15]):
            for j, cb in enumerate(claims_b[:15]):
                score = self._jaccard_similarity(ca, cb)
                if score > 0.15:
                    pairs.append({
                        "source_index": i,
                        "source_claim": ca[:200],
                        "target_index": j,
                        "target_claim": cb[:200],
                        "overlap_score": round(score, 4),
                        "overlap_type": "high" if score > 0.6 else "moderate" if score > 0.3 else "low",
                    })
        pairs.sort(key=lambda x: x["overlap_score"], reverse=True)
        return pairs[:20]

    def _jaccard_similarity(self, text_a: str, text_b: str) -> float:
        words_a = set(text_a.lower().split())
        words_b = set(text_b.lower().split())
        common = {"the", "a", "an", "of", "in", "to", "and", "is", "for",
                  "said", "comprising", "wherein", "method", "system",
                  "including", "least", "one", "plurality", "device",
                  "apparatus", "configured", "adapted", "thereof", "thereto"}
        words_a = words_a - common
        words_b = words_b - common
        if not words_a or not words_b:
            return 0.0
        intersection = words_a & words_b
        union = words_a | words_b
        return len(intersection) / len(union)

    async def compute_feature_matrix(self, patents: list[Patent]) -> list[dict[str, Any]]:
        from app.ai.feature_extraction import extract_features
        features_list = []
        for patent in patents:
            extracted = await extract_features(patent)
            features_list.append({
                "patent_id": str(patent.id),
                "features": extracted.get("features", []),
            })
        results = []
        for i in range(len(patents)):
            for j in range(i + 1, len(patents)):
                fa = features_list[i]["features"]
                fb = features_list[j]["features"]
                rows = self._build_feature_rows(fa, fb)
                overlapping = sum(1 for r in rows if r["overlap"] > 0.3)
                results.append({
                    "source_patent_id": features_list[i]["patent_id"],
                    "target_patent_id": features_list[j]["patent_id"],
                    "rows": rows,
                    "total_features": len(rows),
                    "overlapping_features": overlapping,
                })
        return results

    def _build_feature_rows(self, fa: list[dict], fb: list[dict]) -> list[dict]:
        all_features = {}
        for f in fa:
            key = f.get("feature", "").lower()
            all_features[key] = {
                "feature": f.get("feature", ""),
                "category": f.get("category", "General"),
                "source_present": True,
                "source_relevance": f.get("relevance", 0),
                "target_present": False,
                "target_relevance": None,
            }
        for f in fb:
            key = f.get("feature", "").lower()
            if key in all_features:
                all_features[key]["target_present"] = True
                all_features[key]["target_relevance"] = f.get("relevance", 0)
            else:
                all_features[key] = {
                    "feature": f.get("feature", ""),
                    "category": f.get("category", "General"),
                    "source_present": False,
                    "source_relevance": None,
                    "target_present": True,
                    "target_relevance": f.get("relevance", 0),
                }
        rows = list(all_features.values())
        for row in rows:
            src = row["source_relevance"] or 0
            tgt = row["target_relevance"] or 0
            row["overlap"] = round(min(src, tgt) / max(src, tgt, 0.01), 4)
        rows.sort(key=lambda r: r["overlap"], reverse=True)
        return rows

    async def compute_overlap_scores(self, patents: list[Patent]) -> list[dict]:
        scores = []
        texts = []
        for p in patents:
            txt = f"{p.title or ''} {p.abstract or ''}"
            texts.append(txt.lower())

        for i in range(len(patents)):
            for j in range(i + 1, len(patents)):
                set_i = set(texts[i].split())
                set_j = set(texts[j].split())
                common = {"the", "a", "an", "of", "in", "to", "and", "is", "for",
                          "with", "on", "at", "by", "from", "as", "or", "be", "this",
                          "that", "are", "was", "were", "been", "have", "has", "had",
                          "said", "comprising", "wherein", "method", "system",
                          "including", "least", "one", "plurality", "device",
                          "apparatus", "configured", "adapted", "respectively",
                          "portion", "thereof", "thereto", "therefrom", "therein"}
                set_i -= common
                set_j -= common

                word_overlap = len(set_i & set_j) / max(len(set_i | set_j), 1)

                cpc_i = set(p.cpc_classifications or [])
                cpc_j = set(patents[j].cpc_classifications or [])
                cpc_overlap = len(cpc_i & cpc_j) / max(len(cpc_i | cpc_j), 1)

                inv_i = set(i.lower() for i in (p.inventors or []))
                inv_j = set(i.lower() for i in (patents[j].inventors or []))
                inv_overlap = 1.0 if inv_i and inv_j and inv_i == inv_j else 0.0

                assignee_i = (p.assignee or "").lower()
                assignee_j = (patents[j].assignee or "").lower()
                assignee_overlap = 1.0 if assignee_i and assignee_j and assignee_i == assignee_j else 0.0

                scores.append({
                    "category": "Textual Overlap",
                    "score": round(word_overlap, 4),
                    "description": "Shared vocabulary between abstracts and titles",
                })
                scores.append({
                    "category": "Classification Overlap",
                    "score": round(cpc_overlap, 4),
                    "description": "Shared CPC classifications",
                })
                if inv_overlap > 0:
                    scores.append({
                        "category": "Inventor Overlap",
                        "score": round(inv_overlap, 4),
                        "description": "Shared inventors",
                    })
                if assignee_overlap > 0:
                    scores.append({
                        "category": "Assignee Overlap",
                        "score": round(assignee_overlap, 4),
                        "description": "Same assignee",
                    })
        return scores

    async def compute_overall_similarity(self, patents: list[Patent]) -> float:
        client = get_weaviate_client()
        if client is None:
            text_overlaps = []
            for i in range(len(patents)):
                for j in range(i + 1, len(patents)):
                    txt_i = f"{patents[i].title or ''} {patents[i].abstract or ''}"
                    txt_j = f"{patents[j].title or ''} {patents[j].abstract or ''}"
                    words_i = set(txt_i.lower().split())
                    words_j = set(txt_j.lower().split())
                    common_stop = {"the", "a", "an", "of", "in", "to", "and"}
                    words_i -= common_stop
                    words_j -= common_stop
                    if words_i and words_j:
                        overlap = len(words_i & words_j) / max(len(words_i | words_j), 1)
                        text_overlaps.append(overlap)
            return round(sum(text_overlaps) / max(len(text_overlaps), 1), 4) if text_overlaps else 0.0

        try:
            collection = client.collections.get(PATENT_COLLECTION_NAME)
            scores = []
            for i in range(len(patents)):
                for j in range(i + 1, len(patents)):
                    search_text = f"{patents[i].title or ''} {patents[i].abstract or ''}"
                    response = collection.query.near_text(
                        query=search_text,
                        limit=5,
                        return_metadata=wvc.query.MetadataQuery(certainty=True),
                    )
                    for obj in response.objects:
                        pid = obj.properties.get("patent_id", "")
                        if pid == str(patents[j].id):
                            score = obj.metadata.certainty if obj.metadata else 0.0
                            scores.append(score)
                            break
            return round(sum(scores) / max(len(scores), 1), 4) if scores else 0.0
        except Exception as e:
            logger.error(f"Vector similarity failed: {e}")
            return 0.0
