#!/bin/sh
set -e

LOG_FILE="/var/log/daily_payments.log"
: "${RUN_ON_STARTUP:=true}"

# Ensure log file exists so tail can follow it
mkdir -p "$(dirname "$LOG_FILE")"
touch "$LOG_FILE"

log_start() {
  echo "$(date '+%Y-%m-%d %H:%M:%S %Z'): $1" | tee -a "$LOG_FILE"
}

log_start "Scheduler container starting..."
log_start "Timezone: $(cat /etc/timezone 2>/dev/null || echo 'Unknown')"
log_start "RUN_ON_STARTUP=$RUN_ON_STARTUP"

if [ "$RUN_ON_STARTUP" = "true" ] || [ "$RUN_ON_STARTUP" = "1" ]; then
  log_start "Running daily payment job on startup..."
  /app/run_daily_payments.sh || log_start "Initial run encountered errors"
else
  log_start "Skipping initial job run (RUN_ON_STARTUP=$RUN_ON_STARTUP)"
fi

log_start "Starting cron daemon"
crond

log_start "Tailing scheduler log"
tail -F "$LOG_FILE"
