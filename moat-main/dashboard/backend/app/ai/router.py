from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.patent import Patent
from app.repositories.patent_repository import PatentRepository
from app.ai.schemas import (
    SummarizationRequest,
    SummarizationResponse,
    SimilarityRequest,
    SimilarityResponse,
    SimilarityResult,
    FeatureExtractionRequest,
    FeatureExtractionResponse,
    ExtractedFeature,
    SemanticSearchRequest,
    SemanticSearchResponse,
    SemanticSearchResult,
    PriorArtRequest,
    PriorArtResponse,
    PriorArtResult,
    ChatRequest,
    ChatResponse,
    InsightsRequest,
    InsightsResponse,
    InsightPoint,
)
from app.ai.summarization import generate_summary
from app.ai.similarity import find_similar, find_prior_art
from app.ai.feature_extraction import extract_features
from app.ai.embeddings import search_semantic
from app.ai.chat import generate_chat_response
from app.core.logging import logger

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/summarize", response_model=SummarizationResponse)
async def summarize_patent(
    request: SummarizationRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    patent_repo = PatentRepository(db)
    patent = await patent_repo.get(request.patent_id)
    if not patent:
        raise HTTPException(status_code=404, detail="Patent not found")

    result = await generate_summary(patent, max_length=request.max_length)

    return SummarizationResponse(
        patent_id=str(patent.id),
        patent_number=patent.patent_number or "",
        title=patent.title or "",
        summary=result.get("summary", ""),
        key_innovations=result.get("key_innovations", []),
        technical_domain=result.get("technical_domain", "General"),
    )


@router.post("/similarity", response_model=SimilarityResponse)
async def find_similar_patents(
    request: SimilarityRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    patent_repo = PatentRepository(db)
    source = await patent_repo.get(request.patent_id)
    if not source:
        raise HTTPException(status_code=404, detail="Source patent not found")

    claims_text = None
    if source.claims:
        if isinstance(source.claims, list):
            claims_text = " ".join(str(c) for c in source.claims[:5])
        else:
            claims_text = str(source.claims)

    results = await find_similar(
        source_patent_id=str(source.id),
        source_patent_number=source.patent_number or "",
        source_title=source.title or "",
        source_abstract=source.abstract or "",
        source_claims=claims_text,
        compare_to_ids=request.compare_to,
        limit=request.limit,
        min_score=request.min_score,
    )

    return SimilarityResponse(
        source_patent_id=str(source.id),
        source_patent_number=source.patent_number or "",
        results=[
            SimilarityResult(
                patent_id=r["patent_id"],
                patent_number=r["patent_number"],
                title=r["title"],
                similarity_score=r["similarity_score"],
                semantic_overlap=r.get("semantic_overlap", ""),
            )
            for r in results
        ],
    )


@router.post("/features", response_model=FeatureExtractionResponse)
async def extract_patent_features(
    request: FeatureExtractionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    patent_repo = PatentRepository(db)
    patent = await patent_repo.get(request.patent_id)
    if not patent:
        raise HTTPException(status_code=404, detail="Patent not found")

    result = await extract_features(patent)

    return FeatureExtractionResponse(
        patent_id=str(patent.id),
        patent_number=patent.patent_number or "",
        title=patent.title or "",
        features=[
            ExtractedFeature(
                feature=f.get("feature", ""),
                category=f.get("category", "General"),
                relevance=f.get("relevance", 0.5),
                description=f.get("description", ""),
            )
            for f in result.get("features", [])
        ],
        technology_domain=result.get("technology_domain", "General"),
        innovation_level=result.get("innovation_level", "incremental"),
    )


@router.post("/semantic-search", response_model=SemanticSearchResponse)
async def semantic_search(
    request: SemanticSearchRequest,
    current_user: User = Depends(get_current_user),
):
    results = await search_semantic(
        query=request.query,
        limit=request.limit,
        filters=request.filters,
    )

    return SemanticSearchResponse(
        query=request.query,
        results=[
            SemanticSearchResult(
                patent_id=r["patent_id"],
                patent_number=r["patent_number"],
                title=r["title"],
                abstract=r.get("abstract", ""),
                score=r.get("score", 0.0),
            )
            for r in results
        ],
        total=len(results),
    )


@router.post("/prior-art", response_model=PriorArtResponse)
async def find_prior_art_patents(
    request: PriorArtRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    patent_repo = PatentRepository(db)
    patent = await patent_repo.get(request.patent_id)
    if not patent:
        raise HTTPException(status_code=404, detail="Patent not found")

    patent_dict = {
        "id": str(patent.id),
        "title": patent.title or "",
        "abstract": patent.abstract or "",
        "claims": patent.claims or "",
        "filing_date": str(patent.filing_date or ""),
    }

    results, total = await find_prior_art(
        patent=patent_dict,
        limit=request.limit,
        min_year=request.min_year,
        max_year=request.max_year,
    )

    return PriorArtResponse(
        source_patent_id=str(patent.id),
        source_patent_number=patent.patent_number or "",
        source_title=patent.title or "",
        results=[
            PriorArtResult(**r) for r in results
        ],
        total_found=total,
    )


@router.post("/chat", response_model=ChatResponse)
async def chat_with_patent(
    request: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    patent_repo = PatentRepository(db)
    patent = await patent_repo.get(request.patent_id)
    if not patent:
        raise HTTPException(status_code=404, detail="Patent not found")

    # Combine text for context
    context = []
    if patent.title:
        context.append(f"Title: {patent.title}")
    if patent.abstract:
        context.append(f"Abstract: {patent.abstract}")
    if patent.claims:
        context.append(f"Claims: {patent.claims}")
    
    patent_text = "\n\n".join(context)
    
    response = await generate_chat_response(patent_text, request.messages)
    
    return ChatResponse(response=response)


@router.post("/insights", response_model=InsightsResponse)
async def generate_insights(
    request: InsightsRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from datetime import datetime
    patent_repo = PatentRepository(db)
    
    # Gather patent text snippets
    snippets: list[str] = []
    for pid in request.patent_ids[:5]:  # cap at 5 to keep prompt small
        patent = await patent_repo.get(pid)
        if patent:
            snippets.append(f"- {patent.patent_number}: {patent.title}. {(patent.abstract or '')[:300]}")
    
    context_block = "\n".join(snippets) if snippets else (request.context or "General patent portfolio")
    
    system = (
        "You are a strategic patent intelligence analyst. "
        "Based on the provided patent data, generate a concise intelligence report with exactly 3 bullet points. "
        "Return JSON with fields: headline (string), points (array of 3 objects with title, detail, type). "
        "Types are: opportunity, risk, or trend. Be specific and actionable."
    )
    user_msg = f"Analyze these patents and provide strategic insights:\n\n{context_block}"
    
    try:
        raw = await generate_chat_response(
            context_block,
            [{"role": "user", "content": user_msg + '\n\nRespond with valid JSON only.'}]
        )
        import json, re
        json_match = re.search(r'\{.*\}', raw, re.DOTALL)
        if json_match:
            parsed = json.loads(json_match.group())
            points = [
                InsightPoint(title=p.get("title", ""), detail=p.get("detail", ""), type=p.get("type", "trend"))
                for p in parsed.get("points", [])[:3]
            ]
        else:
            raise ValueError("no json")
    except Exception:
        points = [
            InsightPoint(title="Portfolio Analysis", detail="AI analysis unavailable. Ensure OpenAI API key is configured.", type="trend"),
        ]
        parsed = {"headline": "Patent Portfolio Overview"}
    
    return InsightsResponse(
        headline=parsed.get("headline", "Patent Intelligence Report"),
        points=points,
        generated_at=datetime.utcnow().isoformat(),
    )


@router.get("/health")
async def ai_health():
    from app.ai.client import get_weaviate_client, get_openai_client
    weaviate = get_weaviate_client()
    openai = get_openai_client()

    return {
        "openai_configured": openai is not None,
        "weaviate_connected": weaviate is not None and weaviate.is_ready(),
    }
