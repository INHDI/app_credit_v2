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
    from app.models import TinChap, TraGop, LichSuTraLai, LichSu, User
    
    # Create all tables
    Base.metadata.create_all(bind=engine)
    print(f"✅ Database initialized at: {POSTGRES_SERVER}:{POSTGRES_PORT}/{POSTGRES_DB}")
    print(f"✅ Tables created: tin_chap, tra_gop, lich_su_tra_lai, lich_su, user")


# Function to update tables based on model changes
def update_db():
    """
    Update database tables based on model changes.
    Adds new columns defined in models if they don't exist yet.
    Note: This uses Alembic-style migrations for safe updates.
    """
    from sqlalchemy import inspect, text
    
    # Import all models to ensure they are registered with Base
    from app.models import TinChap, TraGop, LichSuTraLai, LichSu, User
    
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()
    
    # Get all table names from models
    for table in Base.metadata.tables.values():
        table_name = table.name
        
        if table_name in existing_tables:
            # Table exists, check for missing columns
            existing_columns = {col['name'] for col in inspector.get_columns(table_name)}
            model_columns = {col.name for col in table.columns}
            missing_columns = model_columns - existing_columns
            
            if missing_columns:
                print(f"📝 Table '{table_name}' - Adding missing columns: {missing_columns}")
                for column in table.columns:
                    if column.name in missing_columns:
                        # Build ALTER TABLE statement
                        col_type = str(column.type.compile(engine.dialect))
                        nullable = "NULL" if column.nullable else "NOT NULL"
                        
                        alter_sql = f"ALTER TABLE {table_name} ADD COLUMN {column.name} {col_type} {nullable};"
                        try:
                            with engine.connect() as conn:
                                conn.execute(text(alter_sql))
                                conn.commit()
                            print(f"   ✅ Added column '{column.name}' to '{table_name}'")
                        except Exception as e:
                            print(f"   ⚠️  Could not add column '{column.name}': {str(e)}")
            else:
                print(f"✅ Table '{table_name}' - All columns exist")
        else:
            # Table doesn't exist, create it
            print(f"📝 Creating new table: {table_name}")
            Base.metadata.create_all(bind=engine, tables=[table])
            print(f"   ✅ Table '{table_name}' created")
    
    print("✅ Database update completed!")


# Function to drop all tables (use with caution!)
def drop_db():
    """
    Drop all tables - USE WITH CAUTION!
    """
    Base.metadata.drop_all(bind=engine)
    print("⚠️  All tables dropped!")

