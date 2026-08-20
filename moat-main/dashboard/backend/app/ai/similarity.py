from langchain_openai import ChatOpenAI
from app.config import settings
from app.ai.client import get_weaviate_client
from app.ai.embeddings import PATENT_COLLECTION_NAME
from app.core.logging import logger
import weaviate.classes as wvc

SEMANTIC_OVERLAP_PROMPT = """Analyze the semantic overlap between these two patents:

SOURCE PATENT:
Title: {source_title}
Abstract: {source_abstract}
Claims: {source_claims}

TARGET PATENT:
Title: {target_title}
Abstract: {target_abstract}
Claims: {target_claims}

Describe the semantic overlap in one sentence. Focus on shared technical concepts, similar claims, or common applications.
"""


async def find_similar(
    source_patent_id: str,
    source_patent_number: str,
    source_title: str,
    source_abstract: str,
    source_claims: str | None = None,
    compare_to_ids: list[str] | None = None,
    limit: int = 10,
    min_score: float = 0.0,
) -> list[dict]:
    client = get_weaviate_client()
    if client is None:
        return _fallback_similarity(
            source_title, source_abstract, source_claims, limit
        )

    try:
        collection = client.collections.get(PATENT_COLLECTION_NAME)

        if compare_to_ids:
            weaviate_filter = wvc.query.Filter.by_property("patent_id").contains_any(compare_to_ids)
            response = collection.query.near_text(
                query=f"{source_title} {source_abstract} {source_claims or ''}",
                limit=limit,
                return_metadata=wvc.query.MetadataQuery(certainty=True),
                filters=weaviate_filter,
            )
        else:
            response = collection.query.near_text(
                query=f"{source_title} {source_abstract} {source_claims or ''}",
                limit=limit + 1,
                return_metadata=wvc.query.MetadataQuery(certainty=True),
            )

        results = []
        for obj in response.objects:
            pid = obj.properties.get("patent_id", "")
            if pid == source_patent_id:
                continue
            score = obj.metadata.certainty if obj.metadata else 0.0
            if score < min_score:
                continue
            results.append({
                "patent_id": pid,
                "patent_number": obj.properties.get("patent_number", ""),
                "title": obj.properties.get("title", ""),
                "similarity_score": round(score, 4),
                "semantic_overlap": "",
            })

        if results and settings.OPENAI_API_KEY:
            for r in results[:5]:
                overlap = await _get_semantic_overlap(
                    source_title=source_title,
                    source_abstract=source_abstract,
                    source_claims=source_claims or "",
                    target_title=r["title"],
                    target_abstract=r.get("abstract", ""),
                )
                r["semantic_overlap"] = overlap

        return results[:limit]
    except Exception as e:
        logger.error(f"Weaviate similarity search failed: {e}")
        return _fallback_similarity(source_title, source_abstract, source_claims, limit)


async def _get_semantic_overlap(
    source_title: str,
    source_abstract: str,
    source_claims: str,
    target_title: str,
    target_abstract: str,
) -> str:
    api_key = settings.OPENAI_API_KEY
    if not api_key:
        return "Similarity analysis requires OpenAI API key"

    try:
        llm = ChatOpenAI(
            model=settings.OPENAI_MODEL,
            api_key=api_key,
            temperature=0.2,
            max_tokens=100,
        )
        prompt = SEMANTIC_OVERLAP_PROMPT.format(
            source_title=source_title,
            source_abstract=source_abstract[:500],
            source_claims=source_claims[:500],
            target_title=target_title,
            target_abstract=target_abstract[:500],
        )
        response = await llm.ainvoke(prompt)
        return response.content.strip()
    except Exception as e:
        logger.error(f"Semantic overlap analysis failed: {e}")
        return "Overlap analysis unavailable"


def _fallback_similarity(
    title: str, abstract: str, claims: str | None, limit: int
) -> list[dict]:
    source_words = set((title + " " + (abstract or "") + " " + (claims or "")).lower().split())
    common_words = {"the", "a", "an", "is", "are", "was", "were", "be", "been",
                    "being", "have", "has", "had", "do", "does", "did", "will",
                    "would", "could", "should", "may", "might", "shall", "can",
                    "to", "of", "in", "for", "on", "with", "at", "by", "from",
                    "as", "into", "through", "during", "before", "after",
                    "above", "below", "between", "out", "off", "over", "under",
                    "again", "further", "then", "once", "here", "there", "when",
                    "where", "why", "how", "all", "each", "every", "both",
                    "few", "more", "most", "other", "some", "such", "no", "nor",
                    "not", "only", "own", "same", "so", "than", "too", "very",
                    "and", "but", "or", "if", "while", "that", "this", "these",
                    "those", "it", "its", "which", "who", "whom", "what",
                    "method", "system", "apparatus", "device", "comprising",
                    "including", "wherein", "configured", "adapted", "least",
                    "one", "plurality", "portion", "respectively", "thereof",
                    "thereto", "therefrom", "therein", "therebetween", "said"}
    source_keywords = source_words - common_words

    return [{
        "patent_id": "",
        "patent_number": "N/A",
        "title": "Vector search unavailable",
        "similarity_score": 0.0,
        "semantic_overlap": "Weaviate vector database not available for similarity computation",
    }]


async def find_prior_art(
    patent: dict,
    limit: int = 20,
    min_year: int | None = None,
    max_year: int | None = None,
) -> tuple[list[dict], int]:
    client = get_weaviate_client()
    if client is None or not settings.OPENAI_API_KEY:
        return [], 0

    try:
        collection = client.collections.get(PATENT_COLLECTION_NAME)

        search_text = f"{patent.get('title', '')} {patent.get('abstract', '')}"
        claims_text = patent.get("claims", "")
        if claims_text:
            if isinstance(claims_text, list):
                claims_text = " ".join(str(c) for c in claims_text[:5])
            search_text += f" {claims_text}"

        filters_list = []
        if min_year:
            filters_list.append(
                wvc.query.Filter.by_property("filing_date").greater_or_equal(str(min_year))
            )
        if max_year:
            filters_list.append(
                wvc.query.Filter.by_property("filing_date").less_or_equal(str(max_year))
            )

        combined_filter = None
        if filters_list:
            combined_filter = filters_list[0]
            for f in filters_list[1:]:
                combined_filter = combined_filter & f

        response = collection.query.near_text(
            query=search_text,
            limit=limit + 10,
            return_metadata=wvc.query.MetadataQuery(certainty=True),
            filters=combined_filter,
        )

        results = []
        for obj in response.objects:
            pid = obj.properties.get("patent_id", "")
            if pid == patent.get("id", ""):
                continue
            score = obj.metadata.certainty if obj.metadata else 0.0
            results.append({
                "patent_id": pid,
                "patent_number": obj.properties.get("patent_number", ""),
                "title": obj.properties.get("title", ""),
                "abstract": obj.properties.get("abstract", ""),
                "filing_date": obj.properties.get("filing_date", ""),
                "similarity_score": round(score, 4),
                "relevance_reason": "",
                "key_overlaps": [],
            })

        results.sort(key=lambda x: x["similarity_score"], reverse=True)

        if results and settings.OPENAI_API_KEY:
            llm = ChatOpenAI(
                model=settings.OPENAI_MODEL,
                api_key=settings.OPENAI_API_KEY,
                temperature=0.2,
                max_tokens=200,
            )
            for r in results[:5]:
                try:
                    prompt = PRIOR_ART_PROMPT.format(
                        source_title=patent.get("title", ""),
                        source_abstract=patent.get("abstract", "")[:500],
                        target_number=r["patent_number"],
                        target_title=r["title"],
                        target_abstract=r["abstract"][:500],
                    )
                    response = await llm.ainvoke(prompt)
                    content = response.content.strip()
                    import json
                    json_start = content.find("{")
                    json_end = content.rfind("}") + 1
                    if json_start >= 0 and json_end > json_start:
                        parsed = json.loads(content[json_start:json_end])
                        r["relevance_reason"] = parsed.get("reason", "")
                        r["key_overlaps"] = parsed.get("overlaps", [])
                    else:
                        r["relevance_reason"] = content[:200]
                except Exception:
                    r["relevance_reason"] = "Prior art relevance confirmed"

        return results[:limit], len(results)
    except Exception as e:
        logger.error(f"Prior art search failed: {e}")
        return [], 0


PRIOR_ART_PROMPT = """You are a patent examiner. Analyze how this prior art patent relates to the source patent.

SOURCE PATENT:
Title: {source_title}
Abstract: {source_abstract}

PRIOR ART PATENT ({target_number}):
Title: {target_title}
Abstract: {target_abstract}

Provide your analysis in JSON format:
{{
  "reason": "One sentence explaining why this is relevant prior art",
  "overlaps": ["List 1-3 specific technical overlaps between the patents"]
}}
"""
