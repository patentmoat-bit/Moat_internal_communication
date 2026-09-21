from __future__ import annotations

import json
import logging
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ws", tags=["realtime"])


class ConnectionManager:
    """Manages active WebSocket connections for real-time collaboration and alerts."""

    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info("WebSocket connected. Total active: %d", len(self.active_connections))

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info("WebSocket disconnected. Total active: %d", len(self.active_connections))

    async def broadcast(self, message: dict[str, Any]):
        """Broadcast event to all connected role dashboards."""
        payload = json.dumps(message)
        dead_connections = []
        for connection in self.active_connections:
            try:
                await connection.send_text(payload)
            except Exception:
                dead_connections.append(connection)

        for dead in dead_connections:
            self.disconnect(dead)


ws_manager = ConnectionManager()


@router.websocket("/events")
async def websocket_endpoint(websocket: WebSocket):
    """Real-time event stream for inbox alerts, chat messages, and workflow state transitions."""
    await ws_manager.connect(websocket)
    # Send welcome heartbeat
    await websocket.send_text(
        json.dumps({
            "type": "CONNECTION_ESTABLISHED",
            "message": "Connected to MOAT Real-Time Event Bus",
            "timestamp": "now",
        })
    )
    try:
        while True:
            data_text = await websocket.receive_text()
            try:
                data = json.loads(data_text)
                # Echo / Broadcast message to all active sessions
                event_type = data.get("type", "CHAT_MESSAGE")
                await ws_manager.broadcast({
                    "type": event_type,
                    "payload": data.get("payload", {}),
                    "sender_role": data.get("sender_role", "ANONYMOUS"),
                    "sender_name": data.get("sender_name", "MOAT User"),
                })
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
