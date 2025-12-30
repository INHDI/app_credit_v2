
import sys
import os
import time
import logging

# Add backend directory to sys.path to allow imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.services.gmail import GmailService, parse_vcb_email
from app.crud import lich_su_tra_lai as crud_lich_su

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('gmail_poller.log')
    ]
)
logger = logging.getLogger(__name__)

def main():
    logger.info("Starting Gmail Payment Poller...")
    
    # Initialize Gmail Service
    try:
        gmail = GmailService()
        logger.info("Gmail Service Authenticated Successfully.")
    except Exception as e:
        logger.error(f"Failed to authenticate Gmail: {e}")
        return

    # Polling Loop
    while True:
        try:
            logger.info("Checking for new emails...")
            # Query for VCB emails (unread)
            # Adjust query as needed. For testing, maybe looser query.
            # Production: 'from:VCBDigibank@info.vietcombank.com.vn is:unread'
            query = 'from:VCBDigibank@info.vietcombank.com.vn is:unread' 
            
            messages = gmail.get_unread_messages(query)
            
            if not messages:
                logger.info("No new emails found.")
            
            for msg in messages:
                msg_content = gmail.get_message_content(msg['id'])
                if not msg_content:
                    continue
                    
                subject = msg_content.get('subject', '')
                snippet = msg_content.get('snippet', '')
                body = msg_content.get('body', '')
                
                logger.info(f"Processing email: {subject}")
                
                # Parse Email
                ma_hd, amount = parse_vcb_email(subject, snippet, body)
                
                if ma_hd and amount > 0:
                    logger.info(f"Detected Payment: MaHD={ma_hd}, Amount={amount}")
                    
                    # Process Payment in DB
                    db = SessionLocal()
                    try:
                        result = crud_lich_su.pay_lich_su_by_contract(db, ma_hd, amount)
                        if result:
                            logger.info(f"SUCCESS: Payment processed for {ma_hd}")
                            # Mark as read only if processed successfully
                            gmail.mark_as_read(msg['id'])
                        else:
                            logger.warning(f"FAILED: Payment contract not found or error for {ma_hd}")
                    except Exception as db_err:
                        logger.error(f"Database Error: {db_err}")
                    finally:
                        db.close()
                else:
                    logger.info(f"Skipping: Could not parse MaHD or Amount (Subject: {subject})")
                    # Optional: Mark as read to avoid loop if it's junk? 
                    # Better to leave unread or mark read to clear queue?
                    # For now, match strict rules.
            
        except Exception as e:
            logger.error(f"Error in polling loop: {e}")
        
        # specific delay mentioned by user
        time.sleep(30) 

if __name__ == "__main__":
    main()
