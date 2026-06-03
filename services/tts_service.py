import os
import httpx
import logging
from fastapi.responses import StreamingResponse

logger = logging.getLogger("TTS_Service")

# Prefer ElevenLabs, fallback to OpenAI if key exists
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Default voice IDs for professional HR/Technical
ELEVENLABS_VOICE_ID = "pNInz6obpgDQGcFmaJcg" # Adam - Professional, deep
ELEVENLABS_URL = f"https://api.elevenlabs.io/v1/text-to-speech/{ELEVENLABS_VOICE_ID}/stream"

OPENAI_URL = "https://api.openai.com/v1/audio/speech"

async def generate_tts_stream(text: str):
    """
    Generate an audio stream of the given text.
    Prioritizes ElevenLabs, falls back to OpenAI, and fails gracefully.
    BUG-15 fix: Added timeout=30s to all HTTP clients to prevent indefinite hangs.
    """
    if ELEVENLABS_API_KEY:
        headers = {
            "Accept": "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": ELEVENLABS_API_KEY
        }
        data = {
            "text": text,
            "model_id": "eleven_monolingual_v1",
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.75
            }
        }
        
        async def stream_generator():
            async with httpx.AsyncClient(timeout=30.0) as client:
                try:
                    async with client.stream('POST', ELEVENLABS_URL, json=data, headers=headers) as response:
                        response.raise_for_status()
                        async for chunk in response.aiter_bytes():
                            yield chunk
                except Exception as e:
                    logger.error(f"ElevenLabs TTS failed: {e}")
                    yield b""

        return StreamingResponse(stream_generator(), media_type="audio/mpeg")

    elif OPENAI_API_KEY:
        headers = {
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "Content-Type": "application/json"
        }
        data = {
            "model": "tts-1",
            "input": text,
            "voice": "onyx" # Deep, authoritative
        }
        
        async def stream_generator():
            async with httpx.AsyncClient(timeout=30.0) as client:
                try:
                    async with client.stream('POST', OPENAI_URL, json=data, headers=headers) as response:
                        response.raise_for_status()
                        async for chunk in response.aiter_bytes():
                            yield chunk
                except Exception as e:
                    logger.error(f"OpenAI TTS failed: {e}")
                    yield b""
                    
        return StreamingResponse(stream_generator(), media_type="audio/mpeg")
    
    else:
        logger.warning("No TTS API keys found. Emitting fallback mock audio response.")
        # Return empty audio so frontend knows to fallback to native synthesis
        return StreamingResponse(iter([b"mock_audio_fallback"]), media_type="audio/mpeg")
