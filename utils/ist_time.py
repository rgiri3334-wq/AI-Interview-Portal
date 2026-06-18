"""
IST Time Utility
----------------
Single source of truth for Indian Standard Time (IST = UTC+05:30) across
the entire backend. Import `ist_now` wherever you need the current timestamp.

Usage:
    from utils.ist_time import ist_now, ist_isoformat

    ts = ist_now()          # datetime object (timezone-aware, IST)
    ts_str = ist_isoformat() # "2026-06-18T09:30:00+05:30"
"""

from datetime import datetime, timezone, timedelta

IST = timezone(timedelta(hours=5, minutes=30))

def ist_now() -> datetime:
    """Return current datetime in Indian Standard Time (UTC+5:30)."""
    return datetime.now(IST)

def ist_isoformat() -> str:
    """Return current IST datetime as ISO 8601 string with +05:30 offset."""
    return ist_now().isoformat()

def to_ist(dt: datetime) -> datetime:
    """Convert any timezone-aware datetime to IST."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(IST)

def to_ist_str(dt: datetime) -> str:
    """Convert any timezone-aware datetime to IST ISO string."""
    return to_ist(dt).isoformat()
