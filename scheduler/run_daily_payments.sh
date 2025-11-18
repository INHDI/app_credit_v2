#!/bin/sh
set -e

# Script to call daily payments API
LOG_FILE="/var/log/daily_payments.log"

# Function to log with timestamp
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S %Z'): $1" | tee -a "$LOG_FILE"
}

LOG_DIR="$(dirname "$LOG_FILE")"
mkdir -p "$LOG_DIR"
touch "$LOG_FILE"

log "=========================================="
log "Starting daily payments creation..."

# Load environment snapshot if exists (for cron runs)
if [ -f /app/.container_env ]; then
    # shellcheck source=/dev/null
    . /app/.container_env
fi

# API endpoints: derive from URL_API_BACKEND
# If URL_API_BACKEND already points to a full endpoint, use it directly.
# Otherwise, assume it is a base URL and append paths as needed.
BASE_URL="${URL_API_BACKEND}"

# If BASE_URL is empty, warn and scripts will skip calls below
TRA_GOP_URL="${BASE_URL}"
TIN_CHAP_URL="${BASE_URL}"

call_api() {
    label="$1"
    url="$2"

    if [ -z "$url" ]; then
        log "WARN: $label URL is not configured, skipping"
        return 0
    fi

    log "$label URL: $url"
    log "Calling $label API..."

    # Use curl's built-in retry mechanism so a simple POST like:
    # curl -X 'POST' 'http://backend:8000/lich-su-tra-lai/auto-create-lich-su' -H 'accept: application/json' -d ''
    # will be sufficient. --fail makes curl return non-zero on HTTP errors (>=400).
    set +e
    response=$(curl -sS --fail --show-error --retry 5 --retry-delay 2 --retry-connrefused -X 'POST' \
      "${url}" \
      -H 'accept: application/json' \
      -d '' 2>&1)
    curl_exit=$?
    set -e

    if [ $curl_exit -ne 0 ]; then
        log "ERROR: $label curl failed (exit $curl_exit): $response"
        return $curl_exit
    fi

    log "$label Response: $response"
    log "SUCCESS: $label API completed"
    return 0
}

log "Current time (Asia/Ho_Chi_Minh): $(TZ='Asia/Ho_Chi_Minh' date '+%Y-%m-%d %H:%M:%S %Z')"

call_api "TraGop" "$TRA_GOP_URL"
tg_status=$?

call_api "TraLaiTinChap" "$TIN_CHAP_URL"
tc_status=$?

if [ $tg_status -ne 0 ] || [ $tc_status -ne 0 ]; then
    log "=========================================="
    log "Scheduler finished with errors"
    exit 1
fi

log "=========================================="
log "Scheduler finished successfully"
exit 0
