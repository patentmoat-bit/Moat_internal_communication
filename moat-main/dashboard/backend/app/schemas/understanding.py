from pydantic import BaseModel, Field


class InventionUnderstandingRequest(BaseModel):
    input_type: str = Field("text", pattern="^(text|pdf|patent|diagram|image)$")
    text: str | None = None
    patent_id: str | None = None
    patent_number: str | None = None
    filename: str | None = None
    mime_type: str | None = None


class CoreComponent(BaseModel):
    name: str
    function: str
    evidence: str | None = None


class TechnicalDomain(BaseModel):
    name: str
    confidence: float = 0.5


class Differentiator(BaseModel):
    differentiator: str
    why_it_matters: str


class InventionUnderstandingResponse(BaseModel):
    source_type: str
    source_label: str
    technical_summary: str
    innovation_summary: str
    core_components: list[CoreComponent]
    technical_domains: list[TechnicalDomain]
    differentiators: list[Differentiator]
    extracted_text_preview: str
    confidence: float = 0.7
    warnings: list[str] = []
