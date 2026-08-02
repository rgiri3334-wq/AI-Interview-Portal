"""
services/realtime_transcriber.py
Server-side STT engine for WebSocket audio stream processing.

ARCHITECTURE NOTE:
In the current v5 architecture, real-time transcription is handled by:
  1. Browser Web Speech API (primary, zero-latency edge computing)
  2. Whisper via Groq/OpenAI (on-demand via /api/transcribe endpoint)

This service is retained as a hook point for future Faster-Whisper streaming
integration. It is intentionally a no-op — all STT runs client-side.

Author: Aditya Singh
"""
import logging

logger = logging.getLogger("RealTimeTranscriber")


class RealTimeTranscriber:
    """
    STT Engine wrapper for continuous WebSocket stream processing.

    Currently a no-op — the browser's Web Speech API handles real-time STT.
    For server-side streaming STT, integrate Faster-Whisper:
        pip install faster-whisper
        from faster_whisper import WhisperModel
        model = WhisperModel("base", device="cpu")
    """

    def __init__(self):
        self.active_streams = {}

    def process_audio_chunk(self, candidate_id: str,
                            chunk: bytes) -> str | None:
        """
        Process incoming binary audio chunk from WebSocket.

        In the current architecture, this is a no-op.
        Returns None (no server-side transcript available).
        """
        # Intentional no-op: STT is handled by browser Web Speech API.
        # To enable server-side streaming STT in the future:
        #   1. Buffer chunks per candidate_id in self.active_streams
        #   2. When buffer reaches ~1 second, transcribe with Faster-Whisper
        #   3. Return the partial transcript
        return None
