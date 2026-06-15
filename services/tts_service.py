import os
import logging
from fastapi.responses import StreamingResponse

logger = logging.getLogger("TTS_Service")

try:
    import edge_tts
    EDGE_TTS_AVAILABLE = True
except ImportError:
    EDGE_TTS_AVAILABLE = False
    logger.error("edge-tts package not found. Please install it.")

# State-of-the-art free neural voice
DEFAULT_VOICE = "en-US-ChristopherNeural"

async def generate_tts_stream(text: str):
    """
    Generate an audio stream of the given text using Microsoft Edge Neural TTS.
    100% permanently free with highly realistic prosody.
    """
    if not EDGE_TTS_AVAILABLE:
        logger.warning("edge-tts missing. Emitting fallback mock audio response.")
        return StreamingResponse(iter([b"mock_audio_fallback"]), media_type="audio/mpeg")

    async def stream_generator():
        try:
            communicate = edge_tts.Communicate(text, DEFAULT_VOICE)
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    yield chunk["data"]
        except Exception as e:
            logger.error(f"Edge TTS failed: {e}")
            yield b""

    return StreamingResponse(stream_generator(), media_type="audio/mpeg")
