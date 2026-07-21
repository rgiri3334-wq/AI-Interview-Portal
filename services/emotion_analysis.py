"""
services/emotion_analysis.py
Maps frontend-supplied emotion labels to numeric scores for reporting.

The emotion label comes from the frontend's MediaPipe FaceLandmarker analysis
(hooks/useHumanBehavior.js), not from server-side video processing.

Author: Aditya Singh
"""

# Confidence multipliers for each emotion state detected by the frontend.
# These are used in gemini_service.py (line ~292) to compute facial_score.
EMOTION_SCORES = {
    "Confident": 90,
    "Focused": 85,
    "Happy": 85,
    "Neutral": 70,
    "Surprised": 60,
    "Nervous": 40,
    "Anxious": 35,
    "Sad": 45,
    "Angry": 30,
}


def get_emotion_score(emotion: str) -> int:
    """Convert a frontend emotion label to a numeric score (0-100)."""
    return EMOTION_SCORES.get(emotion, 60)


def process_facial_emotion(frame_data: bytes) -> str:
    """
    Server-side emotion analysis from raw video frame.

    NOTE: In the current architecture (v5), emotion detection runs entirely
    in the browser via MediaPipe FaceLandmarker. This function is retained
    for API compatibility but is not called from any active code path.

    For real server-side emotion detection, integrate DeepFace:
        pip install deepface
        from deepface import DeepFace
        result = DeepFace.analyze(frame, actions=['emotion'], enforce_detection=False)
        return result[0]['dominant_emotion']
    """
    return "Neutral"


def calculate_facial_confidence(emotions_detected: list[str]) -> float:
    """Calculate overall facial confidence from a list of detected emotions."""
    if not emotions_detected:
        return 60.0
    total = sum(get_emotion_score(e) for e in emotions_detected)
    return round(total / len(emotions_detected), 1)
