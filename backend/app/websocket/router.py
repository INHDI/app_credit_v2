"""
WebSocket Router
Handles WebSocket connections and message routing
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import logging
import json
from typing import Optional

from app.websocket.manager import manager
from app.websocket.events import (
    EventType,
    create_event_message,
    create_success_message,
    create_error_message
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/ws",
    tags=["websocket"]
)


@router.websocket("/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    """
    WebSocket endpoint for real-time communication
    
    Args:
        websocket: WebSocket connection
        client_id: Unique identifier for the client
    """
    await manager.connect(client_id, websocket)
    
    try:
        # Send connection established message
        await manager.send_personal_message(
            create_success_message(
                message=f"Connected successfully as {client_id}",
                data={
                    "client_id": client_id,
                    "active_connections": manager.get_connection_count()
                }
            ),
            client_id
        )
        
        # Notify other clients about new connection
        await manager.broadcast(
            create_event_message(
                EventType.CONNECTION_ESTABLISHED,
                data={
                    "client_id": client_id,
                    "active_connections": manager.get_connection_count()
                },
                message=f"Client {client_id} connected"
            ),
            exclude_client=client_id
        )
        
        # Listen for messages from client
        while True:
            try:
                # Receive message from client
                data = await websocket.receive_text()
                
                try:
                    message = json.loads(data)
                    logger.info(f"📨 Received from {client_id}: {message.get('type', 'unknown')}")
                    
                    # Handle different message types
                    await handle_client_message(client_id, message)
                    
                except json.JSONDecodeError:
                    logger.error(f"❌ Invalid JSON from {client_id}: {data}")
                    await manager.send_personal_message(
                        create_error_message("Invalid JSON format"),
                        client_id
                    )
                    
            except WebSocketDisconnect:
                logger.info(f"🔌 Client {client_id} disconnected normally")
                break
            except Exception as e:
                logger.error(f"❌ Error receiving from {client_id}: {e}")
                break
    
    except Exception as e:
        logger.error(f"❌ WebSocket error for {client_id}: {e}")
    
    finally:
        # Clean up connection
        manager.disconnect(client_id)
        
        # Notify other clients about disconnection
        await manager.broadcast(
            create_event_message(
                EventType.CONNECTION_CLOSED,
                data={
                    "client_id": client_id,
                    "active_connections": manager.get_connection_count()
                },
                message=f"Client {client_id} disconnected"
            )
        )


async def handle_client_message(client_id: str, message: dict):
    """
    Handle incoming messages from clients
    
    Args:
        client_id: ID of the client sending the message
        message: Message data from client
    """
    message_type = message.get("type")
    
    if message_type == "ping":
        # Respond to ping with pong
        await manager.send_personal_message(
            {"type": "pong", "timestamp": message.get("timestamp")},
            client_id
        )
        logger.debug(f"🏓 Pong sent to {client_id}")
    
    elif message_type == "subscribe":
        # Handle subscription to specific channels
        channels = message.get("channels", [])
        logger.info(f"📢 Client {client_id} subscribed to: {channels}")
        await manager.send_personal_message(
            create_success_message(
                message=f"Subscribed to channels: {', '.join(channels)}",
                data={"channels": channels}
            ),
            client_id
        )
    
    elif message_type == "unsubscribe":
        # Handle unsubscription from channels
        channels = message.get("channels", [])
        logger.info(f"🔕 Client {client_id} unsubscribed from: {channels}")
        await manager.send_personal_message(
            create_success_message(
                message=f"Unsubscribed from channels: {', '.join(channels)}",
                data={"channels": channels}
            ),
            client_id
        )
    
    elif message_type == "get_status":
        # Send connection status
        await manager.send_personal_message(
            create_success_message(
                message="Connection status",
                data={
                    "client_id": client_id,
                    "active_connections": manager.get_connection_count(),
                    "connected_clients": manager.get_connected_clients()
                }
            ),
            client_id
        )
    
    else:
        logger.warning(f"⚠️ Unknown message type from {client_id}: {message_type}")
        await manager.send_personal_message(
            create_error_message(
                error=f"Unknown message type: {message_type}",
                details=message
            ),
            client_id
        )


@router.get("/connections")
async def get_active_connections():
    """Get information about active WebSocket connections"""
    return {
        "active_connections": manager.get_connection_count(),
        "connected_clients": manager.get_connected_clients()
    }

