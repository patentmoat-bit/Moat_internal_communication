import logging
import time
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)


class IngestionPipeline:
    def __init__(self):
        self.parsers = []
        self.extractors = []
        self.indexer = None

    async def process_single(self, data: dict) -> dict:
        start = time.perf_counter()
        patent_data = data.copy()

        stage_times = {}

        stage_times["parse"] = await self._run_parse(patent_data)
        stage_times["extract"] = await self._run_extraction(patent_data)
        stage_times["validate"] = self._validate(patent_data)

        if patent_data.get("status") is None:
            patent_data["status"] = "ingested"

        patent_data["ingested_at"] = datetime.now(timezone.utc).isoformat()
        patent_data["ingestion_version"] = "2.0"

        elapsed = (time.perf_counter() - start) * 1000
        patent_data["_pipeline_time_ms"] = elapsed
        patent_data["_stage_times"] = stage_times

        logger.info(
            f"Ingested patent {patent_data.get('patent_number', 'unknown')} "
            f"in {elapsed:.1f}ms"
        )

        return patent_data

    async def process_batch(self, batch: list[dict]) -> list[dict]:
        results = []
        for item in batch:
            try:
                result = await self.process_single(item)
                results.append(result)
            except Exception as e:
                logger.error(f"Batch ingestion failed for item: {e}")
                results.append({"error": str(e), "original": item})
        return results

    async def _run_parse(self, data: dict) -> float:
        start = time.perf_counter()
        raw_text = data.get("raw_text", "")
        source_format = data.get("source_format", "")

        if raw_text and ("xml" in source_format or not source_format):
            from app.ingestion.parsers import PatentXMLParser
            try:
                parsed = await PatentXMLParser().parse(raw_text)
                for key, value in parsed.items():
                    if value is not None and key not in data or data.get(key) is None:
                        data[key] = value
            except Exception as e:
                logger.debug(f"XML parse attempt failed: {e}")

        if data.get("filename", "").lower().endswith(".pdf"):
            from app.ingestion.parsers import PDFParser
            try:
                pdf_data = {"raw_text": raw_text, "filename": data.get("filename", "")}
                parsed = await PDFParser().parse(io.BytesIO(raw_text.encode()), data.get("filename", ""))
                data["pdf_metadata"] = {
                    "pages": parsed.get("pages"),
                    "has_claims": parsed.get("has_claims"),
                }
            except Exception as e:
                logger.debug(f"PDF parse attempt failed: {e}")

        return (time.perf_counter() - start) * 1000

    async def _run_extraction(self, data: dict) -> float:
        start = time.perf_counter()
        raw_text = data.get("raw_text", "")

        if raw_text:
            from app.ingestion.extractors import MetadataExtractor
            meta_extractor = MetadataExtractor()
            meta_result = await meta_extractor.extract(raw_text, data)
            for key, value in meta_result.items():
                if value is not None and (key not in data or data.get(key) is None):
                    data[key] = value

            from app.ingestion.extractors import CitationExtractor
            cite_extractor = CitationExtractor()
            cite_result = await cite_extractor.extract(raw_text, data.get("citations"))
            if cite_result.get("citations"):
                data["citations"] = cite_result["citations"]

        return (time.perf_counter() - start) * 1000

    def _validate(self, data: dict) -> float:
        start = time.perf_counter()

        errors = []
        if not data.get("patent_number") and not data.get("title"):
            errors.append("Missing patent_number or title")
        if data.get("patent_number") and len(data["patent_number"]) > 64:
            errors.append("patent_number too long (max 64)")

        has_valid_title = data.get("title") and len(data["title"]) <= 1024
        if not data.get("title"):
            data["title"] = "Untitled Patent"
        elif not has_valid_title:
            data["title"] = data["title"][:1024]

        data["_validation_errors"] = errors
        data["_is_valid"] = len(errors) == 0

        return (time.perf_counter() - start) * 1000
