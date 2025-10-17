#!/usr/bin/env python3
"""
Backend pre-start script for database initialization
"""
import time
import os
import sys

def wait_for_db():
    """Wait for database to be ready"""
    max_retries = 30
    retry_count = 0
    
    while retry_count < max_retries:
        try:
            import psycopg2
            conn = psycopg2.connect(
                host=os.getenv('POSTGRES_SERVER', 'db'),
                port=os.getenv('POSTGRES_PORT', '5432'),
                database=os.getenv('POSTGRES_DB', 'app'),
                user=os.getenv('POSTGRES_USER', 'postgres'),
                password=os.getenv('POSTGRES_PASSWORD', '')
            )
            conn.close()
            print('Database is ready!')
            return True
        except Exception as e:
            retry_count += 1
            print(f'Database not ready, retrying... ({retry_count}/{max_retries}): {e}')
            time.sleep(2)
    
    print('Database connection failed after maximum retries')
    return False

def main():
    """Main pre-start function"""
    print("="*60)
    print("🚀 Backend Pre-Start")
    print("="*60)
    
    # Wait for database
    if not wait_for_db():
        print("❌ Failed to connect to database")
        sys.exit(1)
    
    # Initialize database
    print("Initializing database...")
    try:
        from app.core.database import init_db
        init_db()
        print("✅ Database initialization completed!")
    except Exception as e:
        print(f"❌ Database initialization failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
