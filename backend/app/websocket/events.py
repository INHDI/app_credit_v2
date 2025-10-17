"""
WebSocket Event Types and Helpers
Defines all event types and helper functions for broadcasting events
"""
from enum import Enum
from typing import Any, Dict, Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class EventType(str, Enum):
    """WebSocket event types"""
    # Connection events
    CONNECTION_ESTABLISHED = "connection_established"
    CONNECTION_CLOSED = "connection_closed"
    
    # TinChap events
    TIN_CHAP_CREATED = "tin_chap_created"
    TIN_CHAP_UPDATED = "tin_chap_updated"
    TIN_CHAP_DELETED = "tin_chap_deleted"
    
    # TraGop events
    TRA_GOP_CREATED = "tra_gop_created"
    TRA_GOP_UPDATED = "tra_gop_updated"
    TRA_GOP_DELETED = "tra_gop_deleted"
    
    # LichSuTraLai events
    LICH_SU_TRA_LAI_CREATED = "lich_su_tra_lai_created"
    LICH_SU_TRA_LAI_UPDATED = "lich_su_tra_lai_updated"
    LICH_SU_TRA_LAI_DELETED = "lich_su_tra_lai_deleted"
    
    # Dashboard events
    DASHBOARD_UPDATED = "dashboard_updated"
    NO_PHAI_THU_UPDATED = "no_phai_thu_updated"
    
    # System events
    SYSTEM_NOTIFICATION = "system_notification"
    ERROR = "error"


def create_event_message(
    event_type: EventType,
    data: Any,
    message: Optional[str] = None,
    client_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Create a standardized WebSocket event message
    
    Args:
        event_type: Type of the event
        data: Event data payload
        message: Optional human-readable message
        client_id: Optional client ID who triggered the event
    
    Returns:
        Standardized event message dictionary
    """
    return {
        "type": event_type.value,
        "data": data,
        "message": message,
        "timestamp": datetime.now().isoformat(),
        "client_id": client_id
    }


def create_success_message(message: str, data: Any = None) -> Dict[str, Any]:
    """Create a success notification message"""
    return create_event_message(
        EventType.SYSTEM_NOTIFICATION,
        data=data or {},
        message=message
    )


def create_error_message(error: str, details: Any = None) -> Dict[str, Any]:
    """Create an error message"""
    return create_event_message(
        EventType.ERROR,
        data={"error": error, "details": details},
        message=error
    )


async def broadcast_tin_chap_event(
    manager,
    event_type: EventType,
    tin_chap_data: Dict[str, Any],
    message: Optional[str] = None,
    exclude_client: Optional[str] = None
):
    """Broadcast TinChap-related events"""
    event_message = create_event_message(
        event_type=event_type,
        data=tin_chap_data,
        message=message
    )
    await manager.broadcast(event_message, exclude_client=exclude_client)
    logger.info(f"📡 Broadcasted {event_type.value}")


async def broadcast_tra_gop_event(
    manager,
    event_type: EventType,
    tra_gop_data: Dict[str, Any],
    message: Optional[str] = None,
    exclude_client: Optional[str] = None
):
    """Broadcast TraGop-related events"""
    event_message = create_event_message(
        event_type=event_type,
        data=tra_gop_data,
        message=message
    )
    await manager.broadcast(event_message, exclude_client=exclude_client)
    logger.info(f"📡 Broadcasted {event_type.value}")


async def broadcast_lich_su_tra_lai_event(
    manager,
    event_type: EventType,
    lich_su_data: Dict[str, Any],
    message: Optional[str] = None,
    exclude_client: Optional[str] = None
):
    """Broadcast LichSuTraLai-related events"""
    event_message = create_event_message(
        event_type=event_type,
        data=lich_su_data,
        message=message
    )
    await manager.broadcast(event_message, exclude_client=exclude_client)
    logger.info(f"📡 Broadcasted {event_type.value}")


async def broadcast_dashboard_update(
    manager,
    dashboard_data: Dict[str, Any],
    message: Optional[str] = None,
    exclude_client: Optional[str] = None
):
    """Broadcast dashboard update event"""
    event_message = create_event_message(
        event_type=EventType.DASHBOARD_UPDATED,
        data=dashboard_data,
        message=message or "Dashboard data updated"
    )
    await manager.broadcast(event_message, exclude_client=exclude_client)
    logger.info(f"📡 Broadcasted dashboard update")


async def broadcast_no_phai_thu_update(
    manager,
    no_phai_thu_data: Dict[str, Any],
    message: Optional[str] = None,
    exclude_client: Optional[str] = None
):
    """Broadcast NoPhaiThu update event"""
    event_message = create_event_message(
        event_type=EventType.NO_PHAI_THU_UPDATED,
        data=no_phai_thu_data,
        message=message or "Nợ phải thu updated"
    )
    await manager.broadcast(event_message, exclude_client=exclude_client)
    logger.info(f"📡 Broadcasted no_phai_thu update")

