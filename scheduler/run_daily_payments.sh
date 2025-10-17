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

# API endpoints from environment variables
TRA_GOP_URL="${TRA_GOP_API_URL}"
TIN_CHAP_URL="${TRA_LAI_TIN_CHAP_API_URL}"

call_api() {
    label="$1"
    url="$2"

    if [ -z "$url" ]; then
        log "WARN: $label URL is not configured, skipping"
        return 0
    fi

    log "$label URL: $url"
    log "Calling $label API..."

    set +e
    response=$(curl -s -w "HTTPSTATUS:%{http_code}" -X 'POST' \
      "${url}" \
      -H 'accept: application/json' \
      -d '')
    curl_exit=$?
    set -e

    if [ $curl_exit -ne 0 ]; then
        log "ERROR: $label curl failed with exit code $curl_exit"
        return $curl_exit
    fi

    http_code=$(echo "$response" | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
    body=$(echo "$response" | sed -e 's/HTTPSTATUS\:.*//g')

    log "$label HTTP Status: $http_code"
    log "$label Response: $body"

    if [ "$http_code" -ne 200 ]; then
        log "ERROR: $label API failed (status $http_code)"
        return 1
    fi

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
