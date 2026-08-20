from neo4j import AsyncGraphDatabase, AsyncDriver
from app.config import settings
from app.core.logging import logger

driver: AsyncDriver | None = None


async def get_graph_driver() -> AsyncDriver | None:
    global driver
    if driver is None:
        try:
            driver = AsyncGraphDatabase.driver(
                settings.NEO4J_URI,
                auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD),
            )
            await driver.verify_connectivity()
            logger.info(f"Connected to Neo4j at {settings.NEO4J_URI}")
        except Exception as e:
            logger.warning(f"Neo4j connection failed: {e}")
            driver = None
    return driver


async def close_graph_driver():
    global driver
    if driver is not None:
        await driver.close()
        driver = None


async def ensure_graph_constraints():
    d = await get_graph_driver()
    if d is None:
        return
    async with d.session() as session:
        for c in [
            "CREATE CONSTRAINT IF NOT EXISTS FOR (p:Patent) REQUIRE p.id IS UNIQUE",
            "CREATE CONSTRAINT IF NOT EXISTS FOR (p:Patent) REQUIRE p.patent_number IS UNIQUE",
            "CREATE CONSTRAINT IF NOT EXISTS FOR (c:Company) REQUIRE c.name IS UNIQUE",
            "CREATE CONSTRAINT IF NOT EXISTS FOR (i:Inventor) REQUIRE i.name IS UNIQUE",
            "CREATE CONSTRAINT IF NOT EXISTS FOR (t:Technology) REQUIRE t.code IS UNIQUE",
            "CREATE CONSTRAINT IF NOT EXISTS FOR (f:Family) REQUIRE f.family_id IS UNIQUE",
            "CREATE CONSTRAINT IF NOT EXISTS FOR (co:Country) REQUIRE co.code IS UNIQUE",
        ]:
            try:
                await session.run(c)
            except Exception:
                pass
