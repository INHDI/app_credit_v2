from typing import Any, Optional, Generic, TypeVar
from pydantic import BaseModel

DataType = TypeVar('DataType')

class ApiResponse(BaseModel, Generic[DataType]):
    """Base API response model"""
    success: bool
    data: Optional[DataType] = None
    message: Optional[str] = None
    error: Optional[str] = None

    @classmethod
    def success_response(cls, data: DataType, message: str = "Success") -> "ApiResponse[DataType]":
        """Create a successful response"""
        return cls(
            success=True,
            data=data,
            message=message,
            error=None
        )

    @classmethod
    def error_response(cls, error: str, data: Any = None) -> "ApiResponse[Any]":
        """Create an error response"""
        return cls(
            success=False,
            data=data,
            message=None,
            error=error
        )
