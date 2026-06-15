import os
import sys
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("No DATABASE_URL found.")
    sys.exit(1)

engine = create_engine(DATABASE_URL)
queries = [
    "ALTER TABLE candidate_answers ALTER COLUMN question_id DROP NOT NULL;",
    "ALTER TABLE keyword_evaluations ALTER COLUMN question_id DROP NOT NULL;",
    "ALTER TABLE question_evaluations ALTER COLUMN question_id DROP NOT NULL;",
    "ALTER TABLE unified_interview_data ALTER COLUMN question_id DROP NOT NULL;"
]

with engine.connect() as conn:
    for q in queries:
        try:
            conn.execute(text(q))
            print(f"Executed: {q}")
        except Exception as e:
            print(f"Failed to execute {q}: {e}")
    conn.commit()
print("Done modifying database schema.")
