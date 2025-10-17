"""
Main FastAPI application
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

from app.core.database import engine, Base
from app.routers import tin_chap, tra_gop, lich_su_tra_lai, no_phai_thu, dashboard, lich_su

# Configure logging for the application
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s: %(message)s',
    datefmt='%H:%M:%S',
    force=True  # Force reconfiguration
)

# Create database tables
Base.metadata.create_all(bind=engine)

# Create FastAPI instance
app = FastAPI(
    title="API App Credit",
    description="A FastAPI application for credit management with TinChap and TraGop",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(tin_chap.router)
app.include_router(tra_gop.router)
app.include_router(lich_su_tra_lai.router)
app.include_router(no_phai_thu.router)
app.include_router(dashboard.router)
app.include_router(lich_su.router)
# Startup event
@app.on_event("startup")
async def startup_event():
    """Configure logging on startup"""
    logger = logging.getLogger("api_app_credit")
    logger.info("="*60)
    logger.info("🚀 API App Credit Started!")
    logger.info("="*60)


# Root endpoints
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Welcome to API App Credit", 
        "version": "1.0.0",
        "endpoints": {
            "TinChap": "/tin-chap",
            "TraGop": "/tra-gop",
            "LichSuTraLai": "/lich-su-tra-lai",
            "NoPhaiThu": "/no-phai-thu",
            "Dashboard": "/dashboard",
            "LichSu": "/lich-su"
        },
        "docs": "/docs",
        "redoc": "/redoc"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "api-app-credit",
        "version": "1.0.0"
    }
