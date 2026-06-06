import json
import logging
from typing import Dict, List, Tuple
from fastapi import WebSocket

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        # Maps (role, user_id) -> list of active WebSocket connections
        self.active_connections: Dict[Tuple[str, int], List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, role: str, user_id: int):
        await websocket.accept()
        key = (role, user_id)
        if key not in self.active_connections:
            self.active_connections[key] = []
        self.active_connections[key].append(websocket)
        logger.info(f"WebSocket connection established for {role} ID {user_id}")

    def disconnect(self, websocket: WebSocket, role: str, user_id: int):
        key = (role, user_id)
        if key in self.active_connections:
            try:
                self.active_connections[key].remove(websocket)
            except ValueError:
                pass
            if not self.active_connections[key]:
                del self.active_connections[key]
        logger.info(f"WebSocket connection closed for {role} ID {user_id}")

    async def send_personal_message(self, message: dict, role: str, user_id: int):
        key = (role, user_id)
        if key in self.active_connections:
            dead_connections = []
            for connection in self.active_connections[key]:
                try:
                    await connection.send_text(json.dumps(message))
                except Exception as e:
                    logger.error(f"Failed to send WS message to {role} ID {user_id}: {e}")
                    dead_connections.append(connection)
            
            # Clean up any dead connections
            for conn in dead_connections:
                self.disconnect(conn, role, user_id)

manager = ConnectionManager()
