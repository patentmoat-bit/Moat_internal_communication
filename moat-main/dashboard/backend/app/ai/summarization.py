from langchain_openai import ChatOpenAI
from app.config import settings
from app.ai.client import get_openai_client
from app.core.logging import logger
from app.models.patent import Patent

SUMMARIZATION_PROMPT = """You are a patent analysis expert. Analyze the following patent and provide a structured summary.

Title: {title}
Abstract: {abstract}
Assignee: {assignee}
Inventors: {inventors}
Filing Date: {filing_date}
CPC Classifications: {cpc_classifications}
Status: {status}

Claims:
{claims}

Provide a comprehensive analysis in the following JSON format:
{{
  "summary": "A concise 3-4 sentence summary of what this patent covers and its key innovation",
  "key_innovations": ["List the 3-5 most important innovations or claims"],
  "technical_domain": "The primary technical domain or field of the patent"
}}
"""


async def generate_summary(patent: Patent, max_length: int = 500) -> dict:
    claims_text = ""
    if patent.claims:
        if isinstance(patent.claims, list):
            claims_text = "\n".join(
                f"{i+1}. {c}" if isinstance(c, str) else str(c)
                for i, c in enumerate(patent.claims[:10])
            )
        else:
            claims_text = str(patent.claims)

    inventors_text = ", ".join(patent.inventors or [])
    cpc_text = ", ".join(patent.cpc_classifications or [])
    abstract_text = patent.abstract or ""

    api_key = settings.OPENAI_API_KEY
    if not api_key:
        return _generate_local_summary(
            title=patent.title or "",
            abstract=abstract_text,
            inventors=inventors_text,
            claims=claims_text,
            max_length=max_length,
        )

    try:
        llm = ChatOpenAI(
            model=settings.OPENAI_MODEL,
            api_key=api_key,
            temperature=0.3,
            max_tokens=max_length,
        )
        prompt = SUMMARIZATION_PROMPT.format(
            title=patent.title or "",
            abstract=abstract_text,
            assignee=patent.assignee or "",
            inventors=inventors_text,
            filing_date=str(patent.filing_date or ""),
            cpc_classifications=cpc_text,
            status=patent.status or "",
            claims=claims_text,
        )
        response = await llm.ainvoke(prompt)
        content = response.content.strip()
        import json
        json_start = content.find("{")
        json_end = content.rfind("}") + 1
        if json_start >= 0 and json_end > json_start:
            result = json.loads(content[json_start:json_end])
        else:
            result = {
                "summary": content[:max_length],
                "key_innovations": [],
                "technical_domain": "General",
            }
        return result
    except Exception as e:
        logger.error(f"OpenAI summarization failed: {e}")
        return _generate_local_summary(
            title=patent.title or "",
            abstract=abstract_text,
            inventors=inventors_text,
            claims=claims_text,
            max_length=max_length,
        )


def _generate_local_summary(
    title: str,
    abstract: str,
    inventors: str,
    claims: str,
    max_length: int,
) -> dict:
    summary_parts = []
    if abstract:
        summary_parts.append(abstract[:max_length])
    elif title:
        summary_parts.append(f"This patent relates to {title}")

    key_innovations = []
    if claims:
        claim_lines = claims.strip().split("\n")
        for line in claim_lines[:3]:
            cleaned = line.strip()
            if cleaned and not cleaned[0].isdigit():
                key_innovations.append(cleaned)

    return {
        "summary": " ".join(summary_parts)[:max_length] or "Patent summary not available",
        "key_innovations": key_innovations or ["Patent innovation analysis pending"],
        "technical_domain": _infer_domain(title, abstract),
    }


def _infer_domain(title: str, abstract: str) -> str:
    text = (title + " " + abstract).lower()
    domains = {
        "Artificial Intelligence": ["machine learning", "neural network", "deep learning", "ai", "artificial intelligence"],
        "Software Engineering": ["software", "application", "interface", "api", "database", "algorithm"],
        "Biotechnology": ["biotech", "gene", "protein", "dna", "rna", "cell", "pharmaceutical"],
        "Mechanical Engineering": ["mechanical", "engine", "pump", "valve", "gear", "bearing"],
        "Electrical Engineering": ["circuit", "semiconductor", "transistor", "signal", "processor"],
        "Chemical Engineering": ["chemical", "catalyst", "polymer", "compound", "reaction"],
        "Telecommunications": ["wireless", "communication", "signal", "frequency", "network"],
        "Medical Devices": ["medical", "surgical", "implant", "diagnostic", "therapy"],
        "Materials Science": ["material", "alloy", "composite", "coating", "nanoparticle"],
        "Energy": ["solar", "battery", "fuel", "energy", "power", "renewable"],
    }
    for domain, keywords in domains.items():
        if any(kw in text for kw in keywords):
            return domain
    return "General"
