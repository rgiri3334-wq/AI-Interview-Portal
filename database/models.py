from sqlalchemy import Column, String, Integer, Float, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from database.database import Base

class Department(Base):
    __tablename__ = "departments"
    department_id = Column(String, primary_key=True, index=True) # e.g. DEPT1
    department_name = Column(String, nullable=False)
    created_at = Column(String, default=lambda: datetime.now(timezone.utc).isoformat())

    roles = relationship("JobRole", back_populates="department", cascade="all, delete-orphan")
    questions = relationship("QuestionBank", back_populates="department", cascade="all, delete-orphan")

class SequenceTracker(Base):
    __tablename__ = "sequence_tracker"
    prefix = Column(String, primary_key=True, index=True)
    current_value = Column(Integer, default=0)


class JobRole(Base):
    __tablename__ = "job_roles"
    role_id = Column(String, primary_key=True, index=True) # e.g. ROLE1
    department_id = Column(String, ForeignKey("departments.department_id"), nullable=False)
    role_name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    persona = Column(String, default="Strictly Technical (System Design)")
    tech_weight = Column(Integer, default=40)
    comm_weight = Column(Integer, default=20)
    eq_weight = Column(Integer, default=20)
    conf_weight = Column(Integer, default=20)
    created_at = Column(String, default=lambda: datetime.now(timezone.utc).isoformat())

    department = relationship("Department", back_populates="roles")
    questions = relationship("QuestionBank", back_populates="role", cascade="all, delete-orphan")
    interviews = relationship("InterviewSession", back_populates="role", cascade="all, delete-orphan")


class Candidate(Base):
    __tablename__ = "candidates"
    candidate_id = Column(String, primary_key=True, index=True) # e.g. CAN1
    name = Column(String, nullable=False)
    email = Column(String, nullable=False, unique=True, index=True)
    phone = Column(String, nullable=True)
    # password_hash is kept nullable for backward compatibility with existing records.
    # New OTP-authenticated candidates will have this as None.
    password_hash = Column(String, nullable=True)
    is_verified = Column(Boolean, default=False)  # True after first OTP verification
    registration_date = Column(String, default=lambda: datetime.now(timezone.utc).isoformat())

    resumes = relationship("Resume", back_populates="candidate", cascade="all, delete-orphan")
    interviews = relationship("InterviewSession", back_populates="candidate", cascade="all, delete-orphan")
    unified_answers = relationship("UnifiedInterviewData", back_populates="candidate", cascade="all, delete-orphan")
    answers = relationship("CandidateAnswer", back_populates="candidate", cascade="all, delete-orphan")
    keyword_evals = relationship("KeywordEvaluation", back_populates="candidate", cascade="all, delete-orphan")
    question_evals = relationship("QuestionEvaluation", back_populates="candidate", cascade="all, delete-orphan")
    reports = relationship("FinalReport", back_populates="candidate", cascade="all, delete-orphan")


class Resume(Base):
    __tablename__ = "resumes"
    resume_id = Column(String, primary_key=True, index=True) # e.g. RES1
    candidate_id = Column(String, ForeignKey("candidates.candidate_id"), nullable=False)
    resume_file_path = Column(String, nullable=True)
    extracted_text = Column(Text, default="")
    skills_detected = Column(Text, default="[]")
    experience_years = Column(String, nullable=True)
    education_summary = Column(Text, nullable=True)
    projects_summary = Column(Text, default="[]")
    certifications = Column(Text, nullable=True)
    resume_score = Column(Float, default=50.0)  # BUG-04/05 fix: store AI resume score; was missing (code referenced nonexistent ats_score)
    created_at = Column(String, default=lambda: datetime.now(timezone.utc).isoformat())

    candidate = relationship("Candidate", back_populates="resumes")


class InterviewSession(Base):
    __tablename__ = "interview_sessions"
    interview_id = Column(String, primary_key=True, index=True) # e.g. INT1
    candidate_id = Column(String, ForeignKey("candidates.candidate_id"), nullable=False)
    role_id = Column(String, ForeignKey("job_roles.role_id"), nullable=False)
    status_id = Column(Integer, ForeignKey("status_lookup.status_id"), default=200)
    started_at = Column(String, default=lambda: datetime.now(timezone.utc).isoformat())
    completed_at = Column(String, nullable=True)
    duration_seconds = Column(Integer, default=0)
    overall_score = Column(Float, default=0.0)
    technical_score = Column(Float, default=0.0)
    communication_score = Column(Float, default=0.0)
    confidence_score = Column(Float, default=0.0)
    problem_solving_score = Column(Float, default=0.0)
    role_alignment_score = Column(Float, default=0.0)
    professionalism_score = Column(Float, default=0.0)
    learning_potential_score = Column(Float, default=0.0)
    fluency_score = Column(Float, default=0.0)
    behavioral_score = Column(Float, default=0.0)
    recommendation = Column(String, nullable=True)

    candidate = relationship("Candidate", back_populates="interviews")
    role = relationship("JobRole", back_populates="interviews")
    questions_log = relationship("InterviewQuestionsLog", back_populates="interview", cascade="all, delete-orphan")
    unified_answers = relationship("UnifiedInterviewData", back_populates="interview", cascade="all, delete-orphan")
    answers = relationship("CandidateAnswer", back_populates="interview", cascade="all, delete-orphan")
    keyword_evals = relationship("KeywordEvaluation", back_populates="interview", cascade="all, delete-orphan")
    question_evals = relationship("QuestionEvaluation", back_populates="interview", cascade="all, delete-orphan")
    conversation = relationship("ConversationHistory", back_populates="interview", cascade="all, delete-orphan")
    report = relationship("FinalReport", back_populates="interview", uselist=False, cascade="all, delete-orphan")


class QuestionBank(Base):
    __tablename__ = "question_bank"
    question_id = Column(String, primary_key=True, index=True) # e.g. Q1
    department_id = Column(String, ForeignKey("departments.department_id"), nullable=False)
    role_id = Column(String, ForeignKey("job_roles.role_id"), nullable=False)
    question_text = Column(Text, nullable=False)
    difficulty = Column(String, default="Medium")
    keywords = Column(Text, nullable=False) 
    created_by_admin = Column(String, nullable=True)
    created_at = Column(String, default=lambda: datetime.now(timezone.utc).isoformat())

    department = relationship("Department", back_populates="questions")
    role = relationship("JobRole", back_populates="questions")
    asked_logs = relationship("InterviewQuestionsLog", back_populates="question", cascade="all, delete-orphan")
    unified_answers = relationship("UnifiedInterviewData", back_populates="question", cascade="all, delete-orphan")
    answers = relationship("CandidateAnswer", back_populates="question", cascade="all, delete-orphan")
    keyword_evals = relationship("KeywordEvaluation", back_populates="question", cascade="all, delete-orphan")
    question_evals = relationship("QuestionEvaluation", back_populates="question", cascade="all, delete-orphan")


class InterviewQuestionsLog(Base):
    __tablename__ = "interview_questions_log"
    asked_question_id = Column(String, primary_key=True, index=True) # e.g. ASK1
    interview_id = Column(String, ForeignKey("interview_sessions.interview_id"), nullable=False)
    question_id = Column(String, ForeignKey("question_bank.question_id"), nullable=False)
    question_text = Column(Text, nullable=False)
    sequence_number = Column(Integer, nullable=False)
    asked_timestamp = Column(String, default=lambda: datetime.now(timezone.utc).isoformat())

    interview = relationship("InterviewSession", back_populates="questions_log")
    question = relationship("QuestionBank", back_populates="asked_logs")


class CandidateAnswer(Base):
    __tablename__ = "candidate_answers"
    answer_id = Column(String, primary_key=True, index=True) # e.g. ANS1
    candidate_id = Column(String, ForeignKey("candidates.candidate_id"), nullable=False)
    interview_id = Column(String, ForeignKey("interview_sessions.interview_id"), nullable=False)
    question_id = Column(String, ForeignKey("question_bank.question_id"), nullable=False)
    candidate_answer = Column(Text, nullable=False)
    answer_timestamp = Column(String, default=lambda: datetime.now(timezone.utc).isoformat())
    response_duration_seconds = Column(Float, default=0.0)

    candidate = relationship("Candidate", back_populates="answers")
    interview = relationship("InterviewSession", back_populates="answers")
    question = relationship("QuestionBank", back_populates="answers")


class KeywordEvaluation(Base):
    __tablename__ = "keyword_evaluations"
    keyword_eval_id = Column(String, primary_key=True, index=True) # e.g. EVALK1
    candidate_id = Column(String, ForeignKey("candidates.candidate_id"), nullable=False)
    interview_id = Column(String, ForeignKey("interview_sessions.interview_id"), nullable=False)
    question_id = Column(String, ForeignKey("question_bank.question_id"), nullable=False)
    expected_keywords = Column(Text, default="[]")
    matched_keywords = Column(Text, default="[]")
    missing_keywords = Column(Text, default="[]")
    keyword_match_percentage = Column(Float, default=0.0)

    candidate = relationship("Candidate", back_populates="keyword_evals")
    interview = relationship("InterviewSession", back_populates="keyword_evals")
    question = relationship("QuestionBank", back_populates="keyword_evals")


class QuestionEvaluation(Base):
    __tablename__ = "question_evaluations"
    evaluation_id = Column(String, primary_key=True, index=True) # e.g. EVALQ1
    candidate_id = Column(String, ForeignKey("candidates.candidate_id"), nullable=False)
    interview_id = Column(String, ForeignKey("interview_sessions.interview_id"), nullable=False)
    question_id = Column(String, ForeignKey("question_bank.question_id"), nullable=False)
    technical_score = Column(Float, default=0.0)
    communication_score = Column(Float, default=0.0)
    behavior_score = Column(Float, default=0.0)
    confidence_score = Column(Float, default=0.0)
    feedback = Column(Text, nullable=True)
    created_at = Column(String, default=lambda: datetime.now(timezone.utc).isoformat())

    candidate = relationship("Candidate", back_populates="question_evals")
    interview = relationship("InterviewSession", back_populates="question_evals")
    question = relationship("QuestionBank", back_populates="question_evals")


class UnifiedInterviewData(Base):
    __tablename__ = "unified_interview_data"
    unified_id = Column(String, primary_key=True, index=True) # e.g. ANSLOG1
    candidate_id = Column(String, ForeignKey("candidates.candidate_id"), nullable=False)
    interview_id = Column(String, ForeignKey("interview_sessions.interview_id"), nullable=False)
    question_id = Column(String, ForeignKey("question_bank.question_id"), nullable=False)
    question_text = Column(Text, nullable=False)
    expected_keywords = Column(Text, default="[]")
    matched_keywords = Column(Text, default="[]")
    missing_keywords = Column(Text, default="[]")
    answer_score = Column(Float, default=0.0)
    answer_feedback = Column(Text, nullable=True)
    timestamp = Column(String, default=lambda: datetime.now(timezone.utc).isoformat())

    candidate = relationship("Candidate", back_populates="unified_answers")
    interview = relationship("InterviewSession", back_populates="unified_answers")
    question = relationship("QuestionBank", back_populates="unified_answers")


class ConversationHistory(Base):
    __tablename__ = "conversation_history"
    conversation_id = Column(String, primary_key=True, index=True) # e.g. CONV1
    interview_id = Column(String, ForeignKey("interview_sessions.interview_id"), nullable=False)
    speaker = Column(String, nullable=False) # e.g., "AI", "Candidate"
    message = Column(Text, nullable=False)
    timestamp = Column(String, default=lambda: datetime.now(timezone.utc).isoformat())

    interview = relationship("InterviewSession", back_populates="conversation")


class FinalReport(Base):
    __tablename__ = "final_reports"
    report_id = Column(String, primary_key=True, index=True) # e.g. REP1
    candidate_id = Column(String, ForeignKey("candidates.candidate_id"), nullable=False)
    interview_id = Column(String, ForeignKey("interview_sessions.interview_id"), nullable=False)
    overall_score = Column(Float, default=0.0)
    grade = Column(String, nullable=True) # e.g., A, B, C
    recommendation = Column(String, nullable=True)
    strengths = Column(Text, default="[]")
    weaknesses = Column(Text, default="[]")
    hiring_decision = Column(String, default="PENDING")
    report_generated_at = Column(String, default=lambda: datetime.now(timezone.utc).isoformat())
    # Sprint 4: Integrity Engine fields (server_default ensures backward compat with existing rows)
    integrity_score = Column(Integer, server_default="100", default=100)          # 0-100; 100 = clean
    integrity_verdict = Column(String, server_default="CLEAN", default="CLEAN")  # CLEAN|BORDERLINE|FLAGGED|HIGH_RISK
    integrity_signals = Column(Text, server_default="[]", default="[]")          # JSON array of signal log entries

    candidate = relationship("Candidate", back_populates="reports")
    interview = relationship("InterviewSession", back_populates="report")


class StatusLookup(Base):
    __tablename__ = "status_lookup"
    status_id = Column(Integer, primary_key=True) # 100, 200...
    status_name = Column(String, nullable=False, unique=True)
    description = Column(String, nullable=True)

class GlobalConfig(Base):
    __tablename__ = "global_config"
    id = Column(String, primary_key=True)
    key = Column(String, unique=True, nullable=False)
    value = Column(Text, nullable=False)
    updated_at = Column(String, default=lambda: datetime.now(timezone.utc).isoformat())


class OTPStore(Base):
    """
    Temporary vault for one-time passwords.
    OTPs are stored as SHA-256 hashes — raw codes are NEVER persisted.
    Records should be cleaned up by a background job or on-demand when expired.
    """
    __tablename__ = "otp_store"
    otp_id = Column(String, primary_key=True, index=True)      # e.g. OTP1
    identifier = Column(String, nullable=False, index=True)    # email or phone number
    otp_hash = Column(String, nullable=False)                  # SHA-256 hash of the 6-digit code
    purpose = Column(String, nullable=False)                   # "registration" | "login"
    expires_at = Column(String, nullable=False)                # UTC ISO timestamp
    is_used = Column(Boolean, default=False)                   # True once verified or invalidated
    attempts = Column(Integer, default=0)                      # Brute-force guard: max 5
    created_at = Column(String, default=lambda: datetime.now(timezone.utc).isoformat())
