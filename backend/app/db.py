import os
import logging
import asyncpg
from contextlib import asynccontextmanager

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/healthverse")

# Setup simple logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

pool = None

async def init_db():
    global pool
    logger.info("Initializing asyncpg connection pool...")
    try:
        pool = await asyncpg.create_pool(
            DATABASE_URL,
            min_size=5,
            max_size=20,
            max_inactive_connection_lifetime=300.0
        )
        logger.info("Connection pool initialized successfully.")
    except Exception as e:
        logger.error(f"Error initializing connection pool: {e}")
        raise e

async def close_db():
    global pool
    if pool:
        logger.info("Closing asyncpg connection pool...")
        await pool.close()
        logger.info("Connection pool closed.")

async def get_db():
    """Dependency to acquire a connection from the pool."""
    if pool is None:
        raise RuntimeError("Database pool not initialized")
    async with pool.acquire() as conn:
        yield conn

@asynccontextmanager
async def transaction():
    """Context manager to run queries in a single transaction with automatic commit/rollback."""
    if pool is None:
        raise RuntimeError("Database pool not initialized")
    async with pool.acquire() as conn:
        async with conn.transaction():
            yield conn
