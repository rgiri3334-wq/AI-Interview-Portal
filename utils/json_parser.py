"""
utils/json_parser.py
Safe JSON parser with multi-layer fallback and schema enforcement.
Author: Aditya Singh
"""
import json
import re
import logging

logger = logging.getLogger("JSONParser")


def extract_json_from_text(text: str) -> dict | None:
    """Extract JSON object from raw LLM text using regex."""
    if not text:
        return None
    # Try direct parse first
    try:
        return json.loads(text.strip())
    except json.JSONDecodeError:
        pass
    # Extract JSON block from markdown fences
    for pattern in [r"```json\s*([\s\S]+?)\s*```", r"```\s*([\s\S]+?)\s*```", r"(\{[\s\S]+\})"]:
        match = re.search(pattern, text)
        if match:
            try:
                return json.loads(match.group(1).strip())
            except json.JSONDecodeError:
                continue
    return None


def safe_parse_question_response(text: str, fallback_question: str) -> dict:
    """Parse Gemini question generation response with guaranteed safe output."""
    data = extract_json_from_text(text)
    if data and isinstance(data, dict):
        return {
            "question":       str(data.get("question") or fallback_question),
            "topic":          str(data.get("topic") or "Technical"),
            "difficulty":     str(data.get("difficulty") or "Medium"),
            "category":       str(data.get("category") or "Technical"),
            "follow_up_hint": str(data.get("follow_up_hint") or "Elaborate further."),
        }
    logger.warning("JSON parse failed for question response. Using fallback.")
    return {
        "question": fallback_question,
        "topic": "Technical",
        "difficulty": "Medium",
        "category": "Technical",
        "follow_up_hint": "Can you elaborate on that?",
    }


def safe_parse_assessment_response(text: str) -> dict:
    """Parse Gemini assessment response with strict bounds enforcement."""
    data = extract_json_from_text(text)
    if data and isinstance(data, dict):
        def clamp(v, lo, hi, default):
            try:
                return max(lo, min(hi, int(v)))
            except (TypeError, ValueError):
                return default
        return {
            "technical_score":      clamp(data.get("technical_score"), 0, 10, 5),
            "communication_score":  clamp(data.get("communication_score"), 0, 100, 60),
            "confidence_score":     clamp(data.get("confidence_score"), 0, 100, 60),
            "behavioral_score":     clamp(data.get("behavioral_score"), 0, 100, 60),
            "problem_solving_score":clamp(data.get("problem_solving_score"), 0, 100, 60),
            "role_alignment_score": clamp(data.get("role_alignment_score"), 0, 100, 60),
            "professionalism_score":clamp(data.get("professionalism_score"), 0, 100, 60),
            "learning_potential_score": clamp(data.get("learning_potential_score"), 0, 100, 60),
            "eq_feedback":          str(data.get("eq_feedback") or data.get("feedback") or "Assessment complete."),
            "strengths":            list(data.get("strengths") or []),
            "weaknesses":           list(data.get("weaknesses") or []),
            "repeated_words":       list(data.get("repeated_words_detected") or []),
            "follow_up_question":   str(data.get("follow_up_question") or ""),
            "next_topic":           str(data.get("next_recommended_topic") or ""),
            "final_verdict":        str(data.get("final_verdict") or "Evaluation complete."),
            "next_technical_question": str(data.get("next_technical_question") or ""),
            "answer_quality":       str(data.get("answer_quality") or "average").lower(),
            "positive_keywords":    list(data.get("positive_keywords") or []),
            "negative_keywords":    list(data.get("negative_keywords") or []),
        }
    logger.warning("JSON parse failed for assessment response. Using safe defaults.")
    return {
        "action": "skip",
        "technical_score": 0, "communication_score": 0, "confidence_score": 0,
        "behavioral_score": 0, "problem_solving_score": 0, "role_alignment_score": 0,
        "professionalism_score": 0, "learning_potential_score": 0,
        "eq_feedback": "I had trouble processing that response. Let's move on.",
        "strengths": [], "weaknesses": ["Answer depth could not be fully evaluated due to a processing error."],
        "repeated_words": [], "follow_up_question": "",
        "next_topic": "", "final_verdict": "Evaluation pending.",
        "next_technical_question": "", "answer_quality": "weak",
        "positive_keywords": [], "negative_keywords": []
    }
