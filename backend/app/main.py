"""
Main FastAPI application
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

from app.core.database import engine, Base
from app.routers import tin_chap, tra_gop, lich_su_tra_lai, no_phai_thu, dashboard, lich_su, auth, debtor, export, settings
from app.websocket import router as websocket_router

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
app.include_router(auth.router)
app.include_router(debtor.router)
app.include_router(tin_chap.router)
app.include_router(tra_gop.router)
app.include_router(lich_su_tra_lai.router)
app.include_router(no_phai_thu.router)
app.include_router(dashboard.router)
app.include_router(lich_su.router)
app.include_router(export.router)
app.include_router(settings.router)
app.include_router(websocket_router)
# Startup event
@app.on_event("startup")
async def startup_event():
    """Configure logging and ensure admin user exists on startup"""
    logger = logging.getLogger("api_app_credit")
    logger.info("="*60)
    logger.info("🚀 API App Credit Started!")
    logger.info("="*60)
    
    # Ensure default admin user exists
    await ensure_admin_user_exists()


async def ensure_admin_user_exists():
    """Check if admin user exists, if not create one"""
    import os
    from app.core.database import SessionLocal
    from app.models.user import User
    from app.core.security import hash_password
    
    db = SessionLocal()
    try:
        # Check if any admin user exists
        admin_user = db.query(User).filter(User.role == "admin").first()
        
        if admin_user:
            logging.info(f"✅ Admin user exists: {admin_user.email}")
            return
        
        # Get admin credentials from environment or use defaults
        admin_email = os.getenv("ADMIN_EMAIL", "admin@example.com")
        admin_password = os.getenv("ADMIN_PASSWORD", "admin123")
        admin_phone = os.getenv("ADMIN_PHONE", "0000000000")
        admin_name = os.getenv("ADMIN_NAME", "Administrator")
        
        # Create default admin user
        hashed_password = hash_password(admin_password)
        
        default_admin = User(
            ho_ten=admin_name,
            so_dien_thoai=admin_phone,
            email=admin_email,
            password_hash=hashed_password,
            role="admin",
            is_active=True
        )
        
        db.add(default_admin)
        db.commit()
        
        logging.info(f"✅ Created default admin user:")
        logging.info(f"   📧 Email: {admin_email}")
        logging.info(f"   🔑 Password: {admin_password}")
        logging.info(f"   ⚠️  Please change the password after first login!")
        
    except Exception as e:
        logging.error(f"❌ Error ensuring admin user: {e}")
        db.rollback()
    finally:
        db.close()


# Root endpoints
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Welcome to API App Credit", 
        "version": "1.0.0",
        "endpoints": {
            "Auth": "/auth",
            "Debtor Portal": "/debtor",
            "TinChap": "/tin-chap",
            "TraGop": "/tra-gop",
            "LichSuTraLai": "/lich-su-tra-lai",
            "NoPhaiThu": "/no-phai-thu",
            "Dashboard": "/dashboard",
            "LichSu": "/lich-su",
            "WebSocket": "/ws/{client_id}",
            "WebSocket Status": "/ws/connections"
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
