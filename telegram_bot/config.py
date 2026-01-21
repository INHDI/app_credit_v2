"""
Telegram Bot Configuration
Load settings from environment variables or database
"""
import os
from dotenv import load_dotenv

load_dotenv()

# Telegram Bot Token
# Telegram Bot Token (Optional if in DB)
BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")

# Database connection string
POSTGRES_SERVER = os.getenv("POSTGRES_SERVER", "localhost")
POSTGRES_PORT = os.getenv("POSTGRES_PORT", "5436")
POSTGRES_DB = os.getenv("POSTGRES_DB", "app")
POSTGRES_USER = os.getenv("POSTGRES_USER", "postgres")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "")

DATABASE_URL = f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_SERVER}:{POSTGRES_PORT}/{POSTGRES_DB}"

# API Configuration (Bot uses same paths as Frontend - no /api/v1 prefix)
API_BASE_URL = os.getenv("API_BASE_URL", "http://backend:8000")
BOT_ADMIN_EMAIL = os.getenv("BOT_ADMIN_EMAIL", "bot@appcredit.com")
BOT_ADMIN_PASSWORD = os.getenv("BOT_ADMIN_PASSWORD", "bot_secure_pass_2024")

# Bot settings
BOT_NAME = "CreditApp Bot"
BOT_ISSUER = "CreditApp"

# Logging
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
