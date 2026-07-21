"""
services/speech_analysis.py
Speech fluency and audio quality analysis.

Analyzes transcript text for speech anomalies like stuttering patterns,
filler words, and speaking pace. Works with the text output from the
Whisper transcription pipeline (services/whisper_service.py).

Author: Aditya Singh
"""
import re
import logging

logger = logging.getLogger("SpeechAnalysis")

# Common filler words and hesitation markers
FILLER_PATTERNS = [
    r'\bum+\b', r'\buh+\b', r'\bhmm+\b', r'\bmhm+\b',
    r'\blike\b', r'\byou know\b', r'\bactually\b',
    r'\bbasically\b', r'\bliterally\b', r'\bso+\b(?=\s)',
    r'\bI mean\b', r'\bright\b(?=\s*,|\s*\.|\s+so)',
]

# Stutter patterns: repeated syllables like "I-I", "the-the"
STUTTER_PATTERN = re.compile(r'\b(\w{1,4})-\1\b', re.IGNORECASE)

# Repeated word patterns: "I I", "the the the"
REPEAT_PATTERN = re.compile(r'\b(\w+)\s+\1\b', re.IGNORECASE)


def detect_speech_anomalies(transcript: str) -> dict:
    """
    Analyze transcript text for speech anomalies.

    Args:
        transcript: The text transcript from Whisper/browser STT.

    Returns:
        {
            "filler_count": int,
            "filler_words": list[str],    # actual filler words found
            "stutter_events": int,
            "repeat_events": int,
            "clarity_index": float,       # 0-100, higher = clearer speech
            "long_pauses": int,           # count of "..." in transcript
        }
    """
    if not transcript or not transcript.strip():
        return {
            "filler_count": 0,
            "filler_words": [],
            "stutter_events": 0,
            "repeat_events": 0,
            "clarity_index": 50.0,
            "long_pauses": 0,
        }

    lower = transcript.lower()
    words = transcript.split()
    total_words = len(words)

    # Count filler words
    filler_words_found = []
    filler_count = 0
    for pattern in FILLER_PATTERNS:
        matches = re.findall(pattern, lower)
        filler_count += len(matches)
        filler_words_found.extend(matches)

    # Count stutters (e.g., "I-I", "th-the")
    stutter_events = len(STUTTER_PATTERN.findall(lower))

    # Count repeated words (e.g., "the the")
    repeat_events = len(REPEAT_PATTERN.findall(lower))

    # Count long pauses (represented as "..." in Whisper output)
    long_pauses = lower.count("...")

    # Calculate clarity index
    # Start at 100, penalize for fillers, stutters, repeats
    if total_words > 0:
        filler_ratio = filler_count / total_words
        clarity = 100.0 - (filler_ratio * 200)  # 10% fillers = -20 points
        clarity -= stutter_events * 3.0
        clarity -= repeat_events * 2.0
        clarity -= long_pauses * 1.5
        clarity_index = max(0.0, min(100.0, clarity))
    else:
        clarity_index = 50.0

    return {
        "filler_count": filler_count,
        "filler_words": filler_words_found[:10],  # Cap at 10 for response size
        "stutter_events": stutter_events,
        "repeat_events": repeat_events,
        "clarity_index": round(clarity_index, 1),
        "long_pauses": long_pauses,
    }
