# Simple scheduler using Alpine Linux with cron
FROM alpine:3.18

# Install curl, cronie (cron daemon), and timezone data
RUN apk add --no-cache curl cronie tzdata

# Set timezone to Vietnam
RUN cp /usr/share/zoneinfo/Asia/Ho_Chi_Minh /etc/localtime && \
    echo "Asia/Ho_Chi_Minh" > /etc/timezone

# Create directory for scripts
RUN mkdir -p /app

# Copy scripts
COPY run_daily_payments.sh /app/run_daily_payments.sh
COPY entrypoint.sh /app/entrypoint.sh

# Make scripts executable
RUN chmod +x /app/run_daily_payments.sh /app/entrypoint.sh

# Create crontab file - 0:00 AM Vietnam time every day
# We do not redirect here because the script already logs into /var/log/daily_payments.log
RUN echo "0 0 * * * . /app/.container_env 2>/dev/null || true; /app/run_daily_payments.sh" > /etc/crontabs/root

# Create log file
RUN touch /var/log/daily_payments.log

# Entrypoint handles initial run, cron and log tailing
CMD ["/app/entrypoint.sh"]
