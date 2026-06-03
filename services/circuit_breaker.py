"""
services/circuit_breaker.py
Production-grade circuit breaker with per-service state tracking.
States: CLOSED (normal) → OPEN (failing) → HALF_OPEN (probing recovery)

Author: Aditya Singh
Architecture: Thread-safe, async-compatible, configurable thresholds
"""
import asyncio
import logging
import time
from enum import Enum
from typing import Any, Callable, Optional

logger = logging.getLogger("CircuitBreaker")


class CBState(Enum):
    CLOSED    = "closed"      # Normal operation
    OPEN      = "open"        # Failing — reject immediately
    HALF_OPEN = "half_open"   # Testing recovery


class CircuitBreaker:
    """
    Per-service circuit breaker.
    
    Usage:
        cb = CircuitBreaker("gemini", failure_threshold=3, recovery_timeout=60)
        result = await cb.call(my_async_fn, arg1, arg2)
    """

    def __init__(
        self,
        name: str,
        failure_threshold: int = 3,    # trips after N consecutive failures
        recovery_timeout: float = 60.0, # seconds before half-open probe
        success_threshold: int = 2,     # half-open successes before closing
    ):
        self.name               = name
        self.failure_threshold  = failure_threshold
        self.recovery_timeout   = recovery_timeout
        self.success_threshold  = success_threshold

        self._state            = CBState.CLOSED
        self._failure_count    = 0
        self._success_count    = 0
        self._last_failure_ts  = 0.0
        self._lock_instance    = None

    @property
    def _lock(self) -> asyncio.Lock:
        if self._lock_instance is None:
            self._lock_instance = asyncio.Lock()
        return self._lock_instance

    @property
    def state(self) -> CBState:
        return self._state

    @property
    def is_available(self) -> bool:
        """Thread-safe read-only check. State transition happens inside call()."""
        if self._state == CBState.CLOSED:
            return True
        if self._state == CBState.OPEN:
            # Check if recovery timeout has elapsed (no state mutation here)
            return time.monotonic() - self._last_failure_ts >= self.recovery_timeout
        return True  # HALF_OPEN: allow one call

    async def call(self, fn: Callable, *args: Any, **kwargs: Any) -> Any:
        async with self._lock:
            # --- State transition INSIDE the lock to prevent race conditions ---
            if self._state == CBState.OPEN:
                if time.monotonic() - self._last_failure_ts >= self.recovery_timeout:
                    # Fix #13: Transition only once, while holding the lock
                    self._state = CBState.HALF_OPEN
                    self._success_count = 0
                    logger.info(f"[CB:{self.name}] OPEN → HALF_OPEN (recovery probe)")
                else:
                    logger.warning(f"[CB:{self.name}] Circuit OPEN — rejecting call immediately")
                    raise CircuitOpenError(f"Service '{self.name}' circuit breaker is OPEN")

        try:
            result = await fn(*args, **kwargs)
            await self._on_success()
            return result
        except CircuitOpenError:
            raise
        except Exception as exc:
            await self._on_failure(exc)
            raise

    async def _on_success(self):
        async with self._lock:
            if self._state == CBState.HALF_OPEN:
                self._success_count += 1
                if self._success_count >= self.success_threshold:
                    self._state = CBState.CLOSED
                    self._failure_count = 0
                    logger.info(f"[CB:{self.name}] HALF_OPEN → CLOSED (recovered)")
            elif self._state == CBState.CLOSED:
                self._failure_count = 0  # Reset on success

    async def _on_failure(self, exc: Exception):
        async with self._lock:
            self._failure_count += 1
            self._last_failure_ts = time.monotonic()
            logger.warning(f"[CB:{self.name}] Failure #{self._failure_count}: {exc}")

            if self._state == CBState.HALF_OPEN:
                self._state = CBState.OPEN
                logger.error(f"[CB:{self.name}] HALF_OPEN → OPEN (probe failed)")
            elif self._failure_count >= self.failure_threshold:
                self._state = CBState.OPEN
                logger.error(
                    f"[CB:{self.name}] CLOSED → OPEN "
                    f"(threshold {self.failure_threshold} reached). "
                    f"Recovery in {self.recovery_timeout}s"
                )

    def get_status(self) -> dict:
        return {
            "service": self.name,
            "state": self._state.value,
            "failure_count": self._failure_count,
            "last_failure_age_s": round(time.monotonic() - self._last_failure_ts, 1)
            if self._last_failure_ts else None,
        }


class CircuitOpenError(Exception):
    """Raised when a circuit breaker is OPEN and rejects the call."""
    pass


# ── Singleton registry of all circuit breakers ────────────────────────────
_registry: dict[str, CircuitBreaker] = {}


def get_breaker(name: str, **kwargs) -> CircuitBreaker:
    """Get or create a named circuit breaker."""
    if name not in _registry:
        _registry[name] = CircuitBreaker(name, **kwargs)
    return _registry[name]


def all_breaker_status() -> list[dict]:
    """Return status of every registered circuit breaker."""
    return [cb.get_status() for cb in _registry.values()]
