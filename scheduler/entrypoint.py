#!/usr/bin/env python3
"""
Entrypoint script for scheduler container.
Replaces entrypoint.sh in Python.
Handles:
1. Log file initialization
2. Environment variable persistence for cron
3. Optional startup run
4. Cron daemon startup
5. Log tailing
"""

import os
import sys
import logging
import subprocess
import time
import signal
from pathlib import Path
from datetime import datetime
import requests
from typing import Optional

# Configuration
LOG_FILE = Path("/var/log/daily_payments.log")
LOG_DIR = LOG_FILE.parent
ENV_SNAPSHOT = Path("/app/.container_env")

# Configure logging
LOG_DIR.mkdir(parents=True, exist_ok=True)
LOG_FILE.touch(exist_ok=True)

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


def log_start(message: str):
    """Log a startup message."""
    logger.info(message)


def persist_environment():
    """Persist selected environment variables for cron executions."""
    env_vars_to_persist = ['URL_API_BACKEND', 'RUN_ON_STARTUP', 'WAIT_FOR_BACKEND_TIMEOUT']
    
    with open(ENV_SNAPSHOT, 'w') as f:
        for var in env_vars_to_persist:
            value = os.getenv(var, '')
            if value:
                f.write(f"{var}={value}\n")
                logger.debug(f"Persisted {var} to .container_env")


def wait_for_backend(url: str, timeout: int = 30) -> bool:
    """
    Wait for backend to become reachable.
    
    Args:
        url: Backend URL to check
        timeout: Max seconds to wait
        
    Returns:
        True if backend is reachable, False if timeout
    """
    if not url:
        log_start("No URL_API_BACKEND set, skipping backend wait")
        return True

    log_start(f"Waiting up to {timeout}s for backend at {url}...")
    
    elapsed = 0
    interval = 2
    
    while elapsed < timeout:
        try:
            response = requests.head(url, timeout=5)
            log_start(f"Backend reachable: {url}")
            return True
        except Exception:
            pass
        
        time.sleep(interval)
        elapsed += interval

    log_start(f"Backend did not become reachable within {timeout}s; proceeding to initial run")
    return False


def run_initial_job():
    """Run the daily payments job on startup."""
    try:
        result = subprocess.run(
            [sys.executable, '/app/run_daily_payments.py'],
            capture_output=True,
            text=True
        )
        
        if result.stdout:
            logger.info(result.stdout)
        if result.stderr:
            logger.error(result.stderr)
            
        return result.returncode == 0
    except Exception as e:
        log_start(f"Initial run encountered errors: {e}")
        return False


def start_cron():
    """Start the cron daemon."""
    try:
        # Create crontab entry for daily execution at 5:00 AM
        crontab_entry = (
            "0 1 * * * "
            ". /app/.container_env 2>/dev/null || true; "
            f"{sys.executable} /app/run_daily_payments.py"
        )
        
        crontab_file = Path("/etc/crontabs/root")
        crontab_file.parent.mkdir(parents=True, exist_ok=True)
        
        with open(crontab_file, 'w') as f:
            f.write(crontab_entry + "\n")
        
        logger.info(f"Crontab entry created: {crontab_entry}")
        
        # Start cron daemon
        subprocess.Popen(['crond', '-f'], 
                        stdout=subprocess.PIPE, 
                        stderr=subprocess.PIPE)
        log_start("Starting cron daemon")
        
    except Exception as e:
        logger.error(f"Failed to start cron: {e}")
        raise


def tail_log():
    """Tail the log file and print to stdout."""
    try:
        log_start("Tailing scheduler log")
        with open(LOG_FILE, 'r') as f:
            # Read to end
            f.seek(0, 2)
            while True:
                line = f.readline()
                if line:
                    print(line.rstrip())
                else:
                    time.sleep(0.1)
    except KeyboardInterrupt:
        logger.info("Log tailing interrupted")
    except Exception as e:
        logger.error(f"Error tailing log: {e}")


def main():
    """Main entrypoint function."""
    try:
        log_start("Scheduler container starting...")
        
        # Log timezone
        try:
            with open('/etc/timezone', 'r') as f:
                tz = f.read().strip()
        except:
            tz = 'Unknown'
        log_start(f"Timezone: {tz}")
        
        # Get RUN_ON_STARTUP setting
        run_on_startup = os.getenv('RUN_ON_STARTUP', 'true').lower() in ('true', '1')
        log_start(f"RUN_ON_STARTUP={run_on_startup}")
        
        # Persist environment variables for cron
        persist_environment()
        
        # Handle initial run
        if run_on_startup:
            api_url = os.getenv('URL_API_BACKEND', '').strip()
            wait_timeout = int(os.getenv('WAIT_FOR_BACKEND_TIMEOUT', '30'))
            
            log_start("Running daily payment job on startup...")
            
            if api_url:
                if not wait_for_backend(api_url, wait_timeout):
                    log_start("Backend wait timed out, initial run may fail")
            
            if not run_initial_job():
                log_start("Initial run encountered errors")
        else:
            log_start(f"Skipping initial job run (RUN_ON_STARTUP={run_on_startup})")
        
        # Start cron daemon
        start_cron()
        
        # Tail log file
        tail_log()
        
    except Exception as e:
        logger.exception(f"Fatal error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        logger.info("Scheduler interrupted by user")
        sys.exit(0)
