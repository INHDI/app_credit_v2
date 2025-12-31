#!/usr/bin/env python3
"""
Script to call daily payments API with retry logic and logging.
Replaces the shell script run_daily_payments.sh in Python.
"""

import os
import sys
import logging
import time
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse
import requests
from typing import Optional

# Configure logging
LOG_FILE = Path("/var/log/daily_payments.log")
LOG_DIR = LOG_FILE.parent
# Ensure log directory exists (try/except for permission issues if not running as root)
try:
    LOG_DIR.mkdir(parents=True, exist_ok=True)
except PermissionError:
    # Fallback to local directory if /var/log is not accessible
    LOG_FILE = Path("daily_payments.log")

# Configure logger with timestamp format
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S %Z',
    handlers=[
        logging.FileHandler(LOG_FILE),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)


def log_separator():
    """Log a separator line."""
    logger.info("=" * 50)


def load_environment():
    """Load environment variables from .container_env if it exists."""
    env_file = Path("/app/.container_env")
    if env_file.exists():
        with open(env_file, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#'):
                    if '=' in line:
                        key, value = line.split('=', 1)
                        os.environ[key] = value
                        logger.debug(f"Loaded {key} from .container_env")


def login(base_url: str, email: str, password: str) -> Optional[str]:
    """
    Login to get access token.
    
    Args:
        base_url: Base API URL
        email: Admin email
        password: Admin password
        
    Returns:
        Access token string if successful, None otherwise
    """
    login_url = f"{base_url}/auth/login"
    logger.info(f"Logging in to {login_url} as {email}...")
    
    try:
        response = requests.post(
            login_url,
            json={"email": email, "password": password},
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success') and data.get('data') and data['data'].get('token'):
                logger.info("Login successful")
                return data['data']['token']['access_token']
        
        logger.error(f"Login failed: {response.status_code} - {response.text}")
        return None
        
    except Exception as e:
        logger.error(f"Login error: {e}")
        return None


def call_api(label: str, url: str, token: str = None) -> bool:
    """
    Call an API endpoint with retry logic and optional auth.
    
    Args:
        label: Name/label for logging
        url: Full API URL to call
        token: Optional JWT access token
        
    Returns:
        True if successful, False otherwise
    """
    if not url:
        logger.warning(f"WARN: {label} URL is not configured, skipping")
        return True  # Skip but don't fail

    logger.info(f"{label} URL: {url}")
    logger.info(f"Calling {label} API...")

    headers = {'accept': 'application/json'}
    if token:
        headers['Authorization'] = f"Bearer {token}"

    max_retries = 5
    retry_delay = 2
    
    for attempt in range(max_retries + 1):
        try:
            response = requests.post(
                url,
                headers=headers,
                timeout=30  # Increased timeout for long processing
            )
            
            # Log response
            logger.info(f"{label} Response Status: {response.status_code}")
            logger.info(f"{label} Response Body: {response.text}")
            
            # Check for HTTP errors
            response.raise_for_status()
            
            logger.info(f"SUCCESS: {label} API completed")
            return True
            
        except requests.exceptions.ConnectionError as e:
            if attempt < max_retries:
                logger.warning(
                    f"Connection error on attempt {attempt + 1}/{max_retries + 1}: {e}. "
                    f"Retrying in {retry_delay}s..."
                )
                time.sleep(retry_delay)
            else:
                logger.error(f"ERROR: {label} connection failed after {max_retries + 1} attempts: {e}")
                return False
                
        except requests.exceptions.HTTPError as e:
            # If 401 Unauthorized, retrying might not help unless token expired? 
            # But here we just got the token, so probably auth config error.
            if response.status_code == 401:
                logger.error(f"ERROR: {label} Authentication failed (401)")
                return False
            logger.error(f"ERROR: {label} HTTP error: {e}")
            return False
            
        except requests.exceptions.RequestException as e:
            logger.error(f"ERROR: {label} request failed: {e}")
            return False

    return False


def main():
    """Main scheduler function."""
    try:
        log_separator()
        logger.info("Starting daily payments creation...")
        
        # Load environment variables
        load_environment()
        
        # Get configuration
        api_url = os.getenv('URL_API_BACKEND', '').strip()
        admin_email = os.getenv('ADMIN_EMAIL', '').strip()
        admin_password = os.getenv('ADMIN_PASSWORD', '').strip()
        
        if not api_url:
            logger.error("ERROR: URL_API_BACKEND is not set")
            log_separator()
            return 1

        # Check for auth requirements
        token = None
        if admin_email and admin_password:
            # Derive base URL from api_url (e.g., http://host:port/path -> http://host:port)
            parsed_url = urlparse(api_url)
            base_url = f"{parsed_url.scheme}://{parsed_url.netloc}"
            
            # Login
            token = login(base_url, admin_email, admin_password)
            if not token:
                logger.error("ERROR: Authentication required but login failed")
                log_separator()
                return 1
        else:
            logger.warning("WARN: ADMIN_EMAIL/ADMIN_PASSWORD not set. Proceeding without authentication.")

        # Log current time with Vietnam timezone
        try:
            import pytz
            tz_vietnam = pytz.timezone('Asia/Ho_Chi_Minh')
            current_time = datetime.now(tz_vietnam).strftime('%Y-%m-%d %H:%M:%S %Z')
        except ImportError:
            current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S (Local)')
            
        logger.info(f"Current time: {current_time}")
        
        # Call the API
        success = call_api("AutoCreateLichSu", api_url, token)
        
        log_separator()
        if success:
            logger.info("Scheduler finished successfully")
            return 0
        else:
            logger.info("Scheduler finished with errors")
            return 1
            
    except Exception as e:
        logger.exception(f"Unexpected error: {e}")
        log_separator()
        logger.info("Scheduler finished with errors")
        return 1


if __name__ == "__main__":
    sys.exit(main())
