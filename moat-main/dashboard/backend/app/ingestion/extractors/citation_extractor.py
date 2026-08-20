import re
from typing import Any


class CitationExtractor:
    PATENT_CITATION_PATTERN = re.compile(
        r"(US|EP|WO|JP|CN|KR|DE|GB|FR|AU|CA)\s*[-,. ]?\s*(\d{4,12})\s*[A-Z0-9]?"
    )
    NPL_PATTERN = re.compile(
        r"(?:see|reference|prior art|citation|by|per)\s+(.+?)(?:\.|;|\n)",
        re.IGNORECASE,
    )

    def __init__(self, metadata: dict | None = None):
        self.metadata = metadata or {}

    async def extract(self, text: str, existing_citations: list | None = None) -> dict[str, Any]:
        existing = existing_citations or []
        existing_numbers = {
            c.get("patent_number", "") for c in existing if c.get("patent_number")
        }

        patent_citations = await self._extract_patent_citations(text, existing_numbers)
        npl_citations = await self._extract_npl_citations(text)

        all_citations = existing + patent_citations + npl_citations

        return {
            "citations": all_citations if all_citations else None,
            "citation_count": len(all_citations),
            "patent_citation_count": len(patent_citations),
            "npl_citation_count": len(npl_citations),
        }

    async def _extract_patent_citations(
        self, text: str, existing_numbers: set
    ) -> list[dict]:
        citations = []
        seen = set(existing_numbers)

        for match in self.PATENT_CITATION_PATTERN.finditer(text):
            country = match.group(1)
            number = match.group(2)
            full_number = f"{country}{number}"

            if full_number not in seen:
                seen.add(full_number)
                citations.append({
                    "patent_number": full_number,
                    "country": country,
                    "category": "cited",
                    "type": "patent",
                })

        return citations

    async def _extract_npl_citations(self, text: str) -> list[dict]:
        citations = []
        seen = set()

        for match in self.NPL_PATTERN.finditer(text):
            ref = match.group(1).strip()
            if ref and len(ref) > 20 and ref not in seen:
                seen.add(ref)
                citations.append({
                    "title": ref[:512],
                    "category": "cited",
                    "type": "npl",
                })

        return citations

    async def extract_from_references_section(self, text: str) -> list[dict]:
        citations = []
        ref_patterns = [
            r"(?:REFERENCES? CITED|REFERENCES?|CITATIONS?|Prior Art|BACKGROUND)\s*(.+?)(?=\n[A-Z]|\Z)",
        ]
        seen = set()

        for pattern in ref_patterns:
            match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
            if match:
                section = match.group(1)
                if section:
                    patent_matches = self.PATENT_CITATION_PATTERN.findall(section)
                    for country, number in patent_matches:
                        full = f"{country}{number}"
                        if full not in seen:
                            seen.add(full)
                            citations.append({
                                "patent_number": full,
                                "country": country,
                                "category": "cited",
                                "type": "patent",
                            })
        return citations
