"""
IPC (International Patent Classification) parser.

IPC symbol format: Section Class Subclass MainGroup/Subgroup
Example: H04L 63/14

Reference: https://www.wipo.int/classifications/ipc/en/
"""
from __future__ import annotations

import re

from app.schemas.unified_patent import IPCClassification

# Full IPC symbol regex (WIPO format: e.g. H04L 63/14)
IPC_FULL_RE = re.compile(
    r'\b([A-H])(\d{2})([A-Z])\s*(\d{1,4})(?:/(\d{1,6}))?\b'
)

# Top-level section descriptions (WIPO IPC)
SECTION_DESCRIPTIONS = {
    "A": "Human Necessities",
    "B": "Performing Operations; Transporting",
    "C": "Chemistry; Metallurgy",
    "D": "Textiles; Paper",
    "E": "Fixed Constructions",
    "F": "Mechanical Engineering; Lighting; Heating; Weapons; Blasting",
    "G": "Physics",
    "H": "Electricity",
}


class IPCParser:
    """
    Parses IPC classification symbols from:
    - Raw text (regex extraction)
    - Structured dicts from XML parser / API responses
    """

    async def parse_from_text(self, text: str) -> list[IPCClassification]:
        results: list[IPCClassification] = []
        seen: set[str] = set()
        for m in IPC_FULL_RE.finditer(text):
            symbol = self._format_symbol(m)
            if symbol not in seen:
                seen.add(symbol)
                results.append(self._build(m))
        return results

    async def parse_from_symbol(self, symbol: str) -> IPCClassification | None:
        """Parse a single IPC symbol string."""
        # Normalize: remove extra spaces between parts
        sym = re.sub(r'\s+', ' ', symbol.strip())
        m = IPC_FULL_RE.match(sym)
        if m:
            return self._build(m)
        # Loose match for partial symbols
        loose = re.match(r'^([A-H])(\d{2})([A-Z])?', sym)
        if loose:
            section = loose.group(1)
            cls = loose.group(2) or ""
            subclass = loose.group(3) or ""
            return IPCClassification(
                symbol=sym,
                section=section,
                cls=cls,
                subclass=subclass,
                description=SECTION_DESCRIPTIONS.get(section),
            )
        return None

    async def parse_from_dict_list(self, items: list[dict]) -> list[IPCClassification]:
        """
        Parse from list of dicts like:
        [{"ipc_class": "H04", "subclass": "L", "main_group": "63", "subgroup": "14"}]
        """
        results: list[IPCClassification] = []
        for item in items:
            if isinstance(item, str):
                parsed = await self.parse_from_symbol(item)
                if parsed:
                    results.append(parsed)
                continue
            symbol = item.get("full") or item.get("symbol") or item.get("ipc_class") or ""
            if not symbol:
                section_cls = item.get("ipc_class", "")
                subclass = item.get("subclass", "")
                main_group = item.get("main_group") or item.get("group", "")
                subgroup = item.get("subgroup", "")
                if main_group:
                    symbol = f"{section_cls}{subclass} {main_group}/{subgroup}" if subgroup else f"{section_cls}{subclass} {main_group}"
                else:
                    symbol = f"{section_cls}{subclass}"
            if symbol:
                parsed = await self.parse_from_symbol(symbol.strip())
                results.append(parsed or IPCClassification(
                    symbol=symbol,
                    section=symbol[0] if symbol else None,
                ))
        return results

    def _build(self, m: re.Match) -> IPCClassification:
        section = m.group(1)
        cls = m.group(2)
        subclass = m.group(3)
        main_group = m.group(4)
        subgroup = m.group(5) or ""
        symbol = f"{section}{cls}{subclass} {main_group}"
        if subgroup:
            symbol += f"/{subgroup}"
        return IPCClassification(
            symbol=symbol,
            section=section,
            cls=cls,
            subclass=subclass,
            main_group=main_group,
            subgroup=subgroup or None,
            description=SECTION_DESCRIPTIONS.get(section),
        )

    @staticmethod
    def _format_symbol(m: re.Match) -> str:
        section = m.group(1)
        cls = m.group(2)
        subclass = m.group(3)
        main = m.group(4)
        sub = m.group(5) or ""
        sym = f"{section}{cls}{subclass} {main}"
        if sub:
            sym += f"/{sub}"
        return sym

    @staticmethod
    def describe_section(section: str) -> str:
        return SECTION_DESCRIPTIONS.get(section.upper(), "Unknown Section")
