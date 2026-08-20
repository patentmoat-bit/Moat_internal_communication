from typing import Any

from elasticsearch import AsyncElasticsearch


class ElasticsearchIndexer:
    INDEX_NAME = "patents"
    SETTINGS = {
        "settings": {
            "number_of_shards": 2,
            "number_of_replicas": 1,
            "analysis": {
                "analyzer": {
                    "patent_analyzer": {
                        "type": "custom",
                        "tokenizer": "standard",
                        "filter": ["lowercase", "stop", "snowball"],
                    },
                    "cpc_analyzer": {
                        "type": "custom",
                        "tokenizer": "pattern",
                        "pattern": "[/\\s-]+",
                    },
                }
            },
        },
        "mappings": {
            "properties": {
                "id": {"type": "keyword"},
                "patent_number": {"type": "keyword"},
                "title": {
                    "type": "text",
                    "analyzer": "patent_analyzer",
                    "fields": {"raw": {"type": "keyword"}},
                },
                "abstract": {
                    "type": "text",
                    "analyzer": "patent_analyzer",
                },
                "claims": {"type": "text", "analyzer": "patent_analyzer"},
                "inventors": {"type": "nested"},
                "assignee": {
                    "type": "text",
                    "fields": {"raw": {"type": "keyword"}},
                },
                "filing_date": {"type": "date", "format": "yyyy-MM-dd"},
                "publication_date": {"type": "date", "format": "yyyy-MM-dd"},
                "status": {"type": "keyword"},
                "cpc_classifications": {"type": "nested"},
                "ipc_classifications": {"type": "nested"},
                "citations": {"type": "nested"},
                "patent_metadata": {"type": "object", "enabled": False},
                "source": {"type": "keyword"},
                "source_format": {"type": "keyword"},
                "full_text": {"type": "text", "analyzer": "patent_analyzer"},
                "created_at": {"type": "date"},
                "updated_at": {"type": "date"},
            }
        },
    }

    def __init__(self, es_client: AsyncElasticsearch):
        self.es = es_client

    async def ensure_index(self) -> None:
        exists = await self.es.indices.exists(index=self.INDEX_NAME)
        if not exists:
            await self.es.indices.create(
                index=self.INDEX_NAME,
                body=self.SETTINGS,
            )

    async def index_patent(self, patent_data: dict) -> dict:
        await self.ensure_index()
        doc_id = patent_data.get("id")
        if not doc_id:
            raise ValueError("patent_data must contain 'id'")
        body = self._prepare_document(patent_data)
        result = await self.es.index(
            index=self.INDEX_NAME,
            id=doc_id,
            body=body,
            refresh="wait_for",
        )
        return result

    async def bulk_index(self, patents: list[dict]) -> dict:
        await self.ensure_index()
        actions = []
        for patent in patents:
            doc_id = patent.get("id")
            if not doc_id:
                continue
            body = self._prepare_document(patent)
            actions.append({"index": {"_index": self.INDEX_NAME, "_id": doc_id}})
            actions.append(body)

        if actions:
            result = await self.es.bulk(operations=actions, refresh="wait_for")
            return result
        return {"errors": False, "items": []}

    async def update_patent(self, patent_id: str, updates: dict) -> dict:
        body = {"doc": self._prepare_document(updates)}
        result = await self.es.update(
            index=self.INDEX_NAME,
            id=patent_id,
            body=body,
        )
        return result

    async def delete_patent(self, patent_id: str) -> dict:
        result = await self.es.delete(
            index=self.INDEX_NAME,
            id=patent_id,
            ignore=[404],
        )
        return result

    async def search(
        self,
        query: str | None = None,
        filters: dict | None = None,
        page: int = 1,
        page_size: int = 20,
        sort: str | None = None,
    ) -> dict:
        must_clauses = []
        filter_clauses = []

        if query:
            must_clauses.append({
                "multi_match": {
                    "query": query,
                    "fields": [
                        "title^3",
                        "abstract^2",
                        "patent_number^2",
                        "claims",
                        "full_text",
                        "assignee",
                        "inventors.name",
                    ],
                    "type": "best_fields",
                    "fuzziness": "AUTO",
                }
            })

        if filters:
            if filters.get("assignee"):
                filter_clauses.append({"term": {"assignee.raw": filters["assignee"]}})
            if filters.get("status"):
                filter_clauses.append({"term": {"status": filters["status"]}})
            if filters.get("cpc_class"):
                filter_clauses.append({
                    "nested": {
                        "path": "cpc_classifications",
                        "query": {"term": {"cpc_classifications.cpc_class": filters["cpc_class"]}},
                    }
                })
            if filters.get("ipc_class"):
                filter_clauses.append({
                    "nested": {
                        "path": "ipc_classifications",
                        "query": {"term": {"ipc_classifications.ipc_class": filters["ipc_class"]}},
                    }
                })
            if filters.get("inventor"):
                filter_clauses.append({
                    "nested": {
                        "path": "inventors",
                        "query": {"match": {"inventors.name": filters["inventor"]}},
                    }
                })
            if filters.get("date_from") or filters.get("date_to"):
                date_range = {}
                if filters.get("date_from"):
                    date_range["gte"] = filters["date_from"]
                if filters.get("date_to"):
                    date_range["lte"] = filters["date_to"]
                filter_clauses.append({"range": {"filing_date": date_range}})
            if filters.get("pub_date_from") or filters.get("pub_date_to"):
                date_range = {}
                if filters.get("pub_date_from"):
                    date_range["gte"] = filters["pub_date_from"]
                if filters.get("pub_date_to"):
                    date_range["lte"] = filters["pub_date_to"]
                filter_clauses.append({"range": {"publication_date": date_range}})

        body: dict = {"query": {"bool": {}}}
        if must_clauses:
            body["query"]["bool"]["must"] = must_clauses
        if filter_clauses:
            body["query"]["bool"]["filter"] = filter_clauses
        if not must_clauses and not filter_clauses:
            body["query"] = {"match_all": {}}

        body["from"] = (page - 1) * page_size
        body["size"] = page_size
        body["track_total_hits"] = True

        if sort:
            body["sort"] = [sort]

        response = await self.es.search(index=self.INDEX_NAME, body=body)

        hits = response["hits"]["hits"]
        total = response["hits"]["total"]["value"]

        return {
            "hits": hits,
            "total": total,
            "page": page,
            "page_size": page_size,
            "took_ms": response.get("took", 0),
        }

    async def get_aggregations(
        self, query: str | None = None
    ) -> dict:
        body: dict = {
            "size": 0,
            "aggs": {
                "statuses": {"terms": {"field": "status", "size": 20}},
                "assignees": {"terms": {"field": "assignee.raw", "size": 20}},
                "cpc_classes": {
                    "nested": {"path": "cpc_classifications"},
                    "aggs": {
                        "classes": {"terms": {"field": "cpc_classifications.cpc_class", "size": 20}}
                    },
                },
                "date_histogram": {
                    "date_histogram": {
                        "field": "filing_date",
                        "calendar_interval": "year",
                    }
                },
                "sources": {"terms": {"field": "source", "size": 10}},
            },
        }

        if query:
            body["query"] = {
                "multi_match": {
                    "query": query,
                    "fields": ["title^3", "abstract^2", "patent_number"],
                }
            }

        response = await self.es.search(index=self.INDEX_NAME, body=body)
        return response.get("aggregations", {})

    def _prepare_document(self, data: dict) -> dict:
        full_text_parts = []
        for field in ["title", "abstract", "claims"]:
            val = data.get(field)
            if isinstance(val, str):
                full_text_parts.append(val)
            elif isinstance(val, list):
                for item in val:
                    if isinstance(item, dict) and "text" in item:
                        full_text_parts.append(item["text"])
                    elif isinstance(item, str):
                        full_text_parts.append(item)

        body = {
            "id": data.get("id"),
            "patent_number": data.get("patent_number"),
            "title": data.get("title"),
            "abstract": data.get("abstract"),
            "claims": data.get("claims"),
            "inventors": data.get("inventors"),
            "assignee": data.get("assignee"),
            "filing_date": data.get("filing_date"),
            "publication_date": data.get("publication_date"),
            "status": data.get("status"),
            "cpc_classifications": data.get("cpc_classifications"),
            "ipc_classifications": data.get("ipc_classifications"),
            "citations": data.get("citations"),
            "patent_metadata": data.get("patent_metadata"),
            "source": data.get("source"),
            "source_format": data.get("source_format"),
            "full_text": " ".join(full_text_parts) if full_text_parts else None,
            "created_at": data.get("created_at"),
            "updated_at": data.get("updated_at"),
        }
        return {k: v for k, v in body.items() if v is not None}
