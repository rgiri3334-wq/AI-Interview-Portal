"""
services/ranking_engine.py
Candidate ranking and automated hiring decision engine.
Computes a Global Score from resume + interview dimensions and ranks all candidates.
Author: Aditya Singh
"""
import logging
from typing import Optional

logger = logging.getLogger("RankingEngine")

# ── Weightage Profile (tunable per company/role) ──────────────────────────
DEFAULT_WEIGHTS = {
    "resume_score": 0.20,
    "technical_score": 0.30,
    "communication_score": 0.15,
    "confidence_score": 0.10,
    "behavioral_score": 0.10,
    "fluency_score": 0.08,
    "eq_score": 0.07,
}

ROLE_WEIGHT_OVERRIDES = {
    "product manager": {
        "resume_score": 0.15,
        "technical_score": 0.15,
        "communication_score": 0.30,
        "confidence_score": 0.15,
        "behavioral_score": 0.15,
        "fluency_score": 0.05,
        "eq_score": 0.05,
    },
    "frontend developer": {
        "resume_score": 0.20,
        "technical_score": 0.35,
        "communication_score": 0.15,
        "confidence_score": 0.08,
        "behavioral_score": 0.07,
        "fluency_score": 0.08,
        "eq_score": 0.07,
    },
}


def get_weights(job_role: str) -> dict:
    role_key = job_role.lower().strip()
    return ROLE_WEIGHT_OVERRIDES.get(role_key, DEFAULT_WEIGHTS)


def calculate_global_score(
    resume_score: float = 50.0,
    technical_score: float = 50.0,
    communication_score: float = 50.0,
    confidence_score: float = 50.0,
    behavioral_score: float = 50.0,
    fluency_score: float = 50.0,
    eq_score: float = 50.0,
    job_role: str = "Software Engineer",
) -> float:
    """Compute a weighted Global Score (0-100) from all evaluation dimensions."""
    weights = get_weights(job_role)
    score = (
        resume_score * weights["resume_score"]
        + technical_score * weights["technical_score"]
        + communication_score * weights["communication_score"]
        + confidence_score * weights["confidence_score"]
        + behavioral_score * weights["behavioral_score"]
        + fluency_score * weights["fluency_score"]
        + eq_score * weights["eq_score"]
    )
    return round(min(max(score, 0), 100), 1)


def generate_hiring_decision(global_score: float,
                             technical_score: float) -> dict:
    """
    Generate the final automated hiring recommendation.
    A strong technical score gates the decision even if overall score is borderline.
    """
    if global_score >= 80 and technical_score >= 70:
        return {
            "decision": "HIRED",
            "label": "Strong Hire",
            "color": "#00ff88",
            "confidence": round(global_score, 1),
            "summary": "Exceptional across all dimensions. Highly recommended for immediate hire."
        }
    elif global_score >= 65 and technical_score >= 55:
        return {
            "decision": "SHORTLISTED",
            "label": "Shortlisted",
            "color": "#00D1FF",
            "confidence": round(global_score, 1),
            "summary": "Strong candidate. Recommend a final round or offer with mentorship plan."
        }
    elif global_score >= 50:
        return {
            "decision": "UNDER_REVIEW",
            "label": "Under Review",
            "color": "#FFB800",
            "confidence": round(global_score, 1),
            "summary": "Shows potential but has gaps. Consider a second technical screen."
        }
    else:
        return {
            "decision": "REJECTED",
            "label": "Not Selected",
            "color": "#ff3b5c",
            "confidence": round(global_score, 1),
            "summary": "Does not meet the current role requirements. May reapply in 6 months."
        }


def rank_candidates(candidates: list[dict]) -> list[dict]:
    """
    Sort a list of candidate dicts (each containing global_score) in descending order.
    Assigns rank positions starting from 1.
    """
    sorted_candidates = sorted(
        candidates,
        key=lambda c: c.get("global_score", 0),
        reverse=True
    )
    for i, c in enumerate(sorted_candidates):
        c["rank"] = i + 1
    return sorted_candidates
