"""
Unified patent schema — every source connector normalises to this.
"""
from __future__ import annotations

from datetime import date
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator


# ──────────────────────────────────────────────────────────
# Sub-models
# ──────────────────────────────────────────────────────────

class InventorModel(BaseModel):
    name: str
    first_name: str | None = None
    last_name: str | None = None
    country: str | None = None
    city: str | None = None


class AssigneeModel(BaseModel):
    name: str
    type: Literal["person", "organization", "unknown"] = "unknown"
    country: str | None = None


class ClaimModel(BaseModel):
    num: int
    text: str
    claim_type: Literal["independent", "dependent", "unknown"] = "unknown"
    depends_on: list[int] = Field(default_factory=list)


class CPCClassification(BaseModel):
    symbol: str                        # e.g. "H04L63/1416"
    section: str | None = None         # e.g. "H"
    cls: str | None = None             # e.g. "04"
    subclass: str | None = None        # e.g. "L"
    group: str | None = None           # e.g. "63/1416"
    description: str | None = None
    position: Literal["inventive", "additional"] = "inventive"


class IPCClassification(BaseModel):
    symbol: str                        # e.g. "H04L 63/14"
    section: str | None = None
    cls: str | None = None
    subclass: str | None = None
    main_group: str | None = None
    subgroup: str | None = None
    description: str | None = None


class CitationModel(BaseModel):
    patent_number: str | None = None
    title: str | None = None
    country: str | None = None
    category: Literal["cited", "cited_by", "family"] = "cited"
    citation_type: Literal["patent", "npl"] = "patent"
    date: str | None = None


class FamilyMemberModel(BaseModel):
    patent_number: str
    country: str | None = None
    kind_code: str | None = None
    publication_date: str | None = None


# ──────────────────────────────────────────────────────────
# Main unified model
# ──────────────────────────────────────────────────────────

class UnifiedPatent(BaseModel):
    """
    Canonical representation of a patent from ANY source.
    All connector normalisers must produce this schema.
    """
    # ── Identity ──────────────────────────────────────────
    patent_number: str
    kind_code: str | None = None          # e.g. "B2", "A1"
    country_code: str | None = None       # e.g. "US", "EP", "WO"
    application_number: str | None = None

    # ── Core bibliographic ────────────────────────────────
    title: str
    abstract: str | None = None
    description: str | None = None
    full_text: str | None = None          # title + abstract + claims concatenated

    # ── People ───────────────────────────────────────────
    inventors: list[InventorModel] = Field(default_factory=list)
    assignees: list[AssigneeModel] = Field(default_factory=list)
    # Flattened primary assignee name for quick search
    assignee: str | None = None

    # ── Dates ─────────────────────────────────────────────
    filing_date: str | None = None
    publication_date: str | None = None
    grant_date: str | None = None
    priority_date: str | None = None
    expiry_date: str | None = None

    # ── Status ────────────────────────────────────────────
    status: Literal[
        "granted", "published", "pending", "expired",
        "withdrawn", "revoked", "ingested", "unknown"
    ] = "unknown"
    is_granted: bool = False

    # ── Classifications ───────────────────────────────────
    cpc_classifications: list[CPCClassification] = Field(default_factory=list)
    ipc_classifications: list[IPCClassification] = Field(default_factory=list)

    # ── Claims ───────────────────────────────────────────
    claims: list[ClaimModel] = Field(default_factory=list)
    claim_count: int = 0
    independent_claim_count: int = 0

    # ── Citations ─────────────────────────────────────────
    citations: list[CitationModel] = Field(default_factory=list)
    citation_count: int = 0
    forward_citation_count: int = 0

    # ── Family ───────────────────────────────────────────
    family_members: list[FamilyMemberModel] = Field(default_factory=list)
    family_id: str | None = None

    # ── Source provenance ─────────────────────────────────
    source: Literal[
        "uspto", "epo", "wipo", "lens", "google_patents",
        "patentsview", "upload", "api", "unknown"
    ] = "unknown"
    source_format: str | None = None
    source_url: str | None = None

    # ── Extra metadata ────────────────────────────────────
    patent_metadata: dict[str, Any] = Field(default_factory=dict)

    # ── Computed helpers ──────────────────────────────────
    @field_validator("full_text", mode="before")
    @classmethod
    def build_full_text(cls, v: str | None, info: Any) -> str | None:
        if v:
            return v
        parts: list[str] = []
        data = info.data if hasattr(info, "data") else {}
        if data.get("title"):
            parts.append(data["title"])
        if data.get("abstract"):
            parts.append(data["abstract"])
        if data.get("claims"):
            for c in data["claims"]:
                if isinstance(c, dict) and c.get("text"):
                    parts.append(c["text"])
                elif isinstance(c, ClaimModel):
                    parts.append(c.text)
        return " ".join(parts) if parts else None

    def to_es_document(self) -> dict[str, Any]:
        """Return a flat dict suitable for Elasticsearch indexing."""
        doc = self.model_dump(exclude_none=False)
        # Flatten nested lists for ES compatibility
        doc["cpc_symbols"] = [c["symbol"] for c in doc.get("cpc_classifications", [])]
        doc["ipc_symbols"] = [c["symbol"] for c in doc.get("ipc_classifications", [])]
        doc["inventor_names"] = [i["name"] for i in doc.get("inventors", [])]
        doc["assignee_names"] = [a["name"] for a in doc.get("assignees", [])]
        return doc

    def to_db_dict(self) -> dict[str, Any]:
        """Return dict suitable for ORM Patent model creation."""
        return {
            "patent_number": self.patent_number,
            "title": self.title,
            "abstract": self.abstract,
            "claims": [c.model_dump() for c in self.claims],
            "inventors": [i.model_dump() for i in self.inventors],
            "assignee": self.assignee or (self.assignees[0].name if self.assignees else None),
            "filing_date": self.filing_date,
            "publication_date": self.publication_date,
            "status": self.status,
            "cpc_classifications": [c.model_dump() for c in self.cpc_classifications],
            "ipc_classifications": [c.model_dump() for c in self.ipc_classifications],
            "citations": [c.model_dump() for c in self.citations],
            "patent_metadata": {
                **self.patent_metadata,
                "source": self.source,
                "source_format": self.source_format,
                "source_url": self.source_url,
                "kind_code": self.kind_code,
                "country_code": self.country_code,
                "application_number": self.application_number,
                "grant_date": self.grant_date,
                "priority_date": self.priority_date,
                "family_id": self.family_id,
                "claim_count": self.claim_count,
                "independent_claim_count": self.independent_claim_count,
                "citation_count": self.citation_count,
                "forward_citation_count": self.forward_citation_count,
            },
        }
