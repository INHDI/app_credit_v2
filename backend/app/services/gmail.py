import os.path
import base64
import re
from typing import List, Optional, Tuple
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

# If modifying these scopes, delete the file token.json.
SCOPES = ['https://www.googleapis.com/auth/gmail.modify']

class GmailService:
    def __init__(self, credentials_path: str = "credentials.json", token_path: str = "token.json"):
        self.creds = None
        self.credentials_path = credentials_path
        self.token_path = token_path
        self.service = None
        self.authenticate()

    def authenticate(self):
        """Authenticate with Gmail API"""
        if os.path.exists(self.token_path):
            self.creds = Credentials.from_authorized_user_file(self.token_path, SCOPES)
        
        # If there are no (valid) credentials available, let the user log in.
        if not self.creds or not self.creds.valid:
            if self.creds and self.creds.expired and self.creds.refresh_token:
                self.creds.refresh(Request())
            else:
                flow = InstalledAppFlow.from_client_secrets_file(
                    self.credentials_path, SCOPES)
                self.creds = flow.run_local_server(port=0)
            
            # Save the credentials for the next run
            with open(self.token_path, 'w') as token:
                token.write(self.creds.to_json())

        self.service = build('gmail', 'v1', credentials=self.creds)

    def get_unread_messages(self, query: str = 'is:unread') -> List[dict]:
        """Get list of unread messages matching query"""
        try:
            results = self.service.users().messages().list(userId='me', q=query).execute()
            messages = results.get('messages', [])
            return messages
        except Exception as e:
            print(f"An error occurred: {e}")
            return []

    def get_message_content(self, msg_id: str) -> dict:
        """Get full message content"""
        try:
            message = self.service.users().messages().get(userId='me', id=msg_id, format='full').execute()
            payload = message.get('payload', {})
            headers = payload.get('headers', [])
            
            subject = next((h['value'] for h in headers if h['name'] == 'Subject'), "No Subject")
            sender = next((h['value'] for h in headers if h['name'] == 'From'), "Unknown")
            snippet = message.get('snippet', '')
            
            # Get Body (Text)
            body = ""
            if 'parts' in payload:
                for part in payload['parts']:
                    if part['mimeType'] == 'text/plain':
                        data = part['body'].get('data')
                        if data:
                            body += base64.urlsafe_b64decode(data).decode()
            elif 'body' in payload:
                data = payload['body'].get('data')
                if data:
                    body += base64.urlsafe_b64decode(data).decode()
            
            return {
                "id": msg_id,
                "subject": subject,
                "sender": sender,
                "snippet": snippet,
                "body": body
            }
        except Exception as e:
            print(f"Error fetching message {msg_id}: {e}")
            return {}

    def mark_as_read(self, msg_id: str):
        """Remove UNREAD label"""
        try:
            self.service.users().messages().modify(
                userId='me',
                id=msg_id,
                body={'removeLabelIds': ['UNREAD']}
            ).execute()
        except Exception as e:
            print(f"Error marking message {msg_id} as read: {e}")

def parse_vcb_email(subject: str, snippet: str, body: str) -> Tuple[Optional[str], Optional[int]]:
    """
    Parse VCB Email to extract MaHD and Amount.
    Returns: (MaHD, Amount) or (None, None)
    
    Heuristic:
    1. Look for 'THANH TOAN HD ...' or 'HD ...' in content/snippet.
    2. Look for Amount (So tien ... VND or +... VND).
    """
    
    # Normalize text for searching
    full_text = f"{subject} {snippet} {body}".upper()
    
    # 1. Extract MaHD
    # Pattern: "HD TC...", "HD TG...", "HOP DONG TC...", "MA HD TC..."
    # Simplified regex: HD\s*([A-Z0-9]+)
    
    # We expect format: "THANH TOAN HD <MA_HD>" from our QR Code
    ma_hd_match = re.search(r'HD\s*([A-Z0-9]+)', full_text)
    ma_hd = ma_hd_match.group(1) if ma_hd_match else None
    
    # 2. Extract Amount
    # Pattern: "+ 10,000,000 VND" or "So tien ... 10,000,000"
    # Regex to find number following "+" or "Amount" or "So tin"
    # VCB Example: "SD TK ... + 1,000,000 VND ..."
    
    amount_match = re.search(r'\+\s*([\d,.]+)\s*VND', full_text)
    if not amount_match:
        # Try alternate pattern: "Số tiền GD: 10,000"
        amount_match = re.search(r'GD[:\s]+([\d,.]+)', full_text)
        
    amount = 0
    if amount_match:
        raw_amount = amount_match.group(1).replace(',', '').replace('.', '')
        try:
            amount = int(raw_amount)
        except:
            amount = 0
            
    return ma_hd, amount
