import base64
import json
import logging
from typing import Any

from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config import settings
from app.ai.embeddings import search_image_semantic
from app.models.patent import Patent

logger = logging.getLogger(__name__)

VISION_PROMPT = """Analyze this technical drawing/diagram from a patent. 
Describe its visual and structural components in detail.
Focus on:
1. Identifying component shapes and structures
2. Structural topology and layout
3. Block diagram patterns or circuit elements
4. Mechanical geometry

Provide a concise technical description suitable for semantic similarity search against other patent drawings."""

class ImageSearchService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def extract_visual_features(self, image_bytes: bytes, mime_type: str) -> str:
        api_key = settings.OPENAI_API_KEY
        if not api_key:
            logger.warning("OpenAI API key missing, using fallback vision description")
            return "Fallback visual description for uploaded technical drawing containing generic structural elements."
        
        try:
            base64_image = base64.b64encode(image_bytes).decode('utf-8')
            
            llm = ChatOpenAI(
                model="gpt-4o",  # Vision capable model
                api_key=api_key,
                max_tokens=500,
                temperature=0.2,
            )
            
            message = HumanMessage(
                content=[
                    {"type": "text", "text": VISION_PROMPT},
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:{mime_type};base64,{base64_image}"},
                    },
                ]
            )
            
            response = await llm.ainvoke([message])
            return response.content.strip()
        except Exception as e:
            logger.error(f"Vision feature extraction failed: {e}")
            return "Failed to extract visual features due to an API error."

    async def search_by_image(self, image_bytes: bytes, mime_type: str, limit: int = 10, min_score: float = 0.0) -> list[dict]:
        # Step 1: Extract features using vision model
        description = await self.extract_visual_features(image_bytes, mime_type)
        
        # Step 2: Semantic search via Weaviate (PatentImage collection)
        weaviate_results = await search_image_semantic(query=description, limit=limit)
        
        # Step 3: Hydrate with PostgreSQL data
        hydrated_results = []
        for r in weaviate_results:
            if r["score"] < min_score:
                continue
                
            patent_id = r.get("patent_id")
            if not patent_id:
                continue
                
            stmt = select(Patent).where(Patent.id == patent_id)
            result = await self.db.execute(stmt)
            patent = result.scalar_one_or_none()
            
            if patent:
                hydrated_results.append({
                    "patent_number": patent.patent_number,
                    "similarity_pct": round(r["score"] * 100, 1),
                    "title": patent.title,
                    "assignee": patent.assignee,
                    # We can mock patent_family based on Neo4j later, keeping it simple for now
                    "patent_family": [], 
                    "country": patent.patent_number[:2] if patent.patent_number else "Unknown",
                    "status": patent.status,
                    "description": r.get("description", ""),
                    "image_url": r.get("image_url", "")
                })
        
        # Sort by similarity descending
        hydrated_results.sort(key=lambda x: x["similarity_pct"], reverse=True)
        return hydrated_results
