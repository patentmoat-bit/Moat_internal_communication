import json
import re
from dataclasses import dataclass

from app.ai.client import get_openai_client
from app.config import settings

DOMAIN_KEYWORDS: dict[str, list[str]] = {
    "AI": ["model", "machine learning", "neural", "classification", "prediction", "training", "inference", "embedding"],
    "Battery": ["battery", "electrode", "electrolyte", "charging", "cell", "thermal", "separator", "power"],
    "Networking": ["network", "wireless", "packet", "protocol", "router", "transmission", "latency", "bandwidth"],
    "Medical Device": ["patient", "diagnostic", "implant", "catheter", "wearable", "physiological", "biomarker", "therapy"],
    "Robotics": ["robot", "actuator", "gripper", "servo", "motion", "trajectory", "manipulator", "control"],
    "Software Systems": ["server", "database", "workflow", "application", "API", "pipeline", "interface", "automation"],
    "Electronics": ["sensor", "circuit", "processor", "signal", "voltage", "semiconductor", "module", "controller"],
}

COMPONENT_TERMS = ["sensor", "processor", "controller", "module", "engine", "interface", "database", "actuator", "memory", "circuit", "model", "gateway"]
DIFFERENTIATOR_HINTS = ["novel", "adaptive", "real-time", "low power", "secure", "automated", "dynamic", "optimized", "reduced", "increased", "unlike", "without", "improved"]


@dataclass
class InventionAnalysisPayload:
    technical_summary: str
    innovation_summary: str
    key_components: list[dict]
    technical_domains: list[dict]
    differentiators: list[dict]
    workflows: list[dict]
    technical_architecture: dict
    innovation_highlights: list[dict]
    confidence_score: float
    model_name: str


class InventionAIAnalysisService:
    async def analyze(self, title: str, description: str, documents: list[dict] | None = None) -> InventionAnalysisPayload:
        documents = documents or []
        context = self._context(title, description, documents)
        ai = await self._analyze_with_openai(context)
        if ai:
            return ai
        return self._analyze_with_rules(title, context)

    def _context(self, title: str, description: str, documents: list[dict]) -> str:
        doc_text = "\n".join(
            f"Document: {item.get('file_name')} ({item.get('file_type')})\n{item.get('extracted_text') or item.get('storage_url') or ''}"
            for item in documents
        )
        return self._clean(f"Title: {title}\nDescription: {description or ''}\n{doc_text}")

    def _clean(self, value: str) -> str:
        return re.sub(r"\s+", " ", value).strip()[:24000]

    async def _analyze_with_openai(self, context: str) -> InventionAnalysisPayload | None:
        client = get_openai_client()
        if not client:
            return None
        system = (
            "You are the AI Invention Workspace engine for a patent finder system. "
            "Return strict JSON with keys: technical_summary, innovation_summary, key_components, technical_domains, "
            "differentiators, workflows, technical_architecture, innovation_highlights, confidence_score. "
            "key_components are objects with name/function/evidence. technical_domains are objects with name/confidence. "
            "differentiators are objects with differentiator/why_it_matters. workflows are ordered step/action/output. "
            "technical_architecture has layers/components/data_flow. innovation_highlights are patentable concept objects with title/rationale."
        )
        try:
            response = await client.chat.completions.create(
                model=settings.OPENAI_MODEL or "gpt-4o-mini",
                temperature=0.2,
                response_format={"type": "json_object"},
                messages=[{"role": "system", "content": system}, {"role": "user", "content": context}],
            )
            data = json.loads(response.choices[0].message.content or "{}")
            return InventionAnalysisPayload(
                technical_summary=data.get("technical_summary", ""),
                innovation_summary=data.get("innovation_summary", ""),
                key_components=list(data.get("key_components", []))[:12],
                technical_domains=list(data.get("technical_domains", []))[:8],
                differentiators=list(data.get("differentiators", []))[:8],
                workflows=list(data.get("workflows", []))[:10],
                technical_architecture=data.get("technical_architecture") or {},
                innovation_highlights=list(data.get("innovation_highlights", []))[:8],
                confidence_score=float(data.get("confidence_score", 0.82)),
                model_name=settings.OPENAI_MODEL or "gpt-4o-mini",
            )
        except Exception:
            return None

    def _analyze_with_rules(self, title: str, context: str) -> InventionAnalysisPayload:
        sentences = self._sentences(context)
        domains = self._domains(context)
        components = self._components(context)
        differentiators = self._differentiators(sentences)
        workflows = self._workflows(sentences, components)
        architecture = {
            "layers": ["Input capture", "Processing and decision logic", "Output/control interface"],
            "components": [item["name"] for item in components[:6]],
            "data_flow": "Inputs are captured, processed by the core logic, and converted into outputs, controls, recommendations, or stored results.",
        }
        highlights = [
            {"title": item["differentiator"].split(".")[0][:90], "rationale": item["why_it_matters"]}
            for item in differentiators[:5]
        ] or [{"title": title, "rationale": "The invention combines technical components into a coordinated workflow that may support patentable claim concepts."}]
        domain = domains[0]["name"] if domains else "technical system"
        return InventionAnalysisPayload(
            technical_summary=f"The invention describes a {domain} implementation. {self._shorten(' '.join(sentences[:3]), 560)}",
            innovation_summary=f"The likely innovation centers on {', '.join(item['differentiator'] for item in differentiators[:3])}.",
            key_components=components,
            technical_domains=domains,
            differentiators=differentiators,
            workflows=workflows,
            technical_architecture=architecture,
            innovation_highlights=highlights,
            confidence_score=0.68 if len(context) > 400 else 0.54,
            model_name="deterministic-fallback",
        )

    def _sentences(self, text: str) -> list[str]:
        return [part.strip() for part in re.split(r"(?<=[.!?])\s+", text) if len(part.strip()) > 25][:14]

    def _domains(self, text: str) -> list[dict]:
        lower = text.lower()
        scored = []
        for domain, keywords in DOMAIN_KEYWORDS.items():
            hits = sum(1 for keyword in keywords if keyword in lower)
            if hits:
                scored.append({"name": domain, "confidence": round(min(0.96, 0.48 + hits / len(keywords)), 2)})
        return sorted(scored or [{"name": "General Engineering", "confidence": 0.48}], key=lambda item: item["confidence"], reverse=True)[:6]

    def _components(self, text: str) -> list[dict]:
        found = []
        lower = text.lower()
        for term in COMPONENT_TERMS:
            if term in lower:
                found.append({"name": term.title(), "function": self._component_function(term), "evidence": term})
        for match in re.finditer(r"(?:comprising|includes?|having|with)\s+([^.;:]{8,90})", text, flags=re.IGNORECASE):
            value = match.group(1).strip(" ,;:.()")
            if value and value.lower() not in {item["name"].lower() for item in found}:
                found.append({"name": value[:70].title(), "function": "Performs a core role in the invention workflow.", "evidence": value})
        return found[:10] or [
            {"name": "Input Interface", "function": "Receives invention inputs, sensor data, documents, or commands.", "evidence": "inferred"},
            {"name": "Processing Module", "function": "Transforms inputs into technical decisions or outputs.", "evidence": "inferred"},
            {"name": "Output Module", "function": "Produces results, controls, alerts, or stored intelligence.", "evidence": "inferred"},
        ]

    def _component_function(self, term: str) -> str:
        if term in {"processor", "controller", "engine", "model"}:
            return "Executes technical logic, inference, control, or optimization."
        if term in {"sensor", "interface", "gateway"}:
            return "Captures or exchanges data with users, devices, or external systems."
        if term in {"database", "memory"}:
            return "Stores state, reference data, measurements, or generated outputs."
        if term in {"actuator", "circuit"}:
            return "Converts decisions into physical, electrical, or control behavior."
        return "Provides a core subsystem in the invention architecture."

    def _differentiators(self, sentences: list[str]) -> list[dict]:
        picked = [sentence for sentence in sentences if any(hint in sentence.lower() for hint in DIFFERENTIATOR_HINTS)] or sentences[:4]
        return [
            {"differentiator": self._shorten(sentence, 140), "why_it_matters": "This may support novelty by changing performance, integration, automation, reliability, or implementation constraints."}
            for sentence in picked[:6]
        ] or [{"differentiator": "Integrated technical workflow", "why_it_matters": "Combines components into a coordinated patent-relevant system."}]

    def _workflows(self, sentences: list[str], components: list[dict]) -> list[dict]:
        seeds = sentences[:5] or ["Receive input", "Process input", "Generate output"]
        return [
            {"step": index + 1, "action": self._shorten(seed, 120), "output": components[min(index, len(components) - 1)]["name"] if components else "Technical result"}
            for index, seed in enumerate(seeds[:7])
        ]

    def _shorten(self, value: str, limit: int) -> str:
        value = value.strip()
        return value if len(value) <= limit else value[: limit - 1].rstrip() + "..."
