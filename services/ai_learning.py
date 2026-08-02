import os
import json
import logging
import threading
from datetime import datetime, timezone
from typing import List, Dict, Optional

logger = logging.getLogger("AILearning")

LESSONS_FILE = "database/ai_lessons.json"
_db_lock = threading.Lock()
MAX_LESSONS_RETAINED = 500


def _ensure_db_exists():
    """Ensure the database directory and file exist."""
    try:
        os.makedirs(os.path.dirname(LESSONS_FILE), exist_ok=True)
        if not os.path.exists(LESSONS_FILE):
            with open(LESSONS_FILE, 'w', encoding='utf-8') as f:
                json.dump([], f)
    except Exception as e:
        logger.error(f"Failed to initialize AI lessons database: {e}")


def save_lesson(mistake: str, rule: str, lesson_learned: str = "",
                future_improvement: str = "") -> None:
    """Safely append a new learning event with concurrency lock."""
    if not mistake or not rule:
        return

    mistake = mistake.strip()
    rule = rule.strip()

    if not mistake or not rule:
        return

    _ensure_db_exists()

    with _db_lock:
        data = []
        try:
            with open(LESSONS_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            data = []

        entry = {
            "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "mistake_made": mistake,
            "lesson_learned": lesson_learned.strip() if lesson_learned else "",
            "future_improvement_areas": future_improvement.strip() if future_improvement else "",
            "new_rule": rule
        }

        data.append(entry)

        # Keep only the newest MAX_LESSONS_RETAINED
        if len(data) > MAX_LESSONS_RETAINED:
            data = data[-MAX_LESSONS_RETAINED:]

        try:
            with open(LESSONS_FILE, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2)
            logger.info("Successfully saved new AI lesson.")
        except Exception as e:
            logger.error(f"Failed to write AI lesson to disk: {e}")


def get_recent_lessons(limit: int = 3) -> List[str]:
    """Fetch the most recent actionable rules for injection."""
    _ensure_db_exists()

    with _db_lock:
        try:
            with open(LESSONS_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return []

        if not data:
            return []

        # Return the 'new_rule' from the last `limit` entries
        recent = data[-limit:]
        return [entry.get("new_rule", "")
                for entry in recent if entry.get("new_rule")]


def get_all_stats() -> Dict:
    """Feed the Admin Dashboard API."""
    _ensure_db_exists()

    with _db_lock:
        try:
            with open(LESSONS_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            data = []

    total_lessons = len(data)
    last_time = data[-1]["timestamp"] if total_lessons > 0 else None

    # Get top 3 active rules
    active_entries = data[-3:] if total_lessons >= 3 else data
    active_rules = [d.get("new_rule", "")
                    for d in active_entries if d.get("new_rule")]

    # Reverse historical log so newest is first for the UI
    historical_log = list(reversed(data))

    return {
        "total_lessons_learned": total_lessons,
        "last_training_time": last_time,
        "active_rules": active_rules,
        "historical_log": historical_log
    }
