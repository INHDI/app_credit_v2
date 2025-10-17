"""
WebSocket module for real-time communication
"""
from app.websocket.manager import manager, ConnectionManager
from app.websocket.events import (
    EventType,
    create_event_message,
    create_success_message,
    create_error_message,
    broadcast_tin_chap_event,
    broadcast_tra_gop_event,
    broadcast_lich_su_tra_lai_event,
    broadcast_dashboard_update,
    broadcast_no_phai_thu_update
)
from app.websocket.router import router

__all__ = [
    "manager",
    "ConnectionManager",
    "EventType",
    "create_event_message",
    "create_success_message",
    "create_error_message",
    "broadcast_tin_chap_event",
    "broadcast_tra_gop_event",
    "broadcast_lich_su_tra_lai_event",
    "broadcast_dashboard_update",
    "broadcast_no_phai_thu_update",
    "router"
]

