import time

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user, get_elasticsearch_client
from app.models.user import User
from app.schemas.patent import PatentSearchResult, PatentSearchFilters
from app.schemas.search import (
    AdvancedSearchFilters,
    AdvancedSearchResult,
    SearchSuggestionResponse,
    SearchHistoryResponse,
    SearchHistoryListResponse,
    SavedSearchCreate,
    SavedSearchUpdate,
    SavedSearchResponse,
    SearchAnalyticsResponse,
)
from app.services.patent_search.service import PatentService
from app.services.patent_search.search_service import SearchService

router = APIRouter(prefix="/search", tags=["search"])


@router.get("", response_model=PatentSearchResult)
async def search_patents(
    query: str | None = Query(None),
    assignee: str | None = Query(None),
    status: str | None = Query(None),
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    cpc_class: str | None = Query(None),
    inventor: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PatentSearchResult:
    es = await get_elasticsearch_client()
    service = PatentService(db, es)
    filters = PatentSearchFilters(
        query=query,
        assignee=assignee,
        status=status,
        date_from=date_from,
        date_to=date_to,
        cpc_class=cpc_class,
        inventor=inventor,
    )
    return await service.search_patents(filters, page, page_size)


@router.post("/advanced", response_model=AdvancedSearchResult)
async def advanced_search(
    filters: AdvancedSearchFilters,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AdvancedSearchResult:
    es = await get_elasticsearch_client()
    service = SearchService(db, es)

    result = await service.advanced_search(filters, page, page_size)

    await service.save_search_history(
        user_id=current_user.id,
        query=filters.query,
        search_type=",".join(filters.search_modes or ["advanced"]),
        filters=filters.model_dump(exclude_none=True),
        result_count=result.total,
        took_ms=result.took_ms,
    )

    return result


@router.get("/suggestions", response_model=SearchSuggestionResponse)
async def get_search_suggestions(
    query: str | None = Query(None),
    limit: int = Query(10, ge=1, le=25),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SearchSuggestionResponse:
    service = SearchService(db)
    return await service.get_suggestions(query, limit)


@router.get("/history", response_model=SearchHistoryListResponse)
async def get_search_history(
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SearchHistoryListResponse:
    service = SearchService(db)
    return await service.get_search_history(current_user.id, limit)


@router.delete("/history", response_model=dict)
async def clear_search_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    service = SearchService(db)
    await service.clear_search_history(current_user.id)
    return {"detail": "Search history cleared"}


@router.post("/saved", response_model=SavedSearchResponse, status_code=201)
async def create_saved_search(
    data: SavedSearchCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SavedSearchResponse:
    service = SearchService(db)
    saved = await service.create_saved_search(current_user.id, data)
    return SavedSearchResponse.model_validate(saved)


@router.get("/saved", response_model=list[SavedSearchResponse])
async def get_saved_searches(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[SavedSearchResponse]:
    service = SearchService(db)
    searches = await service.get_saved_searches(current_user.id)
    return [SavedSearchResponse.model_validate(s) for s in searches]


@router.put("/saved/{search_id}", response_model=SavedSearchResponse)
async def update_saved_search(
    search_id: str,
    data: SavedSearchUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SavedSearchResponse:
    service = SearchService(db)
    saved = await service.update_saved_search(current_user.id, search_id, data)
    return SavedSearchResponse.model_validate(saved)


@router.delete("/saved/{search_id}", response_model=dict)
async def delete_saved_search(
    search_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    service = SearchService(db)
    await service.delete_saved_search(current_user.id, search_id)
    return {"detail": "Saved search deleted"}


@router.get("/analytics", response_model=SearchAnalyticsResponse)
async def get_search_analytics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SearchAnalyticsResponse:
    es = await get_elasticsearch_client()
    service = SearchService(db, es)
    return await service.get_search_analytics(current_user.id)
