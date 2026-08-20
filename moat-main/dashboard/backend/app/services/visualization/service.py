from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.patent_repository import PatentRepository
from app.models.patent import Patent
from app.core.graph import get_graph_driver
from app.core.logging import logger
from typing import Any
from collections import defaultdict


class VisualizationService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.patent_repo = PatentRepository(db)

    async def get_citation_graph(self, patent_id: str, depth: int = 2) -> dict:
        driver = await get_graph_driver()
        nodes: list[dict] = []
        links: list[dict] = []
        seen_nodes: set = set()

        if driver is None:
            return self._build_empty_graph()

        try:
            async with driver.session() as session:
                result = await session.run(
                    """
                    MATCH (p:Patent {id: $patent_id})
                    CALL apoc.path.subgraphAll(p, {
                        maxLevel: $depth,
                        relationshipFilter: "CITES|CITED_BY|SAME_CPC|SAME_ASSIGNEE"
                    })
                    YIELD nodes, relationships
                    UNWIND nodes AS n
                    RETURN DISTINCT n.id AS id, n.patent_number AS patent_number,
                           n.title AS title, n.assignee AS assignee,
                           n.filing_year AS filing_year, n.citation_count AS citation_count
                    """,
                    patent_id=patent_id,
                    depth=depth,
                )
                for record in await result.fetch():
                    nid = record["id"]
                    if nid not in seen_nodes:
                        seen_nodes.add(nid)
                        nodes.append({
                            "id": nid,
                            "patent_number": record.get("patent_number", ""),
                            "title": record.get("title", ""),
                            "assignee": record.get("assignee", ""),
                            "filing_year": record.get("filing_year", ""),
                            "citation_count": record.get("citation_count", 0),
                            "group": "center" if nid == patent_id else "related",
                        })

                link_result = await session.run(
                    """
                    MATCH (p:Patent {id: $patent_id})
                    CALL apoc.path.subgraphAll(p, {
                        maxLevel: $depth,
                        relationshipFilter: "CITES|CITED_BY|SAME_CPC|SAME_ASSIGNEE"
                    })
                    YIELD relationships
                    UNWIND relationships AS r
                    RETURN DISTINCT startNode(r).id AS source,
                           endNode(r).id AS target,
                           type(r) AS type
                    """,
                    patent_id=patent_id,
                    depth=depth,
                )
                for record in await link_result.fetch():
                    links.append({
                        "source": record["source"],
                        "target": record["target"],
                        "type": record["type"],
                        "label": record["type"].replace("_", " ").title(),
                    })
        except Exception as e:
            logger.error(f"Citation graph query failed: {e}")
            return self._build_fallback_graph(patent_id)

        if not nodes:
            return self._build_fallback_graph(patent_id)

        return {"nodes": nodes, "links": links}

    async def get_technology_tree(self) -> dict:
        driver = await get_graph_driver()
        if driver is None:
            return {"root": {"id": "root", "name": "Technologies", "value": 0, "children": []}}

        try:
            async with driver.session() as session:
                result = await session.run(
                    """
                    MATCH (c:CPCClass)<-[:CLASSIFIED_AS]-(p:Patent)
                    WITH c.code AS class, c.section AS section, COUNT(p) AS count
                    RETURN section, COLLECT({name: class, value: count}) AS children
                    ORDER BY section
                    """
                )
                sections = []
                total = 0
                for record in await result.fetch():
                    section_name = record["section"] or "Other"
                    children = [
                        {"name": c["name"], "value": c["value"]}
                        for c in record["children"]
                    ]
                    sections.append({
                        "name": section_name,
                        "children": children,
                    })
                    total += sum(c["value"] for c in record["children"])

                return {
                    "root": {
                        "id": "root",
                        "name": "Technologies",
                        "value": total,
                        "children": sections,
                    }
                }
        except Exception as e:
            logger.error(f"Technology tree query failed: {e}")
            return {"root": {"id": "root", "name": "Technologies", "value": 0, "children": []}}

    async def get_patent_relationships(self, patent_id: str) -> dict:
        patent = await self.patent_repo.get(patent_id)
        if not patent:
            return {
                "patent_id": patent_id,
                "patent_number": "",
                "title": "",
                "relationships": [],
            }

        driver = await get_graph_driver()
        rels: list[dict] = []

        if driver is not None:
            try:
                async with driver.session() as session:
                    result = await session.run(
                        """
                        MATCH (p:Patent {id: $patent_id})-[r]-(other:Patent)
                        RETURN other.id AS target_id, other.patent_number AS target_number,
                               other.title AS target_title, type(r) AS relationship,
                               r.strength AS strength
                        LIMIT 50
                        """,
                        patent_id=patent_id,
                    )
                    for record in await result.fetch():
                        rels.append({
                            "source_id": patent_id,
                            "source_number": patent.patent_number or "",
                            "source_title": patent.title or "",
                            "target_id": record.get("target_id", ""),
                            "target_number": record.get("target_number", ""),
                            "target_title": record.get("target_title", ""),
                            "relationship": record.get("relationship", "").replace("_", " ").title(),
                            "strength": record.get("strength", 0.5),
                        })
            except Exception as e:
                logger.error(f"Relationship query failed: {e}")

        if not rels:
            rels = self._build_fallback_relationships(patent)

        return {
            "patent_id": patent_id,
            "patent_number": patent.patent_number or "",
            "title": patent.title or "",
            "relationships": rels,
        }

    async def sync_patent_to_graph(self, patent: Patent) -> bool:
        driver = await get_graph_driver()
        if driver is None:
            return False

        try:
            async with driver.session() as session:
                # 1. Patent Node
                await session.run(
                    """
                    MERGE (p:Patent {id: $id})
                    SET p.patent_number = $patent_number,
                        p.title = $title,
                        p.abstract = $abstract,
                        p.filing_year = $filing_year,
                        p.citation_count = $citation_count
                    """,
                    id=str(patent.id),
                    patent_number=patent.patent_number or "",
                    title=patent.title or "",
                    abstract=patent.abstract or "",
                    filing_year=str(patent.filing_date.year) if patent.filing_date else "",
                    citation_count=len(patent.citations or []),
                )

                # 2. Company Node (OWNED_BY)
                if patent.assignee:
                    await session.run(
                        """
                        MERGE (c:Company {name: $name})
                        WITH c
                        MATCH (p:Patent {id: $patent_id})
                        MERGE (p)-[:OWNED_BY]->(c)
                        """,
                        name=patent.assignee,
                        patent_id=str(patent.id),
                    )

                # 3. Inventor Nodes (INVENTED_BY)
                inventors = []
                if isinstance(patent.inventors, list):
                    for inv in patent.inventors:
                        if isinstance(inv, dict) and "name" in inv:
                            inventors.append(inv["name"])
                        elif isinstance(inv, str):
                            inventors.append(inv)
                for inv in inventors:
                    if inv:
                        await session.run(
                            """
                            MERGE (i:Inventor {name: $name})
                            WITH i
                            MATCH (p:Patent {id: $patent_id})
                            MERGE (p)-[:INVENTED_BY]->(i)
                            """,
                            name=inv,
                            patent_id=str(patent.id),
                        )

                # 4. Technology Nodes (BELONGS_TO)
                for cpc in (patent.cpc_classifications or []):
                    if cpc:
                        await session.run(
                            """
                            MERGE (t:Technology {code: $code})
                            WITH t
                            MATCH (p:Patent {id: $patent_id})
                            MERGE (p)-[:BELONGS_TO]->(t)
                            """,
                            code=cpc,
                            patent_id=str(patent.id),
                        )

                # 5. Citation Nodes (CITES)
                for citation in (patent.citations or []):
                    if citation:
                        await session.run(
                            """
                            MERGE (cited:Patent {patent_number: $citation})
                            WITH cited
                            MATCH (p:Patent {id: $patent_id})
                            MERGE (p)-[:CITES]->(cited)
                            """,
                            citation=citation,
                            patent_id=str(patent.id),
                        )

                # 6. Country Node (FILED_IN)
                if patent.patent_number and len(patent.patent_number) >= 2:
                    country_code = patent.patent_number[:2].upper()
                    if country_code.isalpha():
                        await session.run(
                            """
                            MERGE (co:Country {code: $code})
                            WITH co
                            MATCH (p:Patent {id: $patent_id})
                            MERGE (p)-[:FILED_IN]->(co)
                            """,
                            code=country_code,
                            patent_id=str(patent.id),
                        )
                
                # 7. Family Node (PART_OF)
                family_id = None
                if isinstance(patent.patent_metadata, dict):
                    family_id = patent.patent_metadata.get("family_id")
                
                if family_id:
                    await session.run(
                        """
                        MERGE (f:Family {family_id: $family_id})
                        WITH f
                        MATCH (p:Patent {id: $patent_id})
                        MERGE (p)-[:PART_OF]->(f)
                        """,
                        family_id=str(family_id),
                        patent_id=str(patent.id),
                    )
            return True
        except Exception as e:
            logger.error(f"Failed to sync patent to Neo4j: {e}")
            return False

    def _build_empty_graph(self) -> dict:
        return {"nodes": [], "links": []}

    def _build_fallback_graph(self, patent_id: str) -> dict:
        return {
            "nodes": [
                {"id": patent_id, "patent_number": "", "title": "Patent",
                 "assignee": "", "filing_year": "", "citation_count": 0, "group": "center"},
            ],
            "links": [],
        }

    def _build_fallback_relationships(self, patent: Patent) -> list[dict]:
        rels = []
        for citation in (patent.citations or [])[:10]:
            rels.append({
                "source_id": str(patent.id),
                "source_number": patent.patent_number or "",
                "source_title": patent.title or "",
                "target_id": "",
                "target_number": citation,
                "target_title": citation,
                "relationship": "Cites",
                "strength": 0.5,
            })
        return rels

    async def get_graph_stats(self) -> dict:
        driver = await get_graph_driver()
        if driver is None:
            return {
                "total_nodes": 0,
                "total_edges": 0,
                "top_cpc_classes": [],
                "top_assignees": [],
                "citation_network_stats": {},
            }

        try:
            async with driver.session() as session:
                node_count = await session.run("MATCH (n) RETURN COUNT(n) AS count")
                edge_count = await session.run("MATCH ()-[r]->() RETURN COUNT(r) AS count")
                top_cpc = await session.run(
                    """
                    MATCH (t:Technology)<-[:BELONGS_TO]-()
                    RETURN t.code AS code, COUNT(*) AS count
                    ORDER BY count DESC LIMIT 10
                    """
                )
                top_assignees = await session.run(
                    """
                    MATCH (c:Company)<-[:OWNED_BY]-()
                    RETURN c.name AS name, COUNT(*) AS count
                    ORDER BY count DESC LIMIT 10
                    """
                )
                nc = await node_count.fetch()
                ec = await edge_count.fetch()
                cpc_list = [{"code": r["code"], "count": r["count"]} async for r in top_cpc]
                assignee_list = [{"name": r["name"], "count": r["count"]} async for r in top_assignees]
                return {
                    "total_nodes": nc[0]["count"] if nc else 0,
                    "total_edges": ec[0]["count"] if ec else 0,
                    "top_technologies": cpc_list,
                    "top_companies": assignee_list,
                    "citation_network_stats": {
                        "largest_company": assignee_list[0]["name"] if assignee_list else "N/A",
                        "total_companies": len(assignee_list),
                    },
                }
        except Exception as e:
            logger.error(f"Graph stats query failed: {e}")
            return {
                "total_nodes": 0,
                "total_edges": 0,
                "top_cpc_classes": [],
                "top_assignees": [],
                "citation_network_stats": {},
            }
