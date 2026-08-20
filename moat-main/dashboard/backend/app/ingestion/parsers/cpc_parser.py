"""
CPC (Cooperative Patent Classification) parser.

CPC symbol format:  Section + Class + Subclass + Group + Subgroup
Example: H04L 63/1416

Reference: https://www.cooperativepatentclassification.org/cpcScheme
"""
from __future__ import annotations

import re
from typing import Any

from app.schemas.unified_patent import CPCClassification

# Full CPC symbol regex
CPC_FULL_RE = re.compile(
    r'\b([A-HY])(\d{2})([A-Z])(\d{1,4})(?:/(\d{2,6}))?\b'
)

# Section descriptions (top level only — full scheme is downloadable from CPC site)
SECTION_DESCRIPTIONS = {
    "A": "Human Necessities",
    "B": "Performing Operations / Transporting",
    "C": "Chemistry / Metallurgy",
    "D": "Textiles / Paper",
    "E": "Fixed Constructions",
    "F": "Mechanical Engineering / Lighting / Heating / Weapons",
    "G": "Physics",
    "H": "Electricity",
    "Y": "General Tagging of New Technological Developments",
}


class CPCParser:
    """
    Parses CPC classification symbols from:
    - Raw text (regex-based extraction)
    - Pre-structured dicts from XML parsers
    - Lens/USPTO API classification arrays
    """

    async def parse_from_text(self, text: str) -> list[CPCClassification]:
        """Extract all CPC symbols found in free text."""
        results: list[CPCClassification] = []
        seen: set[str] = set()
        for m in CPC_FULL_RE.finditer(text):
            symbol = m.group(0).replace(" ", "")
            if symbol not in seen:
                seen.add(symbol)
                results.append(self._build(m))
        return results

    async def parse_from_symbol(self, symbol: str) -> CPCClassification | None:
        """Parse a single CPC symbol string."""
        symbol = symbol.replace(" ", "")
        m = CPC_FULL_RE.match(symbol)
        if m:
            return self._build(m)
        # Try looser match for partial symbols like "H04L"
        loose = re.match(r'^([A-HY])(\d{2})([A-Z])?(\d{1,4})?', symbol)
        if loose:
            section = loose.group(1)
            cls = loose.group(2) or ""
            subclass = loose.group(3) or ""
            group = loose.group(4) or ""
            return CPCClassification(
                symbol=symbol,
                section=section,
                cls=cls,
                subclass=subclass,
                group=group if group else None,
                description=SECTION_DESCRIPTIONS.get(section),
            )
        return None

    async def parse_from_dict_list(self, items: list[dict]) -> list[CPCClassification]:
        """
        Parse from list of dicts from XML parser output:
        [{"cpc_class": "H04", "subclass": "L", "group": "63", ...}]
        """
        results: list[CPCClassification] = []
        for item in items:
            if isinstance(item, str):
                parsed = await self.parse_from_symbol(item)
                if parsed:
                    results.append(parsed)
                continue
            symbol = (
                item.get("full") or item.get("symbol") or
                item.get("cpc_class") or ""
            )
            if not symbol:
                # Try to reconstruct from parts
                section_cls = item.get("cpc_class", "")
                subclass = item.get("subclass", "")
                group = item.get("group", "")
                symbol = f"{section_cls}{subclass}{group}".strip()
            if symbol:
                parsed = await self.parse_from_symbol(symbol)
                results.append(parsed or CPCClassification(
                    symbol=symbol,
                    section=symbol[0] if symbol else None,
                ))
        return results

    def _build(self, m: re.Match) -> CPCClassification:
        section = m.group(1)
        cls = m.group(2)
        subclass = m.group(3)
        group = m.group(4)
        subgroup = m.group(5) or ""
        symbol = f"{section}{cls}{subclass}{group}"
        if subgroup:
            symbol += f"/{subgroup}"
        return CPCClassification(
            symbol=symbol,
            section=section,
            cls=cls,
            subclass=subclass,
            group=f"{group}/{subgroup}" if subgroup else group,
            description=SECTION_DESCRIPTIONS.get(section),
        )

    @staticmethod
    def describe_section(section: str) -> str:
        return SECTION_DESCRIPTIONS.get(section.upper(), "Unknown Section")
