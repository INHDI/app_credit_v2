"""
Main entry point for the API App Credit application
"""
from app.main import app

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8088,
        reload=True,
        log_level="info"
    )
