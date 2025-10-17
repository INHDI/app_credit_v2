"""
Database initialization script
Run this to create database tables
"""
import sys
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import init_db, engine, POSTGRES_SERVER, POSTGRES_PORT, POSTGRES_DB
from sqlalchemy import inspect


def check_tables_exist():
    """Check if tables already exist"""
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    return len(tables) > 0


def main():
    """Main initialization function"""
    print("="*60)
    print("🗄️  Database Initialization")
    print("="*60)
    print(f"\nDatabase location: {POSTGRES_SERVER}:{POSTGRES_PORT}/{POSTGRES_DB}\n")
    
    # Check if tables exist
    if check_tables_exist():
        print("⚠️  Warning: Tables already exist!")
        # In Docker environment, skip recreation by default
        if os.getenv('ENVIRONMENT') == 'local' or os.getenv('RECREATE_DB', '').lower() == 'true':
            print("Recreating tables...")
            # Drop existing tables
            from app.core.database import drop_db
            drop_db()
            print()
        else:
            print("Skipping table recreation in Docker environment")
            return
    
    # Create tables
    init_db()
    
    # Verify tables created
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    
    print(f"\n📊 Created {len(tables)} tables:")
    for table in tables:
        columns = inspector.get_columns(table)
        print(f"   - {table} ({len(columns)} columns)")
        for col in columns:
            print(f"      • {col['name']}: {col['type']}")
    
    print("\n" + "="*60)
    print("✅ Database initialization completed successfully!")
    print("="*60)
    print("\n💡 You can now start the API server:")
    print("   python main.py")
    print("   or")
    print("   uvicorn app.main:app --reload --port 8081")
    print()


if __name__ == "__main__":
    main()

