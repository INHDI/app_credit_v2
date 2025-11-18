# Python-based scheduler with cron
FROM python:3.11-alpine

# Install cronie (cron daemon) and timezone data
RUN apk add --no-cache cronie tzdata

# Set timezone to Vietnam
RUN cp /usr/share/zoneinfo/Asia/Ho_Chi_Minh /etc/localtime && \
    echo "Asia/Ho_Chi_Minh" > /etc/timezone

# Create directory for scripts
RUN mkdir -p /app

# Copy Python scripts
COPY run_daily_payments.py /app/run_daily_payments.py
COPY entrypoint.py /app/entrypoint.py

# Install Python dependencies
RUN pip install --no-cache-dir requests pytz

# Make scripts executable
RUN chmod +x /app/run_daily_payments.py /app/entrypoint.py

# Create log directory and file
RUN mkdir -p /var/log && touch /var/log/daily_payments.log

# Entrypoint handles initial run, cron and log tailing
CMD ["/app/entrypoint.py"]
