"""
services/whisper_service.py
Real-time audio transcription engine.

Priority chain:
  1. Groq Whisper API — `whisper-large-v3-turbo` (~300ms, free: 28800s/day)
  2. OpenAI Whisper   — fallback if Groq is unavailable  
  3. None             — frontend falls back to browser SpeechRecognition

This endpoint receives raw audio bytes (webm/wav) and returns transcript text.

Author: Aditya Singh
"""
import os
import io
import logging
from typing import Optional

logger = logging.getLogger("WhisperService")

GROQ_WHISPER_MODEL  = "whisper-large-v3-turbo"
OPENAI_WHISPER_MODEL = "whisper-1"

try:
    from groq import AsyncGroq
    GROQ_OK = True
except ImportError:
    GROQ_OK = False
    logger.warning("groq SDK not installed. Whisper via Groq unavailable. pip install groq")

try:
    import openai as openai_sdk
    OPENAI_OK = True
except ImportError:
    OPENAI_OK = False


async def transcribe_audio(
    audio_bytes: bytes,
    filename: str = "audio.webm",
    language: str = "en",
) -> dict:
    """
    Transcribe audio bytes to text using the fastest available service.
    
    Returns:
        {
            "transcript": str,
            "confidence": float,  # 0.0 - 1.0
            "model_used": str,
            "duration_ms": int,
        }
    """
    if not audio_bytes:
        return _empty_result("no_audio")

    # Try Groq first (fastest, generous free tier)
    groq_key = os.getenv("GROQ_API_KEY", "")
    if GROQ_OK and groq_key:
        try:
            return await _transcribe_groq(audio_bytes, filename, language)
        except Exception as e:
            logger.warning(f"Groq Whisper failed: {e}. Trying OpenAI.")

    # Try OpenAI Whisper as fallback
    openai_key = os.getenv("OPENAI_API_KEY", "")
    if OPENAI_OK and openai_key:
        try:
            return await _transcribe_openai(audio_bytes, filename, language)
        except Exception as e:
            logger.warning(f"OpenAI Whisper failed: {e}.")

    logger.error("All Whisper services unavailable. Frontend should use browser SpeechRecognition.")
    return _empty_result("all_services_down")


async def _transcribe_groq(audio_bytes: bytes, filename: str, language: str) -> dict:
    import time
    t0 = time.monotonic()

    client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))

    # Groq expects a file-like tuple: (filename, bytes)
    response = await client.audio.transcriptions.create(
        file=(filename, audio_bytes),
        model=GROQ_WHISPER_MODEL,
        language=language,
        response_format="verbose_json",
        temperature=0.0,
    )
    
    elapsed_ms = int((time.monotonic() - t0) * 1000)
    transcript = response.text or ""
    
    logger.info(f"Groq Whisper transcribed {len(audio_bytes)/1024:.1f}KB in {elapsed_ms}ms: '{transcript[:60]}...'")
    
    return {
        "transcript": transcript.strip(),
        "confidence": 0.95,  # Groq Whisper Large v3 is very accurate
        "model_used": f"groq/{GROQ_WHISPER_MODEL}",
        "duration_ms": elapsed_ms,
    }


async def _transcribe_openai(audio_bytes: bytes, filename: str, language: str) -> dict:
    import time
    t0 = time.monotonic()
    
    client = openai_sdk.AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    
    response = await client.audio.transcriptions.create(
        model=OPENAI_WHISPER_MODEL,
        file=(filename, audio_bytes),
        language=language,
    )
    
    elapsed_ms = int((time.monotonic() - t0) * 1000)
    transcript = response.text or ""
    
    return {
        "transcript": transcript.strip(),
        "confidence": 0.93,
        "model_used": f"openai/{OPENAI_WHISPER_MODEL}",
        "duration_ms": elapsed_ms,
    }


def _empty_result(reason: str) -> dict:
    return {
        "transcript": "",
        "confidence": 0.0,
        "model_used": "none",
        "duration_ms": 0,
        "error": reason,
    }


def is_whisper_available() -> bool:
    """Check if at least one Whisper backend is configured."""
    return (
        (GROQ_OK and bool(os.getenv("GROQ_API_KEY"))) or
        (OPENAI_OK and bool(os.getenv("OPENAI_API_KEY")))
    )


def get_whisper_status() -> dict:
    groq_key = os.getenv("GROQ_API_KEY", "")
    openai_key = os.getenv("OPENAI_API_KEY", "")
    return {
        "groq_available":   GROQ_OK and bool(groq_key),
        "openai_available": OPENAI_OK and bool(openai_key),
        "recommended":      "groq" if (GROQ_OK and groq_key) else ("openai" if (OPENAI_OK and openai_key) else "browser"),
        "model":            GROQ_WHISPER_MODEL if (GROQ_OK and groq_key) else OPENAI_WHISPER_MODEL,
    }
