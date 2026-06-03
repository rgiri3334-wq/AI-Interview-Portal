import sqlite3
import time

def migrate():
    # Wait to ensure db is not locked by the running server
    # Or just use timeout
    conn = sqlite3.connect("database.db", timeout=30.0)
    cursor = conn.cursor()
    columns_to_add = [
        ("problem_solving_score", "FLOAT DEFAULT 0.0"),
        ("role_alignment_score", "FLOAT DEFAULT 0.0"),
        ("professionalism_score", "FLOAT DEFAULT 0.0"),
        ("learning_potential_score", "FLOAT DEFAULT 0.0"),
        ("fluency_score", "FLOAT DEFAULT 0.0")
    ]
    
    # Get existing columns
    cursor.execute("PRAGMA table_info(interview_sessions)")
    existing_columns = [row[1] for row in cursor.fetchall()]
    
    for col_name, col_type in columns_to_add:
        if col_name not in existing_columns:
            try:
                cursor.execute(f"ALTER TABLE interview_sessions ADD COLUMN {col_name} {col_type}")
                print(f"Added column {col_name}")
            except Exception as e:
                print(f"Failed to add {col_name}: {e}")
        else:
            print(f"Column {col_name} already exists")
            
    conn.commit()
    conn.close()

if __name__ == "__main__":
    migrate()
