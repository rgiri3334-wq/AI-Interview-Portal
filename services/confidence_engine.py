"""
services/confidence_engine.py
Analyzes speech fluency, hesitation, and voice confidence signals.
Author: Aditya Singh
"""
import logging

logger = logging.getLogger("ConfidenceEngine")

def calculate_speech_fluency(wpm: float, filler_count: int, total_words: int) -> float:
    """Calculate fluency score (0-100) based on WPM and filler frequency."""
    if total_words == 0:
        return 0.0
    
    # Ideal WPM for confident tech interview is ~130-150.
    wpm_score = 100.0
    if wpm < 100:
        wpm_score -= (100 - wpm) * 0.8
    elif wpm > 170:
        wpm_score -= (wpm - 170) * 0.5  # Too fast/nervous
        
    filler_ratio = filler_count / total_words
    penalty = min(filler_ratio * 400, 50)  # Up to 50 point penalty for fillers
    
    fluency = max(0.0, min(100.0, wpm_score - penalty))
    return round(fluency, 1)

def detect_hesitation_markers(transcript: str) -> dict:
    """Detect pausing, murmuring, and hesitation markers."""
    lower = transcript.lower()
    return {
        "long_pauses": lower.count("..."),
        "stammering": sum(1 for w in lower.split() if w.startswith(w[:2]+"-")),
        "murmuring": lower.count("hmm") + lower.count("mhm"),
    }

def compute_overall_confidence(fluency: float, emotion: str, llm_confidence: float) -> float:
    """Fuse acoustic/fluency confidence with visual/emotion and semantic confidence."""
    emotion_weights = {"Confident": 1.1, "Focused": 1.0, "Neutral": 0.9, "Happy": 0.95, "Nervous": 0.7, "Anxious": 0.6}
    weight = emotion_weights.get(emotion, 0.9)
    
    base_confidence = (fluency * 0.4) + (llm_confidence * 0.6)
    final_score = max(0.0, min(100.0, base_confidence * weight))
    return round(final_score, 1)
