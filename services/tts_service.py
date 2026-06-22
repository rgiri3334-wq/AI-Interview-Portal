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

# Formal male HR interviewer voice (free Edge Neural TTS).
# "Andrew Multilingual" is Microsoft's newest, most natural conversational male
# voice — calm and professional, a good fit for a formal HR interviewer.
# Override via the TTS_VOICE env var if you want to A/B test other voices
# (e.g. en-US-BrianMultilingualNeural, en-US-GuyNeural).
DEFAULT_VOICE = os.environ.get("TTS_VOICE", "en-US-AndrewMultilingualNeural")
# Slightly measured pace makes it sound composed/formal rather than rushed.
DEFAULT_RATE = os.environ.get("TTS_RATE", "-3%")

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
            communicate = edge_tts.Communicate(text, DEFAULT_VOICE, rate=DEFAULT_RATE)
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    yield chunk["data"]
        except Exception as e:
            logger.error(f"Edge TTS failed: {e}")
            yield b""

    return StreamingResponse(stream_generator(), media_type="audio/mpeg")
