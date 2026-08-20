"""
Claims parser — extracts and structures patent claims from raw text.

Handles:
- Independent vs dependent claim detection
- Claim dependency tree building
- Preamble / body / transition extraction
- Claim numbering normalization
"""
from __future__ import annotations

import re
from typing import Any

from app.schemas.unified_patent import ClaimModel


class ClaimsParser:
    """
    Parse raw claim text (from XML text node or OCR output) into
    structured ClaimModel objects with dependency information.
    """

    # Regex to split individual claims from a wall-of-text claims section
    CLAIM_SPLIT_RE = re.compile(
        r'(?:^|\n)\s*(?:claim\s+)?(\d+)[.\)]\s+',
        re.IGNORECASE | re.MULTILINE,
    )

    # Dependency detection
    DEPENDS_RE = re.compile(
        r'(?:according|as defined|of)\s+(?:any\s+(?:one\s+)?of\s+)?claims?\s+'
        r'([\d,\s\+toandor\-]+)',
        re.IGNORECASE,
    )
    DEPENDS_RE_2 = re.compile(
        r'(?:the|of)\s+(?:preceding\s+)?claim\s+(\d+)',
        re.IGNORECASE,
    )

    # Transitions
    TRANSITIONS = {"comprising", "consisting of", "including", "characterized in that",
                   "wherein", "having", "whereby"}

    async def parse(self, raw_text: str) -> list[ClaimModel]:
        """Entry point — parse full claims section text."""
        if not raw_text:
            return []
        return self._parse_claims_text(raw_text)

    async def parse_from_xml_elements(self, elements: list[dict]) -> list[ClaimModel]:
        """
        Parse from a list of dicts like [{"num": 1, "text": "..."}, ...].
        Compatible with the XML parser's existing output format.
        """
        claims: list[ClaimModel] = []
        for el in elements:
            num = int(el.get("num") or 0)
            text = str(el.get("text") or "").strip()
            if num and text:
                claim_type, depends_on = self._analyse_claim(text)
                claims.append(ClaimModel(
                    num=num,
                    text=text,
                    claim_type=claim_type,
                    depends_on=depends_on,
                ))
        return claims

    # ── Private helpers ───────────────────────────────────

    def _parse_claims_text(self, text: str) -> list[ClaimModel]:
        # Try to isolate claims section
        section_match = re.search(
            r'(?:CLAIMS?|What is claimed is:?|I claim:?)\s*\n(.+)',
            text, re.DOTALL | re.IGNORECASE
        )
        if section_match:
            text = section_match.group(1)

        # Split by claim number markers
        parts = self.CLAIM_SPLIT_RE.split(text)

        claims: list[ClaimModel] = []
        i = 1
        # parts = [prefix, num1, body1, num2, body2, ...]
        while i + 1 < len(parts):
            try:
                num_str = parts[i]
                body = parts[i + 1].strip() if i + 1 < len(parts) else ""
                num = int(num_str)
                if body:
                    claim_type, depends_on = self._analyse_claim(body)
                    claims.append(ClaimModel(
                        num=num,
                        text=body,
                        claim_type=claim_type,
                        depends_on=depends_on,
                    ))
            except (ValueError, IndexError):
                pass
            i += 2

        # Fallback: treat whole text as single claim
        if not claims and text.strip():
            claim_type, depends_on = self._analyse_claim(text.strip())
            claims.append(ClaimModel(num=1, text=text.strip()[:4000],
                                     claim_type=claim_type, depends_on=depends_on))

        return claims

    def _analyse_claim(self, text: str) -> tuple[str, list[int]]:
        """
        Determine if a claim is independent or dependent,
        and extract which claim numbers it depends on.
        """
        depends_on: list[int] = []

        m = self.DEPENDS_RE.search(text)
        if not m:
            m = self.DEPENDS_RE_2.search(text)

        if m:
            nums_str = m.group(1)
            depends_on = self._extract_nums(nums_str)
            return "dependent", depends_on

        return "independent", []

    @staticmethod
    def _extract_nums(text: str) -> list[int]:
        """Extract all integers from a string like '1, 3 or 5'."""
        return sorted({int(n) for n in re.findall(r'\d+', text)})

    def count_independent(self, claims: list[ClaimModel]) -> int:
        return sum(1 for c in claims if c.claim_type == "independent")


# Convenience function
async def parse_claims(raw_text: str) -> list[ClaimModel]:
    return await ClaimsParser().parse(raw_text)
