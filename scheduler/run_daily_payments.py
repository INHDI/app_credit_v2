#!/usr/bin/env python3
"""
Script to call daily payments API with retry logic and logging.
Replaces the shell script run_daily_payments.sh in Python.
"""

import os
import sys
import logging
from datetime import datetime
from pathlib import Path
import requests
from typing import Optional

# Configure logging
LOG_FILE = Path("/var/log/daily_payments.log")
LOG_DIR = LOG_FILE.parent
LOG_DIR.mkdir(parents=True, exist_ok=True)

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


def call_api(label: str, url: str) -> bool:
    """
    Call an API endpoint with retry logic.
    
    Args:
        label: Name/label for logging
        url: Full API URL to call
        
    Returns:
        True if successful, False otherwise
    """
    if not url:
        logger.warning(f"WARN: {label} URL is not configured, skipping")
        return True  # Skip but don't fail

    logger.info(f"{label} URL: {url}")
    logger.info(f"Calling {label} API...")

    max_retries = 5
    retry_delay = 2
    
    for attempt in range(max_retries + 1):
        try:
            response = requests.post(
                url,
                headers={'accept': 'application/json'},
                timeout=10
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
                import time
                time.sleep(retry_delay)
            else:
                logger.error(f"ERROR: {label} connection failed after {max_retries + 1} attempts: {e}")
                return False
                
        except requests.exceptions.HTTPError as e:
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
        
        # Get API URL from environment
        api_url = os.getenv('URL_API_BACKEND', '').strip()
        
        if not api_url:
            logger.error("ERROR: URL_API_BACKEND is not set")
            log_separator()
            logger.info("Scheduler finished with errors")
            return 1

        # Log current time with Vietnam timezone
        import pytz
        tz_vietnam = pytz.timezone('Asia/Ho_Chi_Minh')
        current_time = datetime.now(tz_vietnam).strftime('%Y-%m-%d %H:%M:%S %Z')
        logger.info(f"Current time (Asia/Ho_Chi_Minh): {current_time}")
        
        # Call the API
        success = call_api("AutoCreateLichSu", api_url)
        
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
