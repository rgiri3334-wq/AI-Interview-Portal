import sqlite3
import os

if not os.path.exists('enterprise_ai.db'):
    print("NO SQLITE DB")
else:
    conn = sqlite3.connect('enterprise_ai.db')
    cur = conn.cursor()
    cur.execute("SELECT created_at, otp_hash FROM otp_store WHERE otp_hash = 'eeb406301d15456871fa1dcb4f233cf6b8079273ae469681c3ed6030586aa302'")
    row = cur.fetchone()
    if row:
        print('FOUND IN SQLITE!', row)
    else:
        print('NOT FOUND IN SQLITE')
