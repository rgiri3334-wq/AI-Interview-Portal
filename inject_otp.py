import psycopg2
import hashlib
import time
from datetime import datetime, timezone
import uuid

with open('.env', 'rb') as f:
    content = f.read()
lines = content.decode('utf-16le' if content.startswith(b'\xff\xfe') else 'utf-8', errors='ignore').splitlines()
db_url = ''
for l in lines:
    if l.startswith('DATABASE_URL='):
        db_url = l.split('=', 1)[1].strip()
        db_url = db_url.strip('"').strip("'")

conn = psycopg2.connect(db_url)
cur = conn.cursor()

raw_code = '777777'
otp_hash = hashlib.sha256(raw_code.encode()).hexdigest()
expires_iso = datetime.fromtimestamp(time.time() + 1800, tz=timezone.utc).isoformat()
created_at = datetime.now(timezone.utc).isoformat()
otp_id = 'OTP-' + str(uuid.uuid4())[:8]

cur.execute("""
    UPDATE otp_store SET is_used = True WHERE identifier = 'pratyushaditya06@gmail.com' AND purpose = 'registration'
""")

cur.execute("""
    INSERT INTO otp_store (otp_id, identifier, otp_hash, purpose, expires_at, created_at, is_used, attempts)
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
""", (otp_id, 'pratyushaditya06@gmail.com', otp_hash, 'registration', expires_iso, created_at, False, 0))

conn.commit()
print('Inserted magic OTP: 777777')
