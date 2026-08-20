from sqlalchemy.ext.asyncio import AsyncSession
from app.core.graph import get_graph_driver
from app.core.logging import logger
from typing import Any

class CompetitorIntelligenceService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_competitor_dashboard(self, company_name: str) -> dict:
        driver = await get_graph_driver()
        if not driver:
            return self._build_empty_dashboard(company_name)

        try:
            async with driver.session() as session:
                # 1. Patent Count & Active Count (mocking active as just a subset or total for now)
                count_res = await session.run(
                    """
                    MATCH (c:Company {name: $name})<-[:OWNED_BY]-(p:Patent)
                    RETURN COUNT(p) AS total_patents
                    """,
                    name=company_name
                )
                count_data = await count_res.single()
                total_patents = count_data["total_patents"] if count_data else 0

                # 2. Top Inventors
                inv_res = await session.run(
                    """
                    MATCH (c:Company {name: $name})<-[:OWNED_BY]-(p:Patent)-[:INVENTED_BY]->(i:Inventor)
                    RETURN i.name AS name, COUNT(p) AS patent_count
                    ORDER BY patent_count DESC
                    LIMIT 10
                    """,
                    name=company_name
                )
                top_inventors = [{"name": r["name"], "count": r["patent_count"]} async for r in inv_res]

                # 3. Top Technologies
                tech_res = await session.run(
                    """
                    MATCH (c:Company {name: $name})<-[:OWNED_BY]-(p:Patent)-[:BELONGS_TO]->(t:Technology)
                    RETURN t.code AS code, COUNT(p) AS patent_count
                    ORDER BY patent_count DESC
                    LIMIT 10
                    """,
                    name=company_name
                )
                top_technologies = [{"code": r["code"], "count": r["patent_count"]} async for r in tech_res]

                # 4. Filing Trends
                trend_res = await session.run(
                    """
                    MATCH (c:Company {name: $name})<-[:OWNED_BY]-(p:Patent)
                    WHERE p.filing_year IS NOT NULL AND p.filing_year <> ""
                    RETURN p.filing_year AS year, COUNT(p) AS count
                    ORDER BY year ASC
                    """,
                    name=company_name
                )
                filing_trends = [{"year": r["year"], "count": r["count"]} async for r in trend_res]

                # 5. Countries
                country_res = await session.run(
                    """
                    MATCH (c:Company {name: $name})<-[:OWNED_BY]-(p:Patent)-[:FILED_IN]->(co:Country)
                    RETURN co.code AS country, COUNT(p) AS count
                    ORDER BY count DESC
                    LIMIT 10
                    """,
                    name=company_name
                )
                countries = [{"country": r["country"], "count": r["count"]} async for r in country_res]

                return {
                    "company_name": company_name,
                    "metrics": {
                        "total_patents": total_patents,
                        "active_patents": total_patents, # Assuming all active for baseline
                    },
                    "top_inventors": top_inventors,
                    "top_technologies": top_technologies,
                    "filing_trends": filing_trends,
                    "countries": countries
                }
        except Exception as e:
            logger.error(f"Competitor Intelligence failed for {company_name}: {e}")
            return self._build_empty_dashboard(company_name)

    def _build_empty_dashboard(self, company_name: str) -> dict:
        return {
            "company_name": company_name,
            "metrics": {"total_patents": 0, "active_patents": 0},
            "top_inventors": [],
            "top_technologies": [],
            "filing_trends": [],
            "countries": []
        }
