"""
WebSocket Connection Manager
Manages all WebSocket connections and message broadcasting
"""
from typing import Dict, List
from fastapi import WebSocket
import json
import logging

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages WebSocket connections and message broadcasting"""
    
    def __init__(self):
        # Store active connections: {client_id: WebSocket}
        self.active_connections: Dict[str, WebSocket] = {}
    
    async def connect(self, client_id: str, websocket: WebSocket):
        """Accept and register a new WebSocket connection"""
        await websocket.accept()
        self.active_connections[client_id] = websocket
        logger.info(f"✅ Client {client_id} connected. Total connections: {len(self.active_connections)}")
    
    def disconnect(self, client_id: str):
        """Remove a WebSocket connection"""
        if client_id in self.active_connections:
            del self.active_connections[client_id]
            logger.info(f"❌ Client {client_id} disconnected. Total connections: {len(self.active_connections)}")
    
    async def send_personal_message(self, message: dict, client_id: str):
        """Send a message to a specific client"""
        if client_id in self.active_connections:
            try:
                websocket = self.active_connections[client_id]
                await websocket.send_json(message)
                logger.debug(f"📤 Sent personal message to {client_id}: {message.get('type')}")
            except Exception as e:
                logger.error(f"❌ Error sending message to {client_id}: {e}")
                self.disconnect(client_id)
    
    async def broadcast(self, message: dict, exclude_client: str = None):
        """Broadcast a message to all connected clients (except excluded one)"""
        disconnected_clients = []
        
        for client_id, websocket in self.active_connections.items():
            # Skip excluded client
            if exclude_client and client_id == exclude_client:
                continue
            
            try:
                await websocket.send_json(message)
                logger.debug(f"📡 Broadcasted to {client_id}: {message.get('type')}")
            except Exception as e:
                logger.error(f"❌ Error broadcasting to {client_id}: {e}")
                disconnected_clients.append(client_id)
        
        # Clean up disconnected clients
        for client_id in disconnected_clients:
            self.disconnect(client_id)
        
        if disconnected_clients:
            logger.info(f"🧹 Cleaned up {len(disconnected_clients)} disconnected clients")
    
    async def broadcast_to_group(self, message: dict, client_ids: List[str]):
        """Broadcast a message to a specific group of clients"""
        disconnected_clients = []
        
        for client_id in client_ids:
            if client_id in self.active_connections:
                try:
                    websocket = self.active_connections[client_id]
                    await websocket.send_json(message)
                    logger.debug(f"📡 Group message to {client_id}: {message.get('type')}")
                except Exception as e:
                    logger.error(f"❌ Error sending to {client_id}: {e}")
                    disconnected_clients.append(client_id)
        
        # Clean up disconnected clients
        for client_id in disconnected_clients:
            self.disconnect(client_id)
    
    def get_connection_count(self) -> int:
        """Get the number of active connections"""
        return len(self.active_connections)
    
    def get_connected_clients(self) -> List[str]:
        """Get list of all connected client IDs"""
        return list(self.active_connections.keys())


# Global instance of ConnectionManager
manager = ConnectionManager()

