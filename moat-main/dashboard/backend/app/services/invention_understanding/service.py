import json
import re
from io import BytesIO
from typing import Any

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.client import get_openai_client
from app.config import settings
from app.core.exceptions import BadRequestException, NotFoundException
from app.models.patent import Patent
from app.schemas.understanding import (
    CoreComponent,
    Differentiator,
    InventionUnderstandingRequest,
    InventionUnderstandingResponse,
    TechnicalDomain,
)

DOMAIN_KEYWORDS: dict[str, list[str]] = {
    "Artificial Intelligence": ["model", "neural", "machine learning", "classification", "prediction", "training", "inference"],
    "Biotechnology": ["cell", "protein", "gene", "biomarker", "assay", "therapeutic", "molecule"],
    "Electronics": ["circuit", "sensor", "signal", "processor", "voltage", "semiconductor", "module"],
    "Communications": ["network", "wireless", "packet", "protocol", "transmission", "receiver", "antenna"],
    "Mechanical Systems": ["housing", "actuator", "valve", "gear", "shaft", "assembly", "fluid"],
    "Medical Devices": ["patient", "catheter", "implant", "diagnostic", "wearable", "monitoring", "physiological"],
    "Energy Storage": ["battery", "electrode", "electrolyte", "charging", "cell", "thermal", "power"],
    "Software Systems": ["server", "database", "workflow", "interface", "application", "API", "data pipeline"],
}

COMPONENT_PATTERNS = [
    r"(?:comprising|includes?|having|with)\s+(?:a|an|the)?\s*([^.;:]{4,80})",
    r"(?:module|unit|engine|processor|sensor|controller|interface|actuator|database|memory|circuit)[^.;,]{0,60}",
]

DIFFERENTIATOR_HINTS = ["novel", "improved", "adaptive", "real-time", "low power", "secure", "automated", "dynamic", "optimized", "reduced", "increased", "without", "unlike"]


class InventionUnderstandingService:
    def __init__(self, db: AsyncSession | None = None) -> None:
        self.db = db

    async def analyze(
        self,
        request: InventionUnderstandingRequest,
        file_bytes: bytes | None = None,
    ) -> InventionUnderstandingResponse:
        text, label, warnings = await self._collect_source_text(request, file_bytes)
        if not text.strip():
            raise BadRequestException("No analyzable invention content was provided")

        text = self._clean_text(text)
        ai_result = await self._analyze_with_ai(text, request.input_type, label)
        if ai_result:
            return ai_result

        return self._analyze_with_rules(text, request.input_type, label, warnings)

    async def _collect_source_text(
        self,
        request: InventionUnderstandingRequest,
        file_bytes: bytes | None,
    ) -> tuple[str, str, list[str]]:
        warnings: list[str] = []
        if request.input_type == "patent":
            if not self.db:
                raise BadRequestException("Patent analysis requires a database session")
            return await self._patent_text(request), request.patent_number or request.patent_id or "Patent", warnings

        if file_bytes:
            mime = request.mime_type or ""
            filename = request.filename or request.input_type
            if "pdf" in mime or filename.lower().endswith(".pdf") or request.input_type == "pdf":
                text = self._extract_pdf(file_bytes, warnings)
                return text, filename, warnings
            if request.input_type in {"image", "diagram"} or mime.startswith("image/"):
                text = self._extract_image(file_bytes, warnings)
                return text or self._visual_placeholder(filename, request.input_type), filename, warnings

        return request.text or "", request.filename or request.input_type.title(), warnings

    async def _patent_text(self, request: InventionUnderstandingRequest) -> str:
        filters = []
        if request.patent_id:
            filters.append(Patent.id == request.patent_id)
        if request.patent_number:
            filters.append(Patent.patent_number == request.patent_number)
        if not filters:
            raise BadRequestException("Provide patent_id or patent_number")
        result = await self.db.execute(select(Patent).where(or_(*filters)))
        patent = result.scalar_one_or_none()
        if not patent:
            raise NotFoundException("Patent not found")
        parts = [
            f"Patent Number: {patent.patent_number}",
            f"Title: {patent.title}",
            f"Assignee: {patent.assignee or 'Unknown'}",
            f"Abstract: {patent.abstract or ''}",
            f"Claims: {json.dumps(patent.claims) if patent.claims else ''}",
            f"CPC: {json.dumps(patent.cpc_classifications) if patent.cpc_classifications else ''}",
            f"IPC: {json.dumps(patent.ipc_classifications) if patent.ipc_classifications else ''}",
        ]
        return "\n".join(parts)

    def _extract_pdf(self, file_bytes: bytes, warnings: list[str]) -> str:
        try:
            from PyPDF2 import PdfReader
            reader = PdfReader(BytesIO(file_bytes))
            chunks = [(page.extract_text() or "") for page in reader.pages[:20]]
            text = "\n".join(chunks).strip()
            if not text:
                warnings.append("PDF text extraction returned no text; scanned PDFs may need OCR.")
            return text
        except Exception as exc:
            warnings.append(f"PDF extraction failed: {exc}")
            return ""

    def _extract_image(self, file_bytes: bytes, warnings: list[str]) -> str:
        try:
            from PIL import Image
            import pytesseract
            image = Image.open(BytesIO(file_bytes))
            text = pytesseract.image_to_string(image).strip()
            if not text:
                warnings.append("Image OCR returned no text; using visual analysis placeholder.")
            return text
        except Exception as exc:
            warnings.append(f"Image OCR unavailable: {exc}")
            return ""

    def _visual_placeholder(self, filename: str, input_type: str) -> str:
        return (
            f"{input_type.title()} file: {filename}. Visual input was supplied for invention understanding. "
            "Analyze likely system blocks, labeled components, signal/data flow, interfaces, and technical distinctions from the diagram or image."
        )

    def _clean_text(self, text: str) -> str:
        text = re.sub(r"\s+", " ", text).strip()
        return text[:16000]

    async def _analyze_with_ai(self, text: str, source_type: str, source_label: str) -> InventionUnderstandingResponse | None:
        client = get_openai_client()
        if not client:
            return None
        system = (
            "You are an invention understanding engine for patent and R&D teams. "
            "Return strict JSON with keys: technical_summary, innovation_summary, core_components, "
            "technical_domains, differentiators, confidence, warnings. "
            "core_components objects have name, function, evidence. technical_domains have name, confidence. "
            "differentiators have differentiator, why_it_matters. Be concrete and avoid legal conclusions."
        )
        user = f"Source type: {source_type}\nSource label: {source_label}\n\nInvention content:\n{text}"
        try:
            response = await client.chat.completions.create(
                model=settings.OPENAI_MODEL or "gpt-4o-mini",
                temperature=0.2,
                response_format={"type": "json_object"},
                messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
            )
            raw = response.choices[0].message.content or "{}"
            data = json.loads(raw)
            return InventionUnderstandingResponse(
                source_type=source_type,
                source_label=source_label,
                technical_summary=data.get("technical_summary", ""),
                innovation_summary=data.get("innovation_summary", ""),
                core_components=[CoreComponent(**item) for item in data.get("core_components", [])[:10]],
                technical_domains=[TechnicalDomain(**item) for item in data.get("technical_domains", [])[:8]],
                differentiators=[Differentiator(**item) for item in data.get("differentiators", [])[:8]],
                extracted_text_preview=text[:900],
                confidence=float(data.get("confidence", 0.82)),
                warnings=list(data.get("warnings", [])),
            )
        except Exception:
            return None

    def _analyze_with_rules(self, text: str, source_type: str, source_label: str, warnings: list[str]) -> InventionUnderstandingResponse:
        sentences = self._sentences(text)
        domains = self._domains(text)
        components = self._components(text)
        differentiators = self._differentiators(text)
        technical_summary = self._summary(sentences, domains)
        innovation_summary = self._innovation(sentences, differentiators)
        return InventionUnderstandingResponse(
            source_type=source_type,
            source_label=source_label,
            technical_summary=technical_summary,
            innovation_summary=innovation_summary,
            core_components=components,
            technical_domains=domains,
            differentiators=differentiators,
            extracted_text_preview=text[:900],
            confidence=0.68 if len(text) > 300 else 0.52,
            warnings=warnings + (["AI analysis unavailable; used deterministic extraction fallback."] if not get_openai_client() else []),
        )

    def _sentences(self, text: str) -> list[str]:
        parts = re.split(r"(?<=[.!?])\s+", text)
        return [part.strip() for part in parts if len(part.strip()) > 30][:12]

    def _domains(self, text: str) -> list[TechnicalDomain]:
        lower = text.lower()
        scored = []
        for domain, keywords in DOMAIN_KEYWORDS.items():
            hits = sum(1 for keyword in keywords if keyword.lower() in lower)
            if hits:
                scored.append((domain, hits / max(len(keywords), 1)))
        if not scored:
            scored = [("General Engineering", 0.45)]
        scored.sort(key=lambda item: item[1], reverse=True)
        return [TechnicalDomain(name=name, confidence=round(min(0.95, 0.45 + score), 2)) for name, score in scored[:5]]

    def _components(self, text: str) -> list[CoreComponent]:
        found: list[str] = []
        for pattern in COMPONENT_PATTERNS:
            for match in re.finditer(pattern, text, flags=re.IGNORECASE):
                value = match.group(0 if match.lastindex is None else 1).strip(" ,;:.()")
                if 4 <= len(value) <= 90 and value.lower() not in {item.lower() for item in found}:
                    found.append(value)
                if len(found) >= 8:
                    break
        if not found:
            found = ["Input interface", "Processing module", "Output or control module"]
        return [
            CoreComponent(
                name=self._title(component),
                function=self._component_function(component),
                evidence=component,
            )
            for component in found[:8]
        ]

    def _component_function(self, component: str) -> str:
        lower = component.lower()
        if "sensor" in lower:
            return "Captures physical, electrical, image, or state information from the operating environment."
        if "processor" in lower or "controller" in lower or "engine" in lower:
            return "Executes the decision, control, or analysis logic of the invention."
        if "database" in lower or "memory" in lower:
            return "Stores configuration, reference data, measurements, or learned state."
        if "interface" in lower or "network" in lower:
            return "Exchanges data or commands with external systems or users."
        if "actuator" in lower or "valve" in lower:
            return "Converts control decisions into mechanical or physical action."
        return "Performs a core role in the claimed technical workflow or system architecture."

    def _differentiators(self, text: str) -> list[Differentiator]:
        sentences = self._sentences(text)
        picked = [sentence for sentence in sentences if any(hint in sentence.lower() for hint in DIFFERENTIATOR_HINTS)]
        if not picked:
            picked = sentences[:3]
        result = []
        for sentence in picked[:5]:
            result.append(
                Differentiator(
                    differentiator=self._shorten(sentence, 130),
                    why_it_matters="This appears to distinguish the invention by changing performance, automation, integration, reliability, or implementation constraints.",
                )
            )
        return result or [Differentiator(differentiator="Integrated technical workflow", why_it_matters="Combines components into a coordinated system-level implementation.")]

    def _summary(self, sentences: list[str], domains: list[TechnicalDomain]) -> str:
        domain = domains[0].name if domains else "technical"
        seed = " ".join(sentences[:3]) if sentences else "The invention describes a technical system with coordinated components and operational logic."
        return f"This invention is primarily in {domain}. {self._shorten(seed, 520)}"

    def _innovation(self, sentences: list[str], differentiators: list[Differentiator]) -> str:
        if differentiators:
            core = "; ".join(item.differentiator for item in differentiators[:3])
            return f"The likely innovation centers on {core}."
        seed = " ".join(sentences[3:6] or sentences[:2])
        return self._shorten(seed or "The invention appears to improve how components interact to produce a technical result.", 420)

    def _title(self, value: str) -> str:
        value = re.sub(r"^(a|an|the)\s+", "", value.strip(), flags=re.IGNORECASE)
        return value[:1].upper() + value[1:]

    def _shorten(self, value: str, limit: int) -> str:
        return value if len(value) <= limit else value[: limit - 1].rstrip() + "..."
