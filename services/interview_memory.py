"""
services/interview_memory.py
In-process interview context/memory manager keyed by candidate_id.
Author: Aditya Singh
"""
import threading
from dataclasses import dataclass, field
from typing import Optional

from services.prompt_engine import get_experience_tier

# Thread-safe store
_lock = threading.Lock()
_sessions: dict[str, "InterviewSession"] = {}


@dataclass
class InterviewSession:
    candidate_id: str
    job_role: str
    experience: str
    skills: str
    asked_questions: list[str] = field(default_factory=list)
    # [{question, answer, score, answer_quality, wpm}]
    conversation_history: list[dict] = field(default_factory=list)
    weak_areas: list[str] = field(default_factory=list)
    strong_areas: list[str] = field(default_factory=list)
    key_insights: list[str] = field(default_factory=list)
    last_answer_quality: str = "average"  # strong | average | weak
    question_index: int = 0
    current_stage: int = 1          # 1: Warmup, 2: Resume, 3: Tech, 4: Design, 5: HR
    # 1 to 5 scaling (set dynamically in post_init)
    difficulty_index: int = 3
    min_diff: int = 1
    max_diff: int = 5
    tier_name: str = "Unknown"
    tier_level: int = 3
    assertive_mode: bool = False      # True if last answer was weak
    # Tracks consecutive weak answers for topic pivoting
    consecutive_failures: int = 0
    total_technical_score: int = 0
    total_communication: int = 0
    total_confidence: int = 0
    total_wpm: float = 0.0      # Accumulated WPM for avg_wpm calculation
    # Populated by resume_engine after upload
    resume_context: Optional[dict] = None
    behavioral_log: list[dict] = field(
        default_factory=list)  # Populated by Human.js telemetry

    def __post_init__(self):
        # Resolve candidate tier dynamically based on experience string
        tier_info = get_experience_tier(self.experience)
        self.tier_name = tier_info["tier_name"]
        self.tier_level = tier_info["tier_level"]
        self.min_diff = tier_info["min_diff"]
        self.max_diff = tier_info["max_diff"]
        # Start difficulty at the tier's designated starting point
        self.difficulty_index = tier_info["start_diff"]

    def add_exchange(self, question: str, answer: str, score: int,
                     answer_quality: str, weaknesses: list[str], strengths: list[str],
                     communication: int, confidence: int, wpm: float = 130.0,
                     insight: str | None = None):
        if question not in self.asked_questions:
            self.asked_questions.append(question)
        self.conversation_history.append({
            "question": question, "answer": answer,
            "score": score, "answer_quality": answer_quality,
            # Fix #16: Store wpm so it’s available for reports
            "wpm": round(wpm, 1),
        })
        self.last_answer_quality = answer_quality
        self.question_index += 1

        # Advance stage logic
        if self.question_index == 1:
            self.current_stage = 2      # Next is Resume
        elif self.question_index in [2, 3]:
            self.current_stage = 3  # Next is Tech
        elif self.question_index == 4:
            self.current_stage = 4    # Next is System Design
        elif self.question_index >= 5:
            self.current_stage = 5    # Next is HR/Behavioral

        # Difficulty & Assertive Mode logic
        # High score quickly -> scale up. Weak score -> assertive mode.
        if answer_quality == "strong" and score >= 8:
            self.difficulty_index = min(
                self.max_diff, self.difficulty_index + 1)
            self.assertive_mode = False
            self.consecutive_failures = 0
        elif answer_quality == "weak" or score <= 4:
            self.difficulty_index = max(
                self.min_diff, self.difficulty_index - 1)
            self.assertive_mode = True  # Challenge them next question
            self.consecutive_failures += 1
        else:
            self.assertive_mode = False
            self.consecutive_failures = 0

        self.total_technical_score += score
        self.total_communication += communication
        self.total_confidence += confidence
        self.total_wpm += wpm  # Fix #16: Accumulate wpm
        for w in weaknesses:
            if w and w not in self.weak_areas:
                self.weak_areas.append(w)
        for s in strengths:
            if s and s not in self.strong_areas:
                self.strong_areas.append(s)
        if insight and insight not in self.key_insights:
            self.key_insights.append(insight)

    @property
    def avg_technical(self) -> float:
        n = len(self.conversation_history)
        return round(self.total_technical_score / n, 1) if n else 0.0

    @property
    def avg_communication(self) -> float:
        n = len(self.conversation_history)
        return round(self.total_communication / n, 1) if n else 0.0

    @property
    def avg_confidence(self) -> float:
        n = len(self.conversation_history)
        return round(self.total_confidence / n, 1) if n else 0.0

    @property
    def avg_wpm(self) -> float:
        """Average words-per-minute across all answered questions."""
        n = len(self.conversation_history)
        # 130 wpm is the neutral default
        return round(self.total_wpm / n, 1) if n else 130.0


def get_or_create_session(candidate_id: str, job_role: str,
                          experience: str, skills: str) -> InterviewSession:
    with _lock:
        if candidate_id not in _sessions:
            _sessions[candidate_id] = InterviewSession(
                candidate_id=candidate_id,
                job_role=job_role,
                experience=experience,
                skills=skills,
            )
        return _sessions[candidate_id]


def get_session(candidate_id: str) -> Optional[InterviewSession]:
    with _lock:
        return _sessions.get(candidate_id)


def clear_session(candidate_id: str):
    with _lock:
        _sessions.pop(candidate_id, None)
