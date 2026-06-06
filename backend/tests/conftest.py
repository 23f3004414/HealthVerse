import pytest
import asyncio
import os
import asyncpg
from app import db

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/healthverse")

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="session", autouse=True)
async def setup_db():
    """Initializes the database pool for test suite execution."""
    # Override database url if needed
    db.DATABASE_URL = DATABASE_URL
    await db.init_db()
    
    # Run simple cleanup before starting tests
    async with db.pool.acquire() as conn:
        await conn.execute("TRUNCATE patients, doctors, availability_slots, appointments CASCADE;")
        
    yield
    await db.close_db()
