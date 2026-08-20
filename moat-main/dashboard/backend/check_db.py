import asyncio
from app.database import engine
from sqlalchemy import text

async def run():
    async with engine.begin() as conn:
        res = await conn.execute(text("SELECT tablename FROM pg_tables WHERE schemaname = 'public'"))
        for r in res:
            print(r[0])

asyncio.run(run())
