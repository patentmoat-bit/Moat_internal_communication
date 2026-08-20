from pydantic import BaseModel
from typing import Optional


class CitationGraphNode(BaseModel):
    id: str
    patent_number: str
    title: str
    assignee: str
    filing_year: str
    citation_count: int
    group: str


class CitationGraphLink(BaseModel):
    source: str
    target: str
    type: str
    label: str


class CitationGraphResponse(BaseModel):
    nodes: list[CitationGraphNode]
    links: list[CitationGraphLink]


class TechnologyTreeNode(BaseModel):
    id: str
    name: str
    value: int
    children: Optional[list["TechnologyTreeNode"]] = None


class TechnologyTreeResponse(BaseModel):
    root: TechnologyTreeNode


class PatentRelationship(BaseModel):
    source_id: str
    source_number: str
    source_title: str
    target_id: str
    target_number: str
    target_title: str
    relationship: str
    strength: float


class PatentRelationshipsResponse(BaseModel):
    patent_id: str
    patent_number: str
    title: str
    relationships: list[PatentRelationship]


class GraphQueryRequest(BaseModel):
    patent_id: str
    depth: Optional[int] = 2
    relationship_types: Optional[list[str]] = None


class GraphStatsResponse(BaseModel):
    total_nodes: int
    total_edges: int
    top_cpc_classes: list[dict]
    top_assignees: list[dict]
    citation_network_stats: dict
