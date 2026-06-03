"""
utils/retry_handler.py
Async retry decorator with exponential backoff and rate-limit awareness.
Author: Aditya Singh
"""
import asyncio
import logging
from functools import wraps

logger = logging.getLogger("RetryHandler")


def async_retry(max_attempts: int = 3, base_delay: float = 1.0, exceptions=(Exception,)):
    """Decorator for async functions: retries with exponential backoff."""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            delay = base_delay
            for attempt in range(1, max_attempts + 1):
                try:
                    return await func(*args, **kwargs)
                except exceptions as e:
                    if attempt == max_attempts:
                        logger.error(f"[Retry] {func.__name__} failed after {max_attempts} attempts: {e}")
                        raise
                    logger.warning(f"[Retry] {func.__name__} attempt {attempt} failed: {e}. Retrying in {delay}s...")
                    await asyncio.sleep(delay)
                    delay *= 2  # exponential backoff
        return wrapper
    return decorator
