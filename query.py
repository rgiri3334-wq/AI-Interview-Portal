import os
from dotenv import load_dotenv
load_dotenv(".env")

from database.models import OTPStore
from database.database import SessionLocal

db = SessionLocal()
for r in db.query(OTPStore).filter(OTPStore.identifier == 'pratyushaditya06@gmail.com').order_by(OTPStore.created_at.desc()).limit(3).all():
    print(r.created_at, r.expires_at, r.is_used, r.attempts, r.otp_hash)
