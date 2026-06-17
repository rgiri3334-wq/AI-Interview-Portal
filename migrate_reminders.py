import os
from dotenv import load_dotenv
load_dotenv()

from database.database import engine
from sqlalchemy import text

def migrate():
    try:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE slot_bookings ADD COLUMN IF NOT EXISTS reminder_stage INTEGER DEFAULT 0"))
        print("Migration successful: added reminder_stage")
    except Exception as e:
        if "already exists" in str(e).lower() or "duplicate column" in str(e).lower():
            print("Column already exists, migration skipped.")
        else:
            print(f"Migration error: {e}")

if __name__ == "__main__":
    print("Using engine:", engine.url)
    migrate()
