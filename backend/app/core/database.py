"""
Database configuration and session management
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get database configuration from environment variables
POSTGRES_SERVER = os.getenv("POSTGRES_SERVER", "localhost")
POSTGRES_PORT = os.getenv("POSTGRES_PORT", "5432")
POSTGRES_DB = os.getenv("POSTGRES_DB", "app")
POSTGRES_USER = os.getenv("POSTGRES_USER", "postgres")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "")

# PostgreSQL database URL
SQLALCHEMY_DATABASE_URL = f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_SERVER}:{POSTGRES_PORT}/{POSTGRES_DB}"

# Create engine
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    echo=False  # Set to True to see SQL queries in console
)

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create Base class for models
Base = declarative_base()


# Dependency to get DB session
def get_db():
    """
    Get database session
    
    Yields:
        Session: Database session
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Function to initialize database
def init_db():
    """
    Initialize database - create all tables
    """
    # Import all models to ensure they are registered with Base
    from app.models import TinChap, TraGop, LichSuTraLai
    
    # Create all tables
    Base.metadata.create_all(bind=engine)
    print(f"✅ Database initialized at: {POSTGRES_SERVER}:{POSTGRES_PORT}/{POSTGRES_DB}")
    print(f"✅ Tables created: tin_chap, tra_gop, lich_su_tra_lai")


# Function to drop all tables (use with caution!)
def drop_db():
    """
    Drop all tables - USE WITH CAUTION!
    """
    Base.metadata.drop_all(bind=engine)
    print("⚠️  All tables dropped!")

