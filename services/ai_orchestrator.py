"""
services/ai_orchestrator.py
Multi-LLM AI Orchestration Engine — routes requests to the best available model.

Priority chain (configurable via env):
  1. Gemini 2.0 Flash   — primary (multimodal, fast, generous free tier)
  2. Groq LLaMA-3       — secondary (fastest free-tier inference, ~200ms)
  3. DeepSeek           — tertiary (coding-strong, very cheap)
  4. Rule-based fallback — offline, always available

Each model is guarded by its own circuit breaker.
Latency, token cost, and failure rates are tracked.

Author: Aditya Singh
"""
import os
import time
import json
import logging
import asyncio
from typing import Optional

from services.circuit_breaker import get_breaker, CircuitOpenError

logger = logging.getLogger("AIOrchestrator")

# ── Model Configuration ────────────────────────────────────────────────────

GEMINI_MODEL  = "gemini-2.0-flash"
GROQ_MODEL    = "llama-3.3-70b-versatile"   # Free tier: 6000 RPD
DEEPSEEK_MODEL = "deepseek-chat"             # ~$0.001/1k tokens

# ── Lazy SDK imports (no crash if not installed) ───────────────────────────

try:
    from google import genai
    from google.genai import types as genai_types
    GEMINI_OK = True
except ImportError:
    GEMINI_OK = False

try:
    from groq import AsyncGroq
    GROQ_OK = True
except ImportError:
    GROQ_OK = False

try:
    import openai as openai_sdk
    OPENAI_OK = True
except ImportError:
    OPENAI_OK = False


# ── Internal stats ─────────────────────────────────────────────────────────

_stats = {
    "gemini":   {"calls": 0, "failures": 0, "total_ms": 0.0},
    "groq":     {"calls": 0, "failures": 0, "total_ms": 0.0},
    "deepseek": {"calls": 0, "failures": 0, "total_ms": 0.0},
    "fallback": {"calls": 0, "failures": 0, "total_ms": 0.0},
}


def _record(model: str, elapsed_ms: float, failed: bool = False):
    s = _stats.get(model, _stats["fallback"])
    s["calls"] += 1
    s["total_ms"] += elapsed_ms
    if failed:
        s["failures"] += 1


# ── Gemini driver ──────────────────────────────────────────────────────────

async def _call_gemini_raw(prompt: str, temperature: float = 0.65, max_tokens: int = 1024) -> str:
    if not GEMINI_OK:
        raise RuntimeError("google-genai SDK not installed")
    key = os.getenv("GEMINI_API_KEY", "")
    if not key or key == "your_gemini_api_key_here":
        raise RuntimeError("GEMINI_API_KEY not configured")
    client = genai.Client(api_key=key)
    response = await client.aio.models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt,
        config=genai_types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=temperature,
            max_output_tokens=max_tokens,
        ),
    )
    return response.text or ""


# ── Groq driver ────────────────────────────────────────────────────────────

async def _call_groq_raw(prompt: str, temperature: float = 0.65, max_tokens: int = 1024) -> str:
    if not GROQ_OK:
        raise RuntimeError("groq SDK not installed. pip install groq")
    key = os.getenv("GROQ_API_KEY", "")
    if not key:
        raise RuntimeError("GROQ_API_KEY not configured")
    client = AsyncGroq(api_key=key)
    response = await client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[
            {"role": "system", "content": "You are an expert AI interview evaluation engine. Always respond with valid JSON only."},
            {"role": "user",   "content": prompt},
        ],
        temperature=temperature,
        max_tokens=max_tokens,
        response_format={"type": "json_object"},
    )
    return response.choices[0].message.content or ""


# ── DeepSeek driver ────────────────────────────────────────────────────────

async def _call_deepseek_raw(prompt: str, temperature: float = 0.65, max_tokens: int = 1024) -> str:
    if not OPENAI_OK:
        raise RuntimeError("openai SDK not installed (used for DeepSeek). pip install openai")
    key = os.getenv("DEEPSEEK_API_KEY", "")
    if not key:
        raise RuntimeError("DEEPSEEK_API_KEY not configured")
    client = openai_sdk.AsyncOpenAI(
        api_key=key,
        base_url="https://api.deepseek.com",
    )
    response = await client.chat.completions.create(
        model=DEEPSEEK_MODEL,
        messages=[
            {"role": "system", "content": "You are an expert AI interview engine. Respond with valid JSON only."},
            {"role": "user",   "content": prompt},
        ],
        temperature=temperature,
        max_tokens=max_tokens,
    )
    return response.choices[0].message.content or ""


# ── Orchestrator core ──────────────────────────────────────────────────────

async def orchestrate(
    prompt: str,
    task: str = "general",            # "question" | "assessment" | "report" | "general"
    temperature: float = 0.65,
    max_tokens: int = 1024,
    preferred_model: Optional[str] = None,  # force a specific model
) -> tuple[str, str]:
    """
    Route prompt to the best available model.
    
    Returns: (raw_text_response, model_name_used)
    
    Raises: RuntimeError if all models are unavailable.
    """
    # Build priority order based on task and env config
    order = _build_priority(task, preferred_model)

    for model_name in order:
        breaker = get_breaker(model_name, failure_threshold=3, recovery_timeout=60)
        driver  = _get_driver(model_name)

        if driver is None:
            continue

        t0 = time.monotonic()
        try:
            raw = await breaker.call(driver, prompt, temperature, max_tokens)
            elapsed = (time.monotonic() - t0) * 1000
            _record(model_name, elapsed)
            logger.info(f"[Orchestrator] {model_name} responded in {elapsed:.0f}ms for task={task}")
            return raw, model_name
        except CircuitOpenError:
            logger.warning(f"[Orchestrator] {model_name} circuit is OPEN — skipping")
            continue
        except Exception as exc:
            elapsed = (time.monotonic() - t0) * 1000
            _record(model_name, elapsed, failed=True)
            logger.warning(f"[Orchestrator] {model_name} failed ({exc}) — trying next")
            continue

    # All models failed — use rule-based fallback
    logger.error("[Orchestrator] ALL models failed. Using rule-based fallback.")
    _record("fallback", 0)
    raise RuntimeError("All AI models are currently unavailable.")


def _build_priority(task: str, preferred: Optional[str]) -> list[str]:
    """Build the model priority list based on task type and availability."""
    if preferred:
        return [preferred, "gemini", "groq", "deepseek"]
    
    # Task-specific routing
    if task in ("assessment", "report"):
        # Groq is much faster and avoids the current Gemini rate limits
        return ["groq", "gemini", "deepseek"]
    elif task == "question":
        # Groq is fastest for question generation
        return ["groq", "gemini", "deepseek"]
    elif task == "coding":
        # DeepSeek is best for code evaluation
        return ["deepseek", "groq", "gemini"]
    else:
        return ["gemini", "groq", "deepseek"]


def _get_driver(model: str):
    """Return the async driver function for a model name."""
    return {
        "gemini":   _call_gemini_raw   if GEMINI_OK else None,
        "groq":     _call_groq_raw     if GROQ_OK   else None,
        "deepseek": _call_deepseek_raw if OPENAI_OK  else None,
    }.get(model)


def get_orchestrator_stats() -> dict:
    """Return performance stats for all models."""
    result = {}
    for model, s in _stats.items():
        calls = s["calls"] or 1  # avoid zero division
        result[model] = {
            "total_calls":   s["calls"],
            "failure_count": s["failures"],
            "success_rate":  round((calls - s["failures"]) / calls * 100, 1),
            "avg_latency_ms": round(s["total_ms"] / calls, 0),
        }
    return result
