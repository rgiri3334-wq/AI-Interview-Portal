"""
services/behavior_analysis.py
Analyzes stress response, calmness under pressure, and behavioral maturity.
Author: Aditya Singh
"""

def analyze_stress_response(emotion_timeline: list[str]) -> float:
    """Calculate stress resilience based on emotion fluctuations."""
    if not emotion_timeline:
        return 50.0
    stress_events = emotion_timeline.count("Anxious") + emotion_timeline.count("Nervous")
    return max(0.0, 100.0 - (stress_events * 10))

def extract_soft_skills(feedback_text: str) -> list[str]:
    """NLP extraction of soft skills from AI feedback."""
    skills = []
    lower = feedback_text.lower()
    if "leadership" in lower or "led" in lower: skills.append("Leadership")
    if "team" in lower or "collaborat" in lower: skills.append("Teamwork")
    if "critical" in lower or "deep" in lower: skills.append("Critical Thinking")
    return skills
