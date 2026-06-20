import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query, status
from fastapi.middleware.cors import CORSMiddleware
from app.db import init_db, close_db, is_sqlite, transaction
from app.auth import decode_access_token
from app.websocket import manager
from app.routers import auth, doctors, appointments

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup Action: Initialize DB Pool
    await init_db()
    yield
    # Shutdown Action: Close DB Pool
    await close_db()

app = FastAPI(
    title="HealthVerse API",
    description="Backend API for the HealthVerse Healthcare Appointment Management System",
    version="1.0.0",
    lifespan=lifespan
)

# CORS setup for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router)
app.include_router(doctors.router)
app.include_router(appointments.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to HealthVerse API!"}

@app.get("/health")
async def health_check():
    db_status = "connected"
    db_type = "SQLite (Local Fallback)" if is_sqlite else "PostgreSQL"
    try:
        async with transaction() as conn:
            await conn.fetchval("SELECT 1")
    except Exception as e:
        logger.error(f"Health check failed to connect to database: {e}")
        db_status = "disconnected"
        
    return {
        "status": "healthy" if db_status == "connected" else "unhealthy",
        "database": {
            "type": db_type,
            "status": db_status
        }
    }

# Real-time WebSocket Endpoint
@app.websocket("/ws/{role}/{user_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    role: str,
    user_id: int,
    token: str = Query(None)
):
    # Authorization check via token passed in query parameter
    if token:
        try:
            payload = decode_access_token(token)
            if payload.get("role") != role or payload.get("id") != user_id:
                logger.warning(f"WS auth failed for {role} ID {user_id}: Role/ID mismatch")
                await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
                return
        except Exception as e:
            logger.warning(f"WS auth failed: Invalid token - {e}")
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
    else:
        logger.warning(f"WS connection rejected: Token query param missing")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await manager.connect(websocket, role, user_id)
    try:
        while True:
            # Maintain connection open and listen for client actions if any
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, role, user_id)
    except Exception as e:
        logger.error(f"WebSocket error on connection: {e}")
        manager.disconnect(websocket, role, user_id)
