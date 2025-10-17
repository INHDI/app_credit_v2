#!/bin/bash

# Wait for database to be ready
echo "Waiting for database to be ready..."
python -c "
import time
import psycopg2
import os

def wait_for_db():
    max_retries = 30
    retry_count = 0
    
    while retry_count < max_retries:
        try:
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
        except psycopg2.OperationalError:
            retry_count += 1
            print(f'Database not ready, retrying... ({retry_count}/{max_retries})')
            time.sleep(2)
    
    print('Database connection failed after maximum retries')
    return False

wait_for_db()
"

# Initialize database
echo "Initializing database..."
python init_db.py

echo "Database initialization completed!"