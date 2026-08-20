import time

from elasticsearch import AsyncElasticsearch
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.exceptions import NotFoundException, ConflictException
from app.models.patent import Patent, SavedPatent
from app.repositories.patent_repository import PatentRepository
from app.schemas.patent import PatentResponse, PatentSearchResult, PatentSearchFilters


class PatentService:
    def __init__(self, db: AsyncSession, es_client: AsyncElasticsearch | None = None) -> None:
        self.db = db
        self.es_client = es_client
        self.patent_repo = PatentRepository(db)

    async def search_patents(
        self, filters: PatentSearchFilters, page: int = 1, page_size: int = 20
    ) -> PatentSearchResult:
        start = time.perf_counter()

        if self.es_client and filters.query:
            try:
                return await self._search_with_es(filters, page, page_size)
            except Exception:
                pass

        patents, total = await self.patent_repo.search_patents(
            query=filters.query,
            assignee=filters.assignee,
            status=filters.status,
            date_from=filters.date_from,
            date_to=filters.date_to,
            cpc_class=filters.cpc_class,
            inventor=filters.inventor,
            page=page,
            page_size=page_size,
        )

        took_ms = (time.perf_counter() - start) * 1000

        return PatentSearchResult(
            patents=[PatentResponse.model_validate(p) for p in patents],
            total=total,
            page=page,
            page_size=page_size,
            took_ms=took_ms,
        )

    async def _search_with_es(
        self, filters: PatentSearchFilters, page: int, page_size: int
    ) -> PatentSearchResult:
        start = time.perf_counter()
        must_clauses = []

        if filters.query:
            must_clauses.append(
                {
                    "multi_match": {
                        "query": filters.query,
                        "fields": [
                            "title^3",
                            "abstract^2",
                            "patent_number^2",
                            "claims",
                            "cpc_classifications",
                            "ipc_classifications",
                            "assignee",
                            "inventors",
                        ],
                    }
                }
            )

        filter_clauses = []
        if filters.assignee:
            filter_clauses.append({"term": {"assignee": filters.assignee}})
        if filters.status:
            filter_clauses.append({"term": {"status": filters.status}})
        if filters.cpc_class:
            filter_clauses.append({"term": {"cpc_classifications": filters.cpc_class}})
        if filters.inventor:
            filter_clauses.append({"term": {"inventors": filters.inventor}})
        if filters.date_from:
            filter_clauses.append({"range": {"filing_date": {"gte": filters.date_from}}})
        if filters.date_to:
            filter_clauses.append({"range": {"filing_date": {"lte": filters.date_to}}})

        body: dict = {}
        if must_clauses:
            body["query"] = {"bool": {"must": must_clauses}}
            if filter_clauses:
                body["query"]["bool"]["filter"] = filter_clauses
        elif filter_clauses:
            body["query"] = {"bool": {"filter": filter_clauses}}
        else:
            body["query"] = {"match_all": {}}

        from_val = (page - 1) * page_size
        body["from"] = from_val
        body["size"] = page_size

        response = await self.es_client.search(index="patents", body=body)
        took_ms = (time.perf_counter() - start) * 1000

        hits = response["hits"]["hits"]
        total = response["hits"]["total"]["value"]

        patent_ids = [h["_id"] for h in hits]
        patents: list[Patent] = []
        if patent_ids:
            stmt = select(Patent).where(Patent.id.in_(patent_ids))
            result = await self.db.execute(stmt)
            patents_map = {p.id: p for p in result.scalars().all()}
            patents = [patents_map[pid] for pid in patent_ids if pid in patents_map]

        return PatentSearchResult(
            patents=[PatentResponse.model_validate(p) for p in patents],
            total=total,
            page=page,
            page_size=page_size,
            took_ms=took_ms,
        )

    async def get_patent(self, patent_id: str) -> Patent:
        patent = await self.patent_repo.get(patent_id)
        if not patent:
            raise NotFoundException("Patent not found")
        return patent

    async def save_patent(self, user_id: str, patent_id: str) -> SavedPatent:
        patent = await self.patent_repo.get(patent_id)
        if not patent:
            raise NotFoundException("Patent not found")

        stmt = select(SavedPatent).where(
            SavedPatent.saved_by == user_id,
            SavedPatent.patent_id == patent_id,
        )
        result = await self.db.execute(stmt)
        existing = result.scalar_one_or_none()
        if existing:
            raise ConflictException("Patent already saved")

        saved = SavedPatent(
            saved_by=user_id,
            patent_id=patent_id,
            patent_number=patent.patent_number,
        )
        self.db.add(saved)
        await self.db.flush()
        await self.db.refresh(saved)
        return saved

    async def unsave_patent(self, user_id: str, patent_id: str) -> None:
        stmt = select(SavedPatent).where(
            SavedPatent.user_id == user_id,
            SavedPatent.patent_id == patent_id,
        )
        result = await self.db.execute(stmt)
        saved = result.scalar_one_or_none()
        if not saved:
            raise NotFoundException("Saved patent not found")
        await self.db.delete(saved)
        await self.db.flush()

    async def get_saved_patents(self, user_id: str) -> list[Patent]:
        stmt = (
            select(Patent)
            .join(SavedPatent, SavedPatent.patent_id == Patent.id)
            .where(SavedPatent.user_id == user_id)
            .order_by(SavedPatent.saved_at.desc())
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())
