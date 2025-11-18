#!/bin/sh
set -e

LOG_FILE="/var/log/daily_payments.log"
: "${RUN_ON_STARTUP:=true}"

# Ensure log file exists so tail can follow it
mkdir -p "$(dirname "$LOG_FILE")"
touch "$LOG_FILE"

# Persist selected environment variables for cron executions
# Cron runs with a minimal environment, so we export the variables we need
ENV_SNAPSHOT="/app/.container_env"
env | grep -E '^(URL_API_BACKEND|RUN_ON_STARTUP)=' > "$ENV_SNAPSHOT" 2>/dev/null || true

log_start() {
  echo "$(date '+%Y-%m-%d %H:%M:%S %Z'): $1" | tee -a "$LOG_FILE"
}

log_start "Scheduler container starting..."
log_start "Timezone: $(cat /etc/timezone 2>/dev/null || echo 'Unknown')"
log_start "RUN_ON_STARTUP=$RUN_ON_STARTUP"

if [ "$RUN_ON_STARTUP" = "true" ] || [ "$RUN_ON_STARTUP" = "1" ]; then
  # Optional: wait for backend to become reachable before doing the initial run
  : "${WAIT_FOR_BACKEND_TIMEOUT:=30}"
  wait_for_backend() {
    url="${URL_API_BACKEND}"
    if [ -z "$url" ]; then
      log_start "No URL_API_BACKEND set, skipping backend wait"
      return 0
    fi
    log_start "Waiting up to ${WAIT_FOR_BACKEND_TIMEOUT}s for backend at $url..."
    elapsed=0
    interval=2
    while [ "$elapsed" -lt "$WAIT_FOR_BACKEND_TIMEOUT" ]; do
      # Try a quick HEAD request (some servers may not support OPTIONS)
      if curl -sS --fail --max-time 5 -I "$url" >/dev/null 2>&1; then
        log_start "Backend reachable: $url"
        return 0
      fi
      sleep "$interval"
      elapsed=$((elapsed + interval))
    done
    log_start "Backend did not become reachable within ${WAIT_FOR_BACKEND_TIMEOUT}s; proceeding to initial run"
    return 1
  }

  log_start "Running daily payment job on startup..."
  wait_for_backend || log_start "Backend wait timed out, initial run may fail"
  /app/run_daily_payments.sh || log_start "Initial run encountered errors"
else
  log_start "Skipping initial job run (RUN_ON_STARTUP=$RUN_ON_STARTUP)"
fi

log_start "Starting cron daemon"
crond

log_start "Tailing scheduler log"
tail -F "$LOG_FILE"
