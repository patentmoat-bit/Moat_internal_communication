import re
from typing import Any


class MetadataExtractor:
    PATENT_NUMBER_PATTERNS = [
        r"(US|EP|WO|JP|CN|KR|DE|GB|FR)\d{4,12}[A-Z0-9]?",
        r"\d{2,3}/\d{3,5}",
        r"\d{7,12}",
    ]

    DATE_PATTERNS = [
        r"(\d{4})[-/. ](\d{1,2})[-/. ](\d{1,2})",
        r"(\d{1,2})[-/. ](\d{1,2})[-/. ](\d{4})",
    ]

    CPC_SECTION = re.compile(r"\b([A-HY])\d{2}[A-Z]\d{1,4}/\d{1,6}\b")
    IPC_PATTERN = re.compile(r"\b[A-Z]\d{2}[A-Z]\d{1,4}/\d{1,6}\b")

    def __init__(self):
        self.compiled_patent_pattern = re.compile(
            "|".join(f"({p})" for p in self.PATENT_NUMBER_PATTERNS)
        )

    async def extract(self, raw_text: str, existing_data: dict | None = None) -> dict[str, Any]:
        result: dict[str, Any] = {}
        data = existing_data or {}

        if not data.get("patent_number"):
            result["patent_number"] = self._extract_patent_number(raw_text)

        if not data.get("title"):
            result["title"] = self._extract_title(raw_text)

        if not data.get("abstract"):
            result["abstract"] = self._extract_abstract(raw_text)

        if not data.get("filing_date"):
            result["filing_date"] = self._extract_date(raw_text, "filing")

        if not data.get("publication_date"):
            result["publication_date"] = self._extract_date(raw_text, "publication")

        if not data.get("cpc_classifications"):
            result["cpc_classifications"] = self._extract_cpc(raw_text)

        if not data.get("ipc_classifications"):
            result["ipc_classifications"] = self._extract_ipc(raw_text)

        if not data.get("assignee"):
            result["assignee"] = self._extract_assignee(raw_text)

        if not data.get("inventors"):
            result["inventors"] = self._extract_inventors(raw_text)

        return result

    def _extract_patent_number(self, text: str) -> str | None:
        match = self.compiled_patent_pattern.search(text)
        if match:
            return match.group(0).strip()
        return None

    def _extract_title(self, text: str) -> str | None:
        patterns = [
            r"(?:TITLE|Title|title)\s*:?\s*(.+?)(?:\n\n|\Z)",
            r"(?:INVENTION|invention)\s+(?:TITLE|title|named)\s*:?\s*(.+?)(?:\n\n|\Z)",
        ]
        for pattern in patterns:
            match = re.search(pattern, text, re.DOTALL)
            if match:
                title = match.group(1).strip()
                return title[:1024] if title else None
        return None

    def _extract_abstract(self, text: str) -> str | None:
        patterns = [
            r"(?:ABSTRACT|Abstract|abstract)\s*:?\s*(.+?)(?:\n\n|\Z)",
            r"(?:ABSTRACT OF THE DISCLOSURE|Abstract of the Disclosure)\s*(.+?)(?:\n\n|\Z)",
        ]
        for pattern in patterns:
            match = re.search(pattern, text, re.DOTALL)
            if match:
                abstract = match.group(1).strip()
                return abstract if abstract else None
        return None

    def _extract_date(self, text: str, date_type: str = "filing") -> str | None:
        date_labels = {
            "filing": [r"(?:filing|filed|priority)\s*(?:date|day)?\s*:?\s*(\d{4}[-/.]\d{1,2}[-/.]\d{1,2})"],
            "publication": [r"(?:publication|published|pub\.?|issue|issued)\s*(?:date|day)?\s*:?\s*(\d{4}[-/.]\d{1,2}[-/.]\d{1,2})"],
        }
        patterns = date_labels.get(date_type, date_labels["filing"])
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1).replace("/", "-")
        return None

    def _extract_cpc(self, text: str) -> list[dict] | None:
        matches = self.CPC_SECTION.findall(text)
        if not matches:
            return None
        seen = set()
        result = []
        for match in self.CPC_SECTION.finditer(text):
            full = match.group(0)
            if full not in seen:
                seen.add(full)
                result.append({"cpc_class": full, "full": full})
        return result if result else None

    def _extract_ipc(self, text: str) -> list[dict] | None:
        matches = self.IPC_PATTERN.findall(text)
        if not matches:
            return None
        seen = set()
        result = []
        for m in matches:
            if m not in seen:
                seen.add(m)
                result.append({"ipc_class": m, "full": m})
        return result if result else None

    def _extract_assignee(self, text: str) -> str | None:
        patterns = [
            r"(?:ASSIGNEE|Assignee|assignee)\s*:?\s*(.+?)(?:\n\n|\Z)",
            r"(?:COMPANY|Company|company|Corporation|corporation)\s*:?\s*(.+?)(?:\n\n|\Z)",
        ]
        for pattern in patterns:
            match = re.search(pattern, text, re.DOTALL)
            if match:
                assignee = match.group(1).strip()
                return assignee[:512] if assignee else None
        return None

    def _extract_inventors(self, text: str) -> list[dict] | None:
        patterns = [
            r"(?:INVENTORS?|Inventors?|inventors?)\s*:?\s*(.+?)(?:\n\n|\Z)",
            r"(?:BY\s*:?\s*)(.+?)(?:\n\n|\Z)",
        ]
        for pattern in patterns:
            match = re.search(pattern, text, re.DOTALL)
            if match:
                names = match.group(1).strip()
                inventor_list = [n.strip() for n in re.split(r"[;,]\s*", names) if n.strip()]
                if inventor_list:
                    return [{"name": name} for name in inventor_list]
        return None
