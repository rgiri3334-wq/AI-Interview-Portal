"""
services/communication_analysis.py

── UNUSED MODULE ──
This module is never imported by Main.py or any other service.
Communication scoring (grammar, clarity, professionalism) is handled
by the Gemini assessment prompt via services/gemini_service.py.
Note: grammar_score was hardcoded to 95 and professionalism to 90.
Retained for reference only.

NLP-based communication maturity and grammar analysis.
Author: Aditya Singh
"""

def score_communication(transcript: str, filler_count: int, wpm: float) -> dict:
    """Evaluate structure, grammar, and professionalism."""
    words = transcript.split()
    if not words:
        return {"grammar_score": 0, "clarity_score": 0, "professionalism": 0}
        
    sentence_count = max(1, transcript.count('.') + transcript.count('?') + transcript.count('!'))
    avg_sentence_length = len(words) / sentence_count
    
    clarity = 100 - (filler_count * 2)
    grammar = 95  # Simulated base grammar score
    if avg_sentence_length > 25:
        clarity -= 10  # Rambling penalty
        
    return {
        "grammar_score": max(0, grammar),
        "clarity_score": max(0, clarity),
        "professionalism": 90
    }
