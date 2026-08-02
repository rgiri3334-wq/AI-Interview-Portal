from database.models import SequenceTracker

def generate_enterprise_id(session, prefix: str, padding: int = 4) -> str:
    """
    Generates a thread-safe auto-incrementing custom ID like SEM0001, INT0015, etc.
    Finds the highest existing ID with that prefix from the sequence_tracker table.
    """
    # Use with_for_update to lock the row for concurrent writes
    tracker = session.query(SequenceTracker).filter_by(prefix=prefix).with_for_update().first()
    if not tracker:
        tracker = SequenceTracker(prefix=prefix, current_value=0)
        session.add(tracker)
        session.flush() # Force insert
        
    tracker.current_value += 1
    session.flush() # Ensure the increment is saved to the active transaction
    return f"{prefix}{str(tracker.current_value).zfill(padding)}"
