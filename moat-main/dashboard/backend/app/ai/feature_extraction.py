from langchain_openai import ChatOpenAI
from app.config import settings
from app.ai.client import get_openai_client
from app.core.logging import logger
from app.models.patent import Patent

FEATURE_EXTRACTION_PROMPT = """You are a patent technology analyst. Extract key technical features from this patent and categorize them.

Title: {title}
Abstract: {abstract}
Assignee: {assignee}
CPC Classifications: {cpc_classifications}

Claims:
{claims}

Provide your analysis in JSON format:
{{
  "technology_domain": "Primary technology domain",
  "innovation_level": "incremental|moderate|breakthrough",
  "features": [
    {{
      "feature": "Name of the technical feature",
      "category": "Architecture|Method|Material|Algorithm|Interface|System|Component|Process",
      "relevance": 0.95,
      "description": "Brief description of this feature"
    }}
  ]
}}

Extract 3-7 key features. Rank by relevance (0.0 to 1.0).
"""


async def extract_features(patent: Patent) -> dict:
    claims_text = ""
    if patent.claims:
        if isinstance(patent.claims, list):
            claims_text = "\n".join(
                f"{i+1}. {c}" if isinstance(c, str) else str(c)
                for i, c in enumerate(patent.claims[:15])
            )
        else:
            claims_text = str(patent.claims)

    cpc_text = ", ".join(patent.cpc_classifications or [])
    abstract_text = patent.abstract or ""

    api_key = settings.OPENAI_API_KEY
    if not api_key:
        return _local_feature_extraction(
            title=patent.title or "",
            abstract=abstract_text,
            claims=claims_text,
        )

    try:
        llm = ChatOpenAI(
            model=settings.OPENAI_MODEL,
            api_key=api_key,
            temperature=0.2,
            max_tokens=1000,
        )
        prompt = FEATURE_EXTRACTION_PROMPT.format(
            title=patent.title or "",
            abstract=abstract_text[:1000],
            assignee=patent.assignee or "",
            cpc_classifications=cpc_text,
            claims=claims_text[:2000],
        )
        response = await llm.ainvoke(prompt)
        content = response.content.strip()

        import json
        json_start = content.find("{")
        json_end = content.rfind("}") + 1
        if json_start >= 0 and json_end > json_start:
            result = json.loads(content[json_start:json_end])
        else:
            result = _local_feature_extraction(
                title=patent.title or "",
                abstract=abstract_text,
                claims=claims_text,
            )
        return result
    except Exception as e:
        logger.error(f"Feature extraction failed: {e}")
        return _local_feature_extraction(
            title=patent.title or "",
            abstract=abstract_text,
            claims=claims_text,
        )


def _local_feature_extraction(
    title: str,
    abstract: str,
    claims: str,
) -> dict:
    text = (title + " " + abstract + " " + claims).lower()
    features = []
    categories = {
        "Architecture": ["architecture", "framework", "system architecture", "layer"],
        "Method": ["method", "process", "algorithm", "technique", "approach"],
        "Component": ["component", "module", "unit", "element", "block"],
        "Interface": ["interface", "api", "protocol", "communication"],
        "Material": ["material", "compound", "composition", "alloy", "polymer"],
        "Algorithm": ["algorithm", "model", "network", "classifier", "predictor"],
        "System": ["system", "platform", "apparatus", "device", "assembly"],
    }

    seen = set()
    for category, keywords in categories.items():
        for kw in keywords:
            idx = text.find(kw)
            if idx >= 0:
                start = max(0, idx - 30)
                end = min(len(text), idx + len(kw) + 60)
                snippet = text[start:end].strip()
                if snippet not in seen:
                    seen.add(snippet)
                    features.append({
                        "feature": kw.capitalize(),
                        "category": category,
                        "relevance": round(0.5 + (len(snippet) / 500) * 0.5, 2),
                        "description": f"Patent implements {kw} technology for {title.lower()}",
                    })

    return {
        "technology_domain": _infer_domain(title, abstract),
        "innovation_level": "incremental",
        "features": features[:7],
    }


def _infer_domain(title: str, abstract: str) -> str:
    text = (title + " " + abstract).lower()
    domains = {
        "Artificial Intelligence": ["machine learning", "neural network", "deep learning", "ai", "artificial intelligence", "classification", "prediction"],
        "Software Systems": ["software", "application", "interface", "api", "database", "algorithm", "computing"],
        "Biotechnology": ["gene", "protein", "dna", "rna", "cell", "pharmaceutical", "therapeutic"],
        "Mechanical Systems": ["mechanical", "engine", "pump", "valve", "gear", "bearing", "actuator"],
        "Electronics": ["circuit", "semiconductor", "transistor", "signal", "processor", "sensor"],
        "Chemical Processes": ["chemical", "catalyst", "polymer", "compound", "reaction", "synthesis"],
        "Communications": ["wireless", "communication", "signal", "frequency", "network", "transmission"],
        "Medical Technology": ["medical", "surgical", "implant", "diagnostic", "therapy", "patient"],
    }
    for domain, keywords in domains.items():
        if any(kw in text for kw in keywords):
            return domain
    return "General"
