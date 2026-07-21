"""
services/interview_scoring.py
Advanced multi-dimensional weighted scoring system.
Author: Aditya Singh
"""

import logging

logger = logging.getLogger("InterviewScoring")

def get_role_weights(job_role: str) -> dict:
    """Fetch role-specific scoring weights from the job_roles table via SQLAlchemy."""
    try:
        from database.database import SessionLocal
        from database.models import JobRole

        db = SessionLocal()
        try:
            row = db.query(JobRole).filter(JobRole.role_name == job_role).first()
            if row:
                return {
                    "tech": (row.tech_weight or 40) / 100.0,
                    "comm": (row.comm_weight or 20) / 100.0,
                    "behav": (row.eq_weight or 20) / 100.0,
                    "conf": (row.conf_weight or 20) / 100.0,
                    "facial": 0.0,
                    "fluency": 0.0,
                }
        finally:
            db.close()
    except Exception as e:
        logger.error(f"Failed to fetch role weights: {e}")

    # Fallback default weights
    return {"tech": 0.40, "comm": 0.20, "conf": 0.20, "behav": 0.20, "facial": 0.0, "fluency": 0.0}

def calculate_final_score(job_role: str, metrics: dict) -> float:
    """
    metrics requires:
    - technical_score (0-100)
    - communication_score (0-100)
    - confidence_score (0-100)
    - behavioral_score (0-100)
    - facial_score (0-100)
    - fluency_score (0-100)
    """
    weights = get_role_weights(job_role)
    
    score = (
        (metrics.get("technical_score", 0) * weights["tech"]) +
        (metrics.get("communication_score", 0) * weights["comm"]) +
        (metrics.get("confidence_score", 0) * weights["conf"]) +
        (metrics.get("behavioral_score", 0) * weights["behav"]) +
        (metrics.get("facial_score", 0) * weights["facial"]) +
        (metrics.get("fluency_score", 0) * weights["fluency"])
    )
    return round(score, 1)

def generate_hiring_recommendation(final_score: float, tier_level: int = 3) -> str:
    """Strict hiring curve adjusted by Tier."""
    if tier_level == 1:
        # Fresher Labels
        if final_score >= 90: return "Strong Potential Hire"
        if final_score >= 80: return "Potential Hire"
        if final_score >= 65: return "Needs Mentorship"
        return "Not Ready Yet"
    else:
        # Experienced Labels
        if final_score >= 92: return "Strong Hire"
        if final_score >= 82: return "Hire"
        if final_score >= 70: return "Consider"
        if final_score >= 60: return "Borderline"
        return "Not Recommended"
