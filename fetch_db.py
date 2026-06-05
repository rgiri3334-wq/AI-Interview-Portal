import psycopg2

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
cur.execute("SELECT created_at, purpose, is_used FROM otp_store WHERE identifier = 'pratyushaditya06@gmail.com' ORDER BY created_at DESC LIMIT 5")
for row in cur.fetchall():
    print(row)
