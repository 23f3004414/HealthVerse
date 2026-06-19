import os
import re
import logging
import sqlite3
from contextlib import asynccontextmanager

# Setup simple logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///healthverse.db")
is_sqlite = DATABASE_URL.startswith("sqlite")

# Database pools/connections
pool = None          # For postgres
sqlite_conn = None   # For sqlite (singleton connection or managed pools)

def translate_sql(sql: str) -> str:
    """Translates Postgres SQL queries into SQLite syntax on the fly."""
    if not is_sqlite:
        return sql
    # 1. Replace Postgres placeholders ($1, $2, etc) with SQLite placeholders (?)
    sql = re.sub(r'\$(\d+)', r'?', sql)
    # 2. SQLite doesn't support SELECT ... FOR UPDATE row locks (it uses database-level locks for writes)
    sql = sql.replace("FOR UPDATE", "")
    return sql

class SQLiteConnectionWrapper:
    """Wrapper that maps sqlite3.Row dict-like access to match asyncpg interface."""
    def __init__(self, conn):
        self.conn = conn

    async def fetchrow(self, sql, *args):
        translated = translate_sql(sql)
        async with self.conn.execute(translated, args) as cursor:
            row = await cursor.fetchone()
            return dict(row) if row else None

    async def fetch(self, sql, *args):
        translated = translate_sql(sql)
        async with self.conn.execute(translated, args) as cursor:
            rows = await cursor.fetchall()
            return [dict(r) for r in rows]

    async def execute(self, sql, *args):
        translated = translate_sql(sql)
        await self.conn.execute(translated, args)
        await self.conn.commit()

    async def fetchval(self, sql, *args):
        translated = translate_sql(sql)
        async with self.conn.execute(translated, args) as cursor:
            row = await cursor.fetchone()
            return row[0] if row else None


async def init_db():
    global pool, sqlite_conn
    if is_sqlite:
        import aiosqlite
        # Parse file path
        db_path = DATABASE_URL.replace("sqlite:///", "")
        logger.info(f"Initializing SQLite database at {db_path}...")
        
        sqlite_conn = await aiosqlite.connect(db_path)
        sqlite_conn.row_factory = sqlite3.Row
        
        # Enforce foreign key constraints in SQLite
        await sqlite_conn.execute("PRAGMA foreign_keys = ON;")
        
        # Initialize tables for SQLite on startup
        await init_sqlite_tables(sqlite_conn)
        logger.info("SQLite database initialized successfully.")
    else:
        import asyncpg
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
    global pool, sqlite_conn
    if is_sqlite and sqlite_conn:
        logger.info("Closing SQLite database connection...")
        await sqlite_conn.close()
        logger.info("SQLite database connection closed.")
    elif pool:
        logger.info("Closing asyncpg connection pool...")
        await pool.close()
        logger.info("Connection pool closed.")

async def get_db():
    """Dependency to acquire a connection from the pool/connection instance."""
    if is_sqlite:
        if sqlite_conn is None:
            raise RuntimeError("SQLite database not initialized")
        yield SQLiteConnectionWrapper(sqlite_conn)
    else:
        if pool is None:
            raise RuntimeError("Database pool not initialized")
        async with pool.acquire() as conn:
            yield conn

@asynccontextmanager
async def transaction():
    """Context manager to run queries in a single transaction block."""
    if is_sqlite:
        if sqlite_conn is None:
            raise RuntimeError("SQLite database not initialized")
        # In sqlite, starting execute commits/begins automatically, but we wrap in explicit transaction
        async with sqlite_conn.execute("BEGIN TRANSACTION;"):
            try:
                yield SQLiteConnectionWrapper(sqlite_conn)
                await sqlite_conn.commit()
            except Exception as e:
                await sqlite_conn.rollback()
                raise e
    else:
        if pool is None:
            raise RuntimeError("Database pool not initialized")
        async with pool.acquire() as conn:
            async with conn.transaction():
                yield conn

async def init_sqlite_tables(conn):
    """Schema tables setup for SQLite fallback."""
    # 1. Create tables
    await conn.execute("""
    CREATE TABLE IF NOT EXISTS patients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)
    await conn.execute("""
    CREATE TABLE IF NOT EXISTS doctors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        specialty TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)
    await conn.execute("""
    CREATE TABLE IF NOT EXISTS availability_slots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        doctor_id INTEGER REFERENCES doctors(id) ON DELETE CASCADE,
        slot_date TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        is_booked BOOLEAN DEFAULT FALSE,
        UNIQUE (doctor_id, slot_date, start_time, end_time)
    );
    """)
    await conn.execute("""
    CREATE TABLE IF NOT EXISTS appointments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
        doctor_id INTEGER REFERENCES doctors(id) ON DELETE CASCADE,
        slot_id INTEGER REFERENCES availability_slots(id) ON DELETE CASCADE,
        appointment_date TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (slot_id)
    );
    """)
    
    # 2. Add performance indexes (SQLite supports standard index commands)
    await conn.execute("CREATE INDEX IF NOT EXISTS idx_availability_slots_doctor_date ON availability_slots (doctor_id, slot_date);")
    await conn.execute("CREATE INDEX IF NOT EXISTS idx_appointments_doctor_date ON appointments (doctor_id, appointment_date);")
    await conn.execute("CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments (patient_id);")
    await conn.execute("CREATE INDEX IF NOT EXISTS idx_appointments_slot ON appointments (slot_id);")
    
    # 3. Seed initial users if database is empty
    cursor = await conn.execute("SELECT COUNT(*) FROM doctors;")
    count = (await cursor.fetchone())[0]
    if count == 0:
        logger.info("Seeding initial data into SQLite database...")
        # Password 'password123'
        pwd_hash = "$2b$12$R.S26P.M80jEGBm7X77aVubpQc9Y2a/iH4N1dC0rW5q4W91.m3t7G"
        await conn.execute(
            "INSERT INTO doctors (email, password_hash, full_name, specialty) VALUES (?, ?, ?, ?);",
            ("doctor.house@healthverse.com", pwd_hash, "Dr. Gregory House", "Diagnostic Medicine")
        )
        await conn.execute(
            "INSERT INTO doctors (email, password_hash, full_name, specialty) VALUES (?, ?, ?, ?);",
            ("doctor.strange@healthverse.com", pwd_hash, "Dr. Stephen Strange", "Neurosurgery")
        )
        await conn.execute(
            "INSERT INTO doctors (email, password_hash, full_name, specialty) VALUES (?, ?, ?, ?);",
            ("doctor.grey@healthverse.com", pwd_hash, "Dr. Meredith Grey", "General Surgery")
        )
        await conn.execute(
            "INSERT INTO patients (email, password_hash, full_name) VALUES (?, ?, ?);",
            ("john.doe@gmail.com", pwd_hash, "John Doe")
        )
        await conn.execute(
            "INSERT INTO patients (email, password_hash, full_name) VALUES (?, ?, ?);",
            ("jane.smith@gmail.com", pwd_hash, "Jane Smith")
        )
        await conn.commit()
