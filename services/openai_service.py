"""
services/openai_service.py
Enterprise ChatGPT service layer — async, retry-safe, context-aware.
Author: Aditya Singh
"""
import os
import logging
import json
from typing import Optional

from utils.retry_handler import async_retry
from utils.json_parser import safe_parse_question_response, safe_parse_assessment_response, extract_json_from_text
from services.prompt_engine import (
    build_question_prompt, build_assessment_prompt, build_report_summary_prompt,
    get_fallback_question, get_difficulty_label,
)
from services.interview_memory import get_or_create_session, get_session, InterviewSession
from services.confidence_engine import calculate_speech_fluency, compute_overall_confidence
from services.interview_scoring import calculate_final_score, generate_hiring_recommendation

logger = logging.getLogger("OpenAIService")

OPENAI_MODEL = "gpt-4o"
OPENAI_MINI_MODEL = "gpt-4o-mini"

try:
    from openai import AsyncOpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    logger.warning("openai SDK not available. Running in MOCK mode.")

def _get_client():
    if not OPENAI_AVAILABLE:
        raise RuntimeError("openai not installed.")
    key = os.getenv("OPENAI_API_KEY", "")
    if not key or key == "your_openai_api_key_here":
        raise RuntimeError("OPENAI_API_KEY missing or placeholder.")
    return AsyncOpenAI(api_key=key)

@async_retry(max_attempts=3, base_delay=1.0)
async def _call_openai(client, prompt: str, model: str = OPENAI_MODEL) -> str:
    """Raw OpenAI API call with retry."""
    response = await client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        response_format={ "type": "json_object" },
        temperature=0.65,
        max_tokens=1024,
    )
    return response.choices[0].message.content or ""

# ── Public API ────────────────────────────────────────────────────────────

async def generate_smart_question(
    candidate_id: str,
    candidate_name: str,
    job_role: str,
    experience: str,
    skills: str,
    personality: str = "strict",
) -> dict:
    """Generate a context-aware, adaptive interview question."""
    session = get_or_create_session(candidate_id, job_role, experience, skills)
    stage = min(session.question_index + 1, 5)

    from services.gemini_service import _get_admin_question_data
    _, potential_admin_q, persona, company_context, weights = _get_admin_question_data(job_role, session.asked_questions)

    admin_next_q = potential_admin_q if potential_admin_q else None

    if admin_next_q:
        result = {
            "question": admin_next_q,
            "topic": "Enterprise Evaluation",
            "difficulty": "Hard",
            "category": "Technical",
            "follow_up_hint": "Listen for exact keyword matches.",
        }
        session.asked_questions.append(result["question"])
        return result

    prompt = build_question_prompt(
        job_role=job_role,
        skills=skills,
        experience=experience,
        previous_questions=session.asked_questions,
        conversation_history=session.conversation_history,
        weak_areas=session.weak_areas,
        answer_quality=session.last_answer_quality,
        interview_stage=session.current_stage,
        difficulty_index=session.difficulty_index,
        assertive_mode=session.assertive_mode,
        personality=str(persona),
        company_context=str(company_context),
        resume_context=session.resume_context or {},
        candidate_name=candidate_name,
        weights=weights,
    )

    fallback_q = get_fallback_question(job_role, session.asked_questions)

    try:
        client = _get_client()
        raw = await _call_openai(client, prompt, model=OPENAI_MINI_MODEL)
        result = safe_parse_question_response(raw or "", fallback_q)
    except Exception as e:
        logger.error(f"Question generation failed: {e}. Using fallback.")
        result = {
            "question": fallback_q,
            "topic": "Technical",
            "difficulty": get_difficulty_label(session.difficulty_index),
            "category": "Technical",
            "follow_up_hint": "Ask for real-world examples.",
        }

    session.asked_questions.append(result["question"])
    return result


async def assess_answer(
    candidate_id: str,
    job_role: str,
    experience: str,
    skills: str,
    question: str,
    answer: str,
    emotion: str,
    filler_words: list[str],
    wpm: float = 130.0,
) -> dict:
    """Evaluate candidate answer with full context awareness and multi-dimensional behavioral scoring."""
    session = get_or_create_session(candidate_id, job_role, experience, skills)

    prompt = build_assessment_prompt(
        job_role=job_role,
        experience=experience,
        question=question,
        answer=answer,
        emotion=emotion,
        filler_words=filler_words,
        conversation_history=session.conversation_history,
        consecutive_failures=session.consecutive_failures,
    )

    try:
        client = _get_client()
        raw = await _call_openai(client, prompt, model=OPENAI_MODEL)
        parsed_data = extract_json_from_text(raw or "") or {}
        result = safe_parse_assessment_response(json.dumps(parsed_data))
        
        # Inject action if OpenAI parsed it correctly
        if "action" in parsed_data:
            result["action"] = parsed_data["action"]
            
    except Exception as e:
        logger.error(f"Assessment failed: {e}. Using fallback.")
        result = safe_parse_assessment_response("")
        result["action"] = "normal"

    action = result.get("action", "normal")
    
    if action in ["repeat", "small_talk"]:
        # If they are just greeting us at the start, don't repeat the greeting!
        if len(session.conversation_history) == 0 and "welcome to Sterling" in question:
            fallback_q = get_fallback_question(job_role, [])
            next_q = result.get("next_technical_question")
            if not next_q or len(next_q) < 15:
                next_q = fallback_q
        else:
            next_q = result.get("next_technical_question", f"Let me repeat the question: {question}")
            
        return {
            "action": action,
            "next_technical_question": next_q,
            "answer_quality": "average"
        }
        
    elif action == "skip":
        # They skipped it, we record a 0 score and move on.
        result["technical_score"] = 0
        result["next_technical_question"] = result.get("next_technical_question", "Okay, moving on to the next topic.")

    fluency_score = calculate_speech_fluency(wpm, len(filler_words), len(answer.split()))
    llm_confidence = result.get("confidence_score", 60)
    final_confidence = compute_overall_confidence(fluency_score, emotion, llm_confidence)
    
    facial_score = {"Confident": 90, "Focused": 85, "Neutral": 70, "Happy": 85, "Nervous": 40}.get(emotion, 60)
    behavioral_score = result.get("communication_score", 60) * 0.8 + final_confidence * 0.2

    metrics = {
        "technical_score": result["technical_score"] * 10,
        "communication_score": result.get("communication_score", 60),
        "confidence_score": final_confidence,
        "behavioral_score": behavioral_score,
        "facial_score": facial_score,
        "fluency_score": fluency_score,
        "action": action,
    }
    
    result.update(metrics)

    if action not in ["repeat", "small_talk"]:
        session.add_exchange(
            question=question,
            answer=answer,
            score=result["technical_score"],
            answer_quality=result.get("answer_quality", "average"),
            weaknesses=result.get("weaknesses", []),
            strengths=result.get("strengths", []),
            communication=result.get("communication_score", 60),
            confidence=result.get("confidence_score", 60),
        )

    if not result.get("next_technical_question"):
        result["next_technical_question"] = get_fallback_question(job_role, session.asked_questions)

    return result


async def generate_final_report(
    candidate_id: str,
    candidate_name: str,
    job_role: str,
    experience: str,
) -> dict:
    """Generate a comprehensive AI report for the full interview session."""
    session = get_session(candidate_id)
    if not session or not session.conversation_history:
        return {
            "synthesis": "No interview data available to synthesize.",
            "identified_strengths": [],
            "optimization_areas": []
        }

    prompt = build_report_summary_prompt(
        candidate_name=candidate_name,
        job_role=job_role,
        experience=experience,
        history=session.conversation_history,
        avg_technical=session.avg_technical,
        avg_communication=session.avg_communication,
        avg_confidence=session.avg_confidence,
    )

    try:
        client = _get_client()
        raw = await _call_openai(client, prompt, model=OPENAI_MODEL)
        data = extract_json_from_text(raw or "")
        if data:
            return data
    except Exception as e:
        logger.error(f"Report generation failed: {e}")

    return {
        "synthesis": f"{candidate_name} completed the interview for {job_role}. An automated error occurred during report generation. Manual review of the transcript and code submissions is highly recommended.",
        "identified_strengths": list(session.strong_areas[:2]) if session.strong_areas else ["Completed technical assessment"],
        "optimization_areas": list(session.weak_areas[:2]) if session.weak_areas else ["Review specific technical domains manually"],
        "detected_tier": session.tier_name,
        "detected_technical_level": "Unknown",
        "detected_communication_level": "Unknown",
        "difficulty_faced": "Unknown",
        "recommended_hiring_tier": "Manual Review Required",
        "overall_recommendation": "Neutral",
        "reasoning_summary": "Report generation failed. Please review manually."
    }
