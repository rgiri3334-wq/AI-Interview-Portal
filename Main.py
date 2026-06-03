"""
=============================================================================
AI Virtual Interview Platform — Enterprise Backend v4.0
=============================================================================
Author:       Aditya Singh (Principal Architect)
Architecture: FastAPI + Sterling AI 2.0 Flash + SQLite + WebSockets
AI Layer:     services/sterling ai_service.py (context-aware, adaptive, memory-backed)
=============================================================================
"""

import os, re, json, time, uuid, logging, sqlite3, io, csv, hashlib
import bcrypt
import jwt
from collections import Counter
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, UploadFile, File, Form, BackgroundTasks, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from sqlalchemy.orm import Session
from database.database import Base, engine, get_db
from database.models import Department, JobRole, Candidate, Resume, InterviewSession, QuestionBank, InterviewQuestionsLog, CandidateAnswer, KeywordEvaluation, QuestionEvaluation, ConversationHistory, FinalReport, StatusLookup, GlobalConfig
from database.db_utils import generate_enterprise_id

# ── Service Layer ─────────────────────────────────────────────────────────
from services.gemini_service import (
    generate_smart_question,
    assess_answer,
    generate_final_report,
)
from services.interview_memory import get_or_create_session, get_session, clear_session
from services.prompt_engine import get_fallback_question, get_difficulty_label
from services.resume_engine import parse_and_score_resume, score_to_status
from services.ranking_engine import calculate_global_score, generate_hiring_decision, rank_candidates
from services.circuit_breaker import all_breaker_status
from services.ai_orchestrator import get_orchestrator_stats
from services.whisper_service import transcribe_audio, get_whisper_status, is_whisper_available
from services.tts_service import generate_tts_stream

load_dotenv()

# ── Logging ───────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("EnterpriseInterviewAPI")

# ── JWT Config ───────────────────────────────────────────────
JWT_SECRET = "STERLING_SECURE_JWT_SECRET_KEY_2026"

# ── Database ──────────────────────────────────────────────────────────────
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "database.db")

def init_db():
    Base.metadata.create_all(bind=engine)
    
    # Seed required enterprise statuses if not present
    db = next(get_db())
    default_statuses = [
        (100, "REGISTERED", "Candidate registered in system"),
        (200, "READY", "Candidate is ready for interview"),
        (300, "IN_PROGRESS", "Interview is currently ongoing"),
        (400, "COMPLETED", "Interview completed successfully"),
        (500, "FAILED", "Interview failed or interrupted"),
        (600, "REVIEW_PENDING", "Admin review required"),
        (700, "SHORTLISTED", "Candidate passed interview"),
        (800, "REJECTED", "Candidate rejected"),
        (900, "HIRED", "Candidate formally hired")
    ]
    for sid, name, desc in default_statuses:
        if not db.query(StatusLookup).filter_by(status_id=sid).first():
            db.add(StatusLookup(status_id=sid, status_name=name, description=desc))
            
    # Seed Company Structure
    full_structure = {
      "Human Resources": ["HR Specialist", "Talent Acquisition Specialist", "HR Manager", "Learning and Development Specialist", "Payroll Specialist"],
      "Engineering": ["Embedded Systems Engineer", "BMS Engineer", "Motor Control Engineer", "Power Electronics Engineer", "Software Engineer", "Frontend Developer", "Backend Developer", "DevOps Engineer", "Data Scientist", "AI/ML Engineer"],
      "Customer Support": ["Customer Success Manager"],
      "Finance": ["Financial Analyst", "Accounts Manager"],
      "IT": ["Cybersecurity Analyst", "System Administrator"],
      "Marketing": ["Marketing Specialist", "Brand Manager"],
      "Operations": ["Operations Manager", "Supply Chain Analyst"],
      "Sales": ["Sales Executive", "Sales Manager"]
    }
    
    # Ensure departments and roles exist
    # BUG-12 fix: Use generate_enterprise_id instead of hardcoded DEPT{idx} to avoid collisions
    for dept_name, roles in full_structure.items():
        dept = db.query(Department).filter_by(department_name=dept_name).first()
        if not dept:
            dept_id = generate_enterprise_id(db, "DEPT")
            dept = Department(department_id=dept_id, department_name=dept_name)
            db.add(dept)
            db.commit()
            db.refresh(dept)
            
        for role_name in roles:
            role = db.query(JobRole).filter_by(role_name=role_name, department_id=dept.department_id).first()
            if not role:
                role_id = generate_enterprise_id(db, "ROLE")
                db.add(JobRole(role_id=role_id, department_id=dept.department_id, role_name=role_name))
                db.commit()
                
    logger.info("Database synchronized (SQLAlchemy 13-table schema).")

# ── Lifespan ──────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Booting Enterprise AI Interview Engine v4.0...")
    init_db()
    key = os.getenv("GEMINI_API_KEY", "")
    if not key or key == "your_sterling ai_api_key_here":
        logger.warning("AI_API_KEY missing — running in MOCK / Fallback mode.")
    else:
        logger.info("AI Subsystem ONLINE — Sterling Assessment Engine + Context Memory Active.")
    yield
    logger.info("Graceful shutdown complete.")

# ── App ───────────────────────────────────────────────────────────────────
app = FastAPI(
    title="AI Virtual Interview Engine",
    description="Production-grade AI interview platform with Sterling AI 2.0 Flash + Multi-LLM orchestration.",
    version="5.0.0",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
# In development: allow localhost Vite dev server.
# In production: Vercel URLs are included directly + env var override supported.
_allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    # Production Vercel domains — hardcoded as reliable fallback
    "https://ai-interview-portal.vercel.app",
    "https://ai-interview-portal-git-main-rgiri3334-wqs-projects.vercel.app",
]
# Also support env var — allows comma-separated list of extra origins
_env_origins = os.getenv("ALLOWED_ORIGIN", "")
for _origin in _env_origins.split(","):
    _origin = _origin.strip()
    if _origin and _origin not in _allowed_origins:
        _allowed_origins.append(_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def verify_admin_jwt(request: Request, call_next):
    if request.url.path.startswith("/api/admin") and request.method != "OPTIONS":
        # Allow public read access to company structure for candidate registration
        if request.url.path == "/api/admin/config/global/company_structure" and request.method == "GET":
            return await call_next(request)
            
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return JSONResponse(status_code=401, content={"detail": "Missing or invalid Authorization header"})
        token = auth_header.split(" ")[1]
        try:
            jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        except Exception as e:
            return JSONResponse(status_code=401, content={"detail": f"Invalid JWT Token: {str(e)}"})
    return await call_next(request)

# ── Global Exception Handlers ─────────────────────────────────────────────

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Return clean JSON for Pydantic validation errors instead of HTML traceback."""
    return JSONResponse(
        status_code=422,
        content={
            "error": "Validation Error",
            "detail": exc.errors(),
            "hint": "Check request body schema against API docs at /docs",
        },
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch-all — return JSON, never HTML tracebacks."""
    logger.error(f"Unhandled exception on {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "detail": str(exc),
            "path": str(request.url),
        },
    )

# ── NLP Utilities ─────────────────────────────────────────────────────────
FILLER_WORDS = {"um","uh","like","basically","literally","actually","so","right",
                "you know","kind of","sort of","i mean","honestly","clearly"}

def detect_filler_words(text: str) -> list[str]:
    if not text: return []
    clean = re.sub(r"[^\w\s]", "", text.lower())
    counts = Counter(clean.split())
    return [w for w, n in counts.items() if w in FILLER_WORDS and n >= 2]

def words_per_minute(text: str, duration_sec: float) -> float:
    if duration_sec <= 0 or not text: return 0.0
    return round((len(text.split()) / duration_sec) * 60, 1)

# ── Pydantic Schemas ──────────────────────────────────────────────────────

class CandidateRegister(BaseModel):
    name: str = Field(..., min_length=1)
    email: str = Field(..., min_length=3)
    phone: str = Field(default="")
    password: str = Field(..., min_length=6)

class CandidateLogin(BaseModel):
    email: str
    password: str

class ApplicationCreate(BaseModel):
    job_role: str
    experience: str = Field(default="Fresher (0 years)")
    skills: str = Field(default="")

class CandidateResponse(BaseModel):
    id: str; name: str; email: str; phone: str; created_at: str

class QuestionRequest(BaseModel):
    job_role:           str = Field(...)
    experience:         str = Field(default="Fresher (0 years)")
    skills:             str = Field(default="")
    candidate_id:       str = Field(default="anonymous")
    candidate_name:     str = Field(default="Candidate")
    previous_questions: list[str] = Field(default_factory=list)
    personality:        str = Field(default="strict")  # strict|friendly|hr|architect

class QuestionResponse(BaseModel):
    question: str; topic: str; difficulty: str
    category: str; follow_up_hint: str

class AssessRequest(BaseModel):
    candidate_id:          str
    job_role:              str   = Field(default="Software Engineer")
    experience:            str   = Field(default="Fresher (0 years)")
    skills:                str   = Field(default="")
    spoken_answer:         str
    detected_emotion:      str   = Field(default="Neutral")
    current_question:      str   = Field(default="Tell me about yourself.")
    # ── New fields added for Human.js + Monaco integration ──────────────
    wpm:                   float = Field(default=130.0, description="Words per minute from speech analysis")
    behavioral_telemetry:  dict  = Field(default_factory=dict, description="Human.js client-side behavioral metrics")
    workspace_code:        str   = Field(default="", description="Candidate's Monaco editor code submission")
    # ── BUG-07 fix: Sprint 3 fields — were being silently stripped by Pydantic ──
    interview_memory:      list[dict] = Field(default_factory=list, description="Prior Q&A pairs for contextual follow-up generation")
    question_index:        int   = Field(default=0, description="Current question number for pacing logic")

class AssessResponse(BaseModel):
    action:                  str   = Field(default="normal", description="repeat | skip | normal")
    technical_score:         int   = Field(default=0, ge=0, le=100)  # 0-100 scale
    communication_score:     int   = Field(default=60, ge=0, le=100)
    confidence_score:        int   = Field(default=60, ge=0, le=100)
    problem_solving_score:   int   = Field(default=60, ge=0, le=100)
    role_alignment_score:    int   = Field(default=60, ge=0, le=100)
    professionalism_score:   int   = Field(default=60, ge=0, le=100)
    learning_potential_score:int   = Field(default=60, ge=0, le=100)
    behavioral_score:        int   = Field(default=60, ge=0, le=100)
    fluency_score:           int   = Field(default=60, ge=0, le=100)
    eq_feedback:             str   = Field(default="")
    repeated_words_detected: list[str] = Field(default_factory=list)
    next_technical_question: str   = Field(default="")
    follow_up_question:      str   = Field(default="")
    next_topic:              str   = Field(default="")
    answer_quality:          str   = Field(default="average")
    final_verdict:           str   = Field(default="")
    model_used:              str   = Field(default="sterling ai")

class GlobalConfigSet(BaseModel):
    key: str
    value: str

class RoleConfigSet(BaseModel):
    job_role: str
    persona: str
    tech_weight: int = 40
    comm_weight: int = 20
    eq_weight: int = 20
    conf_weight: int = 20

class SaveInterviewRequest(BaseModel):
    candidate_id:            str
    technical_score:         int   = Field(default=0, ge=0, le=100)
    eq_score:                int   = Field(default=0, ge=0, le=100)
    confidence:              int   = Field(default=0, ge=0, le=100)
    communication:           int   = Field(default=0, ge=0, le=100)
    problem_solving_score:   int   = Field(default=0, ge=0, le=100)
    role_alignment_score:    int   = Field(default=0, ge=0, le=100)
    professionalism_score:   int   = Field(default=0, ge=0, le=100)
    learning_potential_score:int   = Field(default=0, ge=0, le=100)
    behavioral_score:        int   = Field(default=0, ge=0, le=100)
    fluency_score:           int   = Field(default=0, ge=0, le=100)
    facial_score:            int   = Field(default=0, ge=0, le=100)
    summary:                 str   = Field(default="Interview completed.")
    strengths:               list[str] = Field(default_factory=list)
    weaknesses:              list[str] = Field(default_factory=list)
    overall_rating:          str   = Field(default="Average")
    hiring_recommendation:   str   = Field(default="Neutral")
    readiness_score:         int   = Field(default=0, ge=0, le=100)
    proctoring_warnings:     int   = Field(default=0)
    proctoring_logs:         list[dict] = Field(default_factory=list)

class AdminQuestion(BaseModel):
    department: str
    role: str
    question: str
    keywords: str
    difficulty: str = Field(default="Medium")

class DashboardData(BaseModel):
    total_candidates:    int   = Field(default=0)
    interviews_completed: int  = Field(default=0)
    avg_technical_score: float = Field(default=0.0)
    avg_confidence:      float = Field(default=0.0)
    recent_candidates:   list[dict] = Field(default_factory=list)

class ExecuteCodeRequest(BaseModel):
    code: str
    language: str

# ── Endpoints ─────────────────────────────────────────────────────────────

@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    # Serve the SEM logo bundled relative to this file
    logo_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "frontend", "src", "assets", "sterling_logo.png")
    if os.path.exists(logo_path):
        return FileResponse(logo_path, media_type="image/png")
    from fastapi.responses import Response
    return Response(status_code=204)  # No Content — graceful fallback

@app.get("/", tags=["System"])
def health_check():
    return {
        "status": "online",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "ai_status": get_orchestrator_stats(),
        "architect": "Aditya Singh",
        "ai_models": ["Sterling Assessment Engine", "Intelligent Analysis Engine", "Candidate Analysis Engine"],
        "orchestrator_mode": "ACTIVE"
    }

@app.post("/api/execute-code", tags=["Interview"])
async def execute_code(req: ExecuteCodeRequest):
    """Securely compile and execute code on the backend (Prototype Sandbox)"""
    import sys, io
    import traceback
    import builtins

    # We only support python in this MVP sandbox
    if req.language.lower() not in ["python", "python3"]:
        return {"output": f"Backend execution for {req.language} is not supported in this prototype. Please use Python.", "error": True}

    old_stdout = sys.stdout
    redirected_output = sys.stdout = io.StringIO()

    # Restrict builtins to safe subset — prevents os/sys/open/import access
    SAFE_BUILTINS = {
        "print": print, "range": range, "len": len, "enumerate": enumerate,
        "zip": zip, "map": map, "filter": filter, "sorted": sorted,
        "reversed": reversed, "sum": sum, "min": min, "max": max,
        "abs": abs, "round": round, "int": int, "float": float, "str": str,
        "bool": bool, "list": list, "dict": dict, "set": set, "tuple": tuple,
        "isinstance": isinstance, "type": type, "repr": repr, "chr": chr,
        "ord": ord, "hex": hex, "bin": bin, "oct": oct, "pow": pow,
        "divmod": divmod, "hash": hash, "id": id, "any": any, "all": all,
        "Exception": Exception, "ValueError": ValueError, "TypeError": TypeError,
        "KeyError": KeyError, "IndexError": IndexError, "StopIteration": StopIteration,
    }
    try:
        # Restricted Sandbox - DISABLED DUE TO SECURITY AUDIT (SEC-001)
        # allowed_globals = {"__builtins__": SAFE_BUILTINS}
        # exec(req.code, allowed_globals)
        # output = redirected_output.getvalue()
        return {"output": "Execution disabled by administrator for security compliance.", "error": False}
    except Exception as e:
        error_output = traceback.format_exc()
        return {"output": error_output, "error": True}
    finally:
        sys.stdout = old_stdout

@app.get("/api/system/status", tags=["System"])
def system_status():
    """Full system health: circuit breakers, model stats, Whisper status."""
    return {
        "version": "5.0.0",
        "circuit_breakers": all_breaker_status(),
        "orchestrator_stats": get_orchestrator_stats(),
        "whisper": get_whisper_status(),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

# ── Candidates ────────────────────────────────────────────────────────────

# --- Rate Limiting Setup ---
_register_rate_limit = {}

@app.post("/api/auth/register", response_model=CandidateResponse, tags=["Auth"])
async def register_candidate(request: Request, data: CandidateRegister, db: Session = Depends(get_db)):
    ip = request.client.host if request.client else "127.0.0.1"
    now = time.time()
    
    # Prune old entries
    if ip in _register_rate_limit:
        _register_rate_limit[ip] = [ts for ts in _register_rate_limit[ip] if now - ts < 60]
    else:
        _register_rate_limit[ip] = []
        
    if len(_register_rate_limit[ip]) >= 50:
        raise HTTPException(status_code=429, detail="Too many registration attempts. Please wait a minute.")
        
    _register_rate_limit[ip].append(now)

    existing = db.query(Candidate).filter(Candidate.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists. Please login.")
    
    cid = generate_enterprise_id(db, "CAN")
    pwd_hash = bcrypt.hashpw(data.password.encode(), bcrypt.gensalt()).decode('utf-8')
    
    new_cand = Candidate(
        candidate_id=cid,
        name=data.name,
        email=data.email,
        phone=data.phone,
        password_hash=pwd_hash
    )
    db.add(new_cand)
    db.commit()
    
    return CandidateResponse(id=cid, name=data.name, email=data.email, phone=data.phone, created_at=str(new_cand.registration_date))

_login_rate_limit = {}

@app.post("/api/auth/login", tags=["Auth"])
async def login_candidate(request: Request, data: CandidateLogin, db: Session = Depends(get_db)):
    ip = request.client.host if request.client else "127.0.0.1"
    now = time.time()
    
    if ip in _login_rate_limit:
        _login_rate_limit[ip] = [ts for ts in _login_rate_limit[ip] if now - ts < 60]
    else:
        _login_rate_limit[ip] = []
        
    if len(_login_rate_limit[ip]) >= 100:
        raise HTTPException(status_code=429, detail="Too many login attempts. Please wait a minute.")
        
    _login_rate_limit[ip].append(now)

    cand = db.query(Candidate).filter(Candidate.email == data.email).first()
    if not cand or not bcrypt.checkpw(data.password.encode(), cand.password_hash.encode('utf-8')):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    return {"status": "success", "candidate_id": cand.candidate_id, "name": cand.name}

@app.post("/api/auth/admin-login", tags=["Auth"])
async def admin_login(data: CandidateLogin):
    # Hardcoded admin credentials for prototype
    if data.email == "admin@sterling.com" and data.password == "admin":
        # Token expires in 2 hours
        payload = {"sub": "admin", "exp": int(time.time()) + 7200}
        token = jwt.encode(payload, JWT_SECRET, algorithm="HS256")
        return {"status": "success", "token": token}
    raise HTTPException(status_code=401, detail="Invalid admin credentials")

@app.get("/api/candidates/{candidate_id}", tags=["Candidates"])
async def get_candidate(candidate_id: str, db: Session = Depends(get_db)):
    cand = db.query(Candidate).filter(Candidate.candidate_id == candidate_id).first()
    if not cand: raise HTTPException(status_code=404, detail="Candidate not found")
    
    interviews = []
    for i in cand.interviews:
        interviews.append({
            "interview_id": i.interview_id,
            "role": i.role.role_name if i.role else "",
            "department": i.role.department.department_name if i.role and i.role.department else "",
            "date": i.started_at,
            "status_id": i.status_id,
            "score": i.overall_score
        })
        
    return {
        "id": cand.candidate_id,
        "name": cand.name,
        "email": cand.email,
        "phone": cand.phone,
        "created_at": cand.registration_date,
        "interviews": interviews
    }

@app.post("/api/candidates/{candidate_id}/apply", tags=["Candidates"])
async def apply_for_role(candidate_id: str, data: ApplicationCreate, db: Session = Depends(get_db)):
    cand = db.query(Candidate).filter(Candidate.candidate_id == candidate_id).first()
    if not cand: raise HTTPException(status_code=404, detail="Candidate not found")
    
    role = db.query(JobRole).filter(JobRole.role_name == data.job_role).first()
    if not role:
        raise HTTPException(status_code=400, detail="Invalid job role. Role not found in database.")
    
    rid = generate_enterprise_id(db, "RES")
    new_resume = Resume(
        resume_id=rid,
        candidate_id=cand.candidate_id,
        experience_years=data.experience,
        skills_detected=data.skills
    )
    db.add(new_resume)
    
    iid = generate_enterprise_id(db, "INT")
    new_interview = InterviewSession(
        interview_id=iid,
        candidate_id=cand.candidate_id,
        role_id=role.role_id,
        status_id=100
    )
    db.add(new_interview)
    
    db.commit()
    
    # Pre-warm AI session logic usually here
    
    return {"status": "success", "interview_id": iid, "resume_id": rid}

# ── Admin Panel ───────────────────────────────────────────────────────────

@app.get("/api/admin/questions", tags=["Admin"])
async def get_admin_questions(db: Session = Depends(get_db)):
    """Fetch all admin-defined questions."""
    rows = db.query(QuestionBank).all()
    return [{
        "id": r.question_id,
        "department": r.department.department_name if r.department else "",
        "role": r.role.role_name if r.role else "",
        "question": r.question_text,
        "keywords": r.keywords,
        "difficulty": r.difficulty,
        "created_at": r.created_at
    } for r in rows]

@app.post("/api/admin/questions", tags=["Admin"])
async def add_admin_question(data: AdminQuestion, db: Session = Depends(get_db)):
    """Add a new question to the admin question bank."""
    dept = db.query(Department).filter(Department.department_name == data.department).first()
    role = db.query(JobRole).filter(JobRole.role_name == data.role).first()
    if not dept or not role:
        raise HTTPException(status_code=400, detail="Invalid department or role")
    
    qid = generate_enterprise_id(db, "Q")
    new_q = QuestionBank(
        question_id=qid,
        department_id=dept.department_id,
        role_id=role.role_id,
        question_text=data.question,
        keywords=data.keywords,
        difficulty=data.difficulty
    )
    db.add(new_q)
    db.commit()
    return {"status": "success", "id": qid}

@app.post("/api/admin/questions/bulk", tags=["Admin"])
async def add_admin_questions_bulk(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Bulk import questions from a CSV file."""
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")
        
    content = await file.read()
    try:
        text_content = content.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="Invalid file encoding. Please upload a UTF-8 CSV.")
        
    import csv, io
    reader = csv.DictReader(io.StringIO(text_content))
    required_cols = {"department", "role", "question", "keywords", "difficulty"}
    
    if not reader.fieldnames or not required_cols.issubset(set([f.strip().lower() for f in reader.fieldnames])):
        raise HTTPException(status_code=400, detail=f"CSV must contain columns: {', '.join(required_cols)}")
        
    col_map = {f.strip().lower(): f for f in reader.fieldnames}
    
    imported_count = 0
    skipped_count = 0
    failed_count = 0
    failed_reasons = []
    
    new_structure_map = {}
    ts = datetime.now(timezone.utc).isoformat()
    
    for idx, row in enumerate(reader, start=1):
        try:
            dept_name = row[col_map["department"]].strip() or "General"
            role_name = row[col_map["role"]].strip() or "Any"
            question_text = row[col_map["question"]].strip()
            keywords = row[col_map["keywords"]].strip()
            difficulty = row[col_map["difficulty"]].strip() or "Medium"
            
            if not question_text:
                skipped_count += 1
                continue
                
            # Ensure Dept exists
            dept = db.query(Department).filter_by(department_name=dept_name).first()
            if not dept:
                # BUG-08 fix: Use generate_enterprise_id instead of max_dept+1 to prevent ID collisions
                dept_id = generate_enterprise_id(db, "DEPT")
                dept = Department(department_id=dept_id, department_name=dept_name)
                db.add(dept)
                db.commit()
                db.refresh(dept)
                
            # Ensure Role exists
            role = db.query(JobRole).filter_by(role_name=role_name, department_id=dept.department_id).first()
            if not role:
                role_id = generate_enterprise_id(db, "ROLE")
                role = JobRole(role_id=role_id, department_id=dept.department_id, role_name=role_name)
                db.add(role)
                db.commit()
                db.refresh(role)
                
            qid = generate_enterprise_id(db, "Q")
            new_q = QuestionBank(
                question_id=qid,
                department_id=dept.department_id,
                role_id=role.role_id,
                question_text=question_text,
                keywords=keywords,
                difficulty=difficulty
            )
            db.add(new_q)
            db.commit()
            imported_count += 1
            
            if dept_name not in new_structure_map:
                new_structure_map[dept_name] = set()
            new_structure_map[dept_name].add(role_name)
            
        except Exception as e:
            db.rollback()
            failed_count += 1
            failed_reasons.append(f"Row {idx}: {str(e)}")
            
    # Merge with existing company structure
    try:
        curr_struct = db.query(GlobalConfig).filter_by(key="company_structure").first()
        company_structure = json.loads(str(curr_struct.value)) if curr_struct else {}
        
        for dept_str, roles in new_structure_map.items():
            if dept_str not in company_structure:
                company_structure[dept_str] = []
            for r_str in roles:
                if r_str not in company_structure[dept_str]:
                    company_structure[dept_str].append(r_str)
                    
        struct_json = json.dumps(company_structure)
        if curr_struct:
            curr_struct.value = struct_json  # type: ignore
            curr_struct.updated_at = ts  # type: ignore
        else:
            import uuid
            db.add(GlobalConfig(id=str(uuid.uuid4()), key="company_structure", value=struct_json, updated_at=ts))
        
        db.commit()
    except Exception as e:
        db.rollback()
        
    return {
        "status": "success",
        "imported": imported_count,
        "skipped": skipped_count,
        "failed": failed_count,
        "errors": failed_reasons[:10]  # Return up to 10 errors
    }

@app.delete("/api/admin/questions/{q_id}", tags=["Admin"])
async def delete_admin_question(q_id: str, db: Session = Depends(get_db)):
    """Delete a question from the admin question bank."""
    q = db.query(QuestionBank).filter_by(question_id=q_id).first()
    if q:
        db.delete(q)
        db.commit()
    return {"status": "success"}

@app.post("/api/admin/seed", tags=["Admin"])
async def seed_admin_questions(db: Session = Depends(get_db)):
    """Seed the database with Sterling E-Mobility default roles and questions."""
    seed_data = [
        # EV Engineering
        ("EV Engineering", "Battery Management System (BMS) Engineer", "How do you design a passive cell balancing circuit, and what are the trade-offs compared to active balancing?", "Passive balancing, Active balancing, Resistors, Heat dissipation, Cell state of charge (SoC), Cell life, Efficiency", "Hard"),
        ("EV Engineering", "Battery Management System (BMS) Engineer", "Explain the algorithm used for State of Charge (SoC) estimation using Kalman filters.", "Kalman filter, State of Charge, Extended Kalman Filter (EKF), Battery model, Voltage measurement, Current integration", "Hard"),
        ("EV Engineering", "Firmware Engineer", "Describe a scenario where Priority Inversion can occur in an RTOS and how you would prevent it.", "Priority Inversion, RTOS, Mutex, Priority Inheritance, Semaphores, Deadlock", "Medium"),
        ("EV Engineering", "Firmware Engineer", "How do you handle hard faults on a Cortex-M series microcontroller?", "Hard fault, Cortex-M, Fault registers, Stack pointer, Debugging, Watchdog, LR (Link Register)", "Hard"),
        ("EV Engineering", "Motor Control Engineer", "What is Field Oriented Control (FOC) for a PMSM, and what are the Clarke and Park transformations used for?", "Field Oriented Control, FOC, PMSM, Clarke transformation, Park transformation, Alpha-beta, d-q axis, Stator current", "Hard"),
        ("EV Engineering", "CAN Protocol Engineer", "Explain the arbitration process in a CAN bus network and how message priority is determined.", "CAN bus, Arbitration, CSMA/CD, Message ID, Dominant bit, Recessive bit, Priority", "Medium"),
        ("EV Engineering", "Power Electronics Engineer", "Explain the working principle of a bidirectional DC-DC converter used in electric vehicles.", "DC-DC converter, Bidirectional, Buck-boost, MOSFET, IGBT, Switching frequency, Duty cycle", "Hard"),
        
        # Human Resources
        ("Human Resources", "HR Specialist", "How do you handle a situation where two employees have a significant conflict that is affecting team morale?", "Conflict resolution, Mediation, Active listening, Empathy, Company policy, De-escalation", "Medium"),
        ("Human Resources", "HR Specialist", "Describe your approach to sourcing and recruiting candidates for highly specialized technical roles.", "Sourcing, Boolean search, Passive candidates, Talent pipeline, Technical screening, LinkedIn Recruiter", "Medium"),
        ("Human Resources", "Talent Acquisition Specialist", "What metrics do you use to measure the success of a recruiting campaign?", "Time to fill, Cost per hire, Quality of hire, Offer acceptance rate, Source of hire", "Medium"),
        ("Human Resources", "Talent Acquisition Specialist", "How do you ensure a fair and unbiased interview process for all candidates?", "Unconscious bias, Structured interviews, Standardized rubrics, Diverse panels, Objective criteria", "Medium"),
        ("Human Resources", "Learning and Development Specialist", "Explain your process for identifying training needs within an organization.", "Needs assessment, Skills gap analysis, Employee feedback, Performance reviews, Organizational goals", "Medium"),
        
        # Finance
        ("Finance", "Financial Analyst", "Walk me through the three main financial statements and how they are linked.", "Income statement, Balance sheet, Cash flow statement, Net income, Retained earnings, Assets, Liabilities", "Hard"),
        ("Finance", "Financial Analyst", "What is WACC (Weighted Average Cost of Capital), and how is it calculated?", "WACC, Cost of equity, Cost of debt, Tax rate, Capital structure, Discount rate, NPV", "Hard"),
        ("Finance", "Accounts Manager", "How do you ensure accuracy and compliance in month-end close procedures?", "Month-end close, Reconciliation, Accruals, GAAP, Financial reporting, Audit trails", "Medium"),
        
        # Customer Support
        ("Customer Support", "Customer Success Manager", "Describe a time you turned around a highly dissatisfied client.", "De-escalation, Active listening, Root cause analysis, Action plan, Empathy, Follow-up, Retention", "Medium"),
        ("Customer Support", "Customer Success Manager", "What strategies do you use to increase product adoption and reduce churn?", "Onboarding, User training, Proactive outreach, Health scores, QBRs, Feedback loops, Value proposition", "Medium"),
        
        # Sales
        ("Sales", "Sales Executive", "What is your framework for qualifying a new lead?", "BANT, Budget, Authority, Need, Timeline, MEDDIC, Qualification, Discovery", "Medium"),
        ("Sales", "Sales Executive", "How do you handle objections regarding price from a potential client?", "Value selling, ROI, Empathy, Negotiation, Objection handling, Total cost of ownership, Competitive advantage", "Hard"),
        ("Sales", "Sales Manager", "How do you go about building and forecasting a sales pipeline?", "Forecasting, Pipeline velocity, Conversion rates, CRM, Quota, Deal stages, Sales cycle", "Medium"),
        
        # IT
        ("IT", "Cybersecurity Analyst", "What is the difference between a vulnerability assessment and a penetration test?", "Vulnerability assessment, Penetration test, Exploitation, False positives, Scanning, Remediation, Ethical hacking", "Medium"),
        ("IT", "Cybersecurity Analyst", "Explain the concept of Zero Trust Architecture.", "Zero Trust, Principle of least privilege, Micro-segmentation, Multi-factor authentication (MFA), Continuous verification", "Hard"),
        ("IT", "System Administrator", "How do you troubleshoot a server that has suddenly become unresponsive?", "Ping, SSH, Resource monitoring, Top, Logs, dmesg, Network routing, Reboot", "Medium"),
        
        # Marketing
        ("Marketing", "Brand Manager", "How do you measure the ROI of a brand awareness campaign?", "Brand recall, Social listening, Web traffic, Impressions, Share of voice, Surveys, Search volume", "Medium"),
        ("Marketing", "Marketing Specialist", "What is your approach to A/B testing a new email marketing campaign?", "A/B testing, Control group, Variables, Subject line, CTR, Open rate, Statistical significance", "Medium"),
        
        # Operations
        ("Operations", "Supply Chain Analyst", "Explain the concept of Just-in-Time (JIT) manufacturing and its risks.", "JIT, Inventory management, Lean manufacturing, Supply chain disruption, Lead times, Supplier relationships, Cost reduction", "Hard"),
        ("Operations", "Operations Manager", "How do you approach bottleneck analysis in a production process?", "Bottleneck, Throughput, Six Sigma, Process mapping, Capacity planning, Cycle time, Efficiency", "Medium")
    ]
    
    seeded_count = 0
    new_structure_map = {}
    ts = datetime.now(timezone.utc).isoformat()
    
    try:
        for dept_str, role_str, q, keys, diff in seed_data:
            # Ensure Dept exists
            dept = db.query(Department).filter_by(department_name=dept_str).first()
            if not dept:
                max_dept = db.query(Department).count()
                dept = Department(department_id=f"DEPT{max_dept+1}", department_name=dept_str)
                db.add(dept)
                db.commit()
                db.refresh(dept)
                
            # Ensure Role exists
            role = db.query(JobRole).filter_by(role_name=role_str, department_id=dept.department_id).first()
            if not role:
                role_id = generate_enterprise_id(db, "ROLE")
                role = JobRole(role_id=role_id, department_id=dept.department_id, role_name=role_str)
                db.add(role)
                db.commit()
                db.refresh(role)
            
            # Check if exists
            existing = db.query(QuestionBank).filter_by(question_text=q).first()
            if existing:
                continue
                
            qid = generate_enterprise_id(db, "Q")
            db.add(QuestionBank(
                question_id=qid,
                department_id=dept.department_id,
                role_id=role.role_id,
                question_text=q,
                keywords=keys,
                difficulty=diff
            ))
            seeded_count += 1
            
            if dept_str not in new_structure_map:
                new_structure_map[dept_str] = set()
            new_structure_map[dept_str].add(role_str)
            
        curr_struct = db.query(GlobalConfig).filter_by(key="company_structure").first()
        company_structure = json.loads(str(curr_struct.value)) if curr_struct else {}
        
        for d, roles in new_structure_map.items():
            if d not in company_structure:
                company_structure[d] = []
            for r in roles:
                if r not in company_structure[d]:
                    company_structure[d].append(r)
                    
        struct_json = json.dumps(company_structure)
        if curr_struct:
            curr_struct.value = struct_json  # type: ignore
            curr_struct.updated_at = ts  # type: ignore
        else:
            db.add(GlobalConfig(id=str(uuid.uuid4()), key="company_structure", value=struct_json, updated_at=ts))
        
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Seed failed: {e}")
        return {"status": "error", "message": str(e)}
    
    if seeded_count > 0:
        return {"status": "success", "message": f"Seeded {seeded_count} new questions."}
    else:
        return {"status": "skipped", "message": "Defaults are already fully seeded."}

# ── Admin Config ──────────────────────────────────────────────────────────

@app.get("/api/admin/config/global/{key}", tags=["Admin"])
async def get_global_config(key: str, db: Session = Depends(get_db)):
    row = db.query(GlobalConfig).filter_by(key=key).first()
    return {"value": row.value if row else ""}

@app.post("/api/admin/config/global", tags=["Admin"])
async def set_global_config(req: GlobalConfigSet, db: Session = Depends(get_db)):
    ts = datetime.now(timezone.utc).isoformat()
    row = db.query(GlobalConfig).filter_by(key=req.key).first()
    if row:
        row.value = req.value  # type: ignore
        row.updated_at = ts  # type: ignore
    else:
        db.add(GlobalConfig(id=str(uuid.uuid4()), key=req.key, value=req.value, updated_at=ts))
    db.commit()
    return {"status": "success"}

@app.get("/api/admin/config/role/{job_role:path}", tags=["Admin"])
async def get_role_config(job_role: str, db: Session = Depends(get_db)):
    row = db.query(JobRole).filter_by(role_name=job_role).first()
    if not row:
        return {
            "job_role": job_role,
            "persona": "Strictly Technical (System Design)",
            "tech_weight": 40, "comm_weight": 20, "eq_weight": 20, "conf_weight": 20
        }
    return {
        "job_role": row.role_name,
        "persona": row.persona,
        "tech_weight": row.tech_weight,
        "comm_weight": row.comm_weight,
        "eq_weight": row.eq_weight,
        "conf_weight": row.conf_weight
    }

@app.post("/api/admin/config/role", tags=["Admin"])
async def set_role_config(req: RoleConfigSet, db: Session = Depends(get_db)):
    row = db.query(JobRole).filter_by(role_name=req.job_role).first()
    if row:
        row.persona = req.persona  # type: ignore
        row.tech_weight = req.tech_weight  # type: ignore
        row.comm_weight = req.comm_weight  # type: ignore
        row.eq_weight = req.eq_weight  # type: ignore
        row.conf_weight = req.conf_weight  # type: ignore
        db.commit()
    return {"status": "success"}

@app.get("/api/admin/pipeline", tags=["Admin"])
async def get_candidate_pipeline(db: Session = Depends(get_db)):
    """Returns all candidates joined with their interview scores for the HR Dashboard."""
    cands = db.query(Candidate).order_by(Candidate.registration_date.desc()).all()
    results = []
    for c in cands:
        interviews = sorted(c.interviews, key=lambda i: i.started_at, reverse=True)  # type: ignore
        latest = interviews[0] if interviews else None
        resume = db.query(Resume).filter_by(candidate_id=c.candidate_id).order_by(Resume.resume_id.desc()).first()
        results.append({
            "id": c.candidate_id,
            "name": c.name,
            "email": c.email,
            "job_role": (latest.role.role_name if (latest and latest.role) else ""),
            "experience": resume.experience_years if resume else "",
            "created_at": c.registration_date,
            "global_score": latest.overall_score if latest else 0.0,
            "hiring_decision": latest.recommendation if latest and latest.recommendation else "PENDING",
            "status": "COMPLETED" if latest and latest.completed_at else "PENDING"
        })
    return results

# ── Resume Upload & AI Screening ──────────────────────────────────────────────────

@app.post("/api/resumes/{resume_id}/upload", tags=["Resume Intelligence"])
async def upload_resume(
    resume_id: str,
    interview_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Upload a resume PDF/TXT, parse it with Sterling AI, and score it against the job role."""
    resume = db.query(Resume).filter_by(resume_id=resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
        
    interview = db.query(InterviewSession).filter_by(interview_id=interview_id).first()
    
    job_role = str(interview.role.role_name) if (interview and interview.role) else ""
    skills = str(resume.skills_detected) if resume.skills_detected else ""
    experience = str(resume.experience_years) if resume.experience_years else ""
    candidate_id = str(interview.candidate_id) if interview else "UNKNOWN"

    # Read file content
    raw_bytes = await file.read()
    resume_text = ""
    filename = (file.filename or "").lower()

    if filename.endswith(".txt"):
        try:
            resume_text = raw_bytes.decode("utf-8", errors="ignore")
        except Exception:
            resume_text = raw_bytes.decode("latin-1", errors="ignore")
    elif filename.endswith(".pdf"):
        try:
            import PyPDF2
            reader = PyPDF2.PdfReader(io.BytesIO(raw_bytes))
            resume_text = " ".join(page.extract_text() or "" for page in reader.pages)
        except Exception as e:
            logger.error(f"PyPDF2 extraction failed: {e}")
            resume_text = raw_bytes.decode("utf-8", errors="ignore")
    else:
        resume_text = raw_bytes.decode("utf-8", errors="ignore")

    persona = interview.role.persona if (interview and interview.role) else "General Technical Applicant"
    
    questions = db.query(QuestionBank).filter_by(role_id=interview.role_id).all() if interview else []
    # BUG-18 fix: Properly deduplicate individual keywords from question bank (not whole comma-strings)
    all_keywords = []
    for q in questions:
        if q.keywords:
            all_keywords.extend([k.strip() for k in q.keywords.split(',')])
    role_keywords = ", ".join(dict.fromkeys(all_keywords))  # Preserves order, deduplicates

    parsed = await parse_and_score_resume(
        resume_text=resume_text,
        job_role=job_role,
        required_skills=skills,
        role_keywords=role_keywords,
        persona=persona,
    )

    resume_score = parsed.get("resume_score", 50)
    parsed_skills = json.dumps(parsed.get("extracted_skills", []))
    parsed_projects = json.dumps(parsed.get("extracted_projects", []))
    
    if resume:
        resume.extracted_text = resume_text  # type: ignore
        resume.skills_detected = parsed_skills  # type: ignore
        resume.resume_score = float(resume_score)  # type: ignore
    
    # Candidate status changes to ready (200) after parsing
    if interview:
        interview.status_id = 200  # type: ignore
    db.commit()

    # Pre-warm interview session with resume context
    session = get_or_create_session(candidate_id, job_role, experience, skills)
    session.resume_context = parsed

    logger.info(f"Resume processed: {candidate_id} | Score: {resume_score}")
    return {
        "resume_score": resume_score,
        "status": "READY",
        "shortlist_recommendation": parsed.get("shortlist_recommendation", "REVIEW"),
        "shortlist_reason": parsed.get("shortlist_reason", ""),
        "extracted_skills": parsed.get("extracted_skills", []),
        "interview_focus_areas": parsed.get("interview_focus_areas", []),
        "resume_quality": parsed.get("resume_quality", "Average"),
        "strengths": parsed.get("strengths", []),
        "red_flags": parsed.get("red_flags", []),
    }

# ── Candidate Leaderboard ───────────────────────────────────────────────────────

@app.get("/api/leaderboard", tags=["Recruiter"])
async def get_leaderboard(db: Session = Depends(get_db)):
    """Return all candidates ranked by global score. The recruiter's shortlist view."""
    cands = db.query(Candidate).order_by(Candidate.registration_date.desc()).all()
    candidates = []
    
    for c in cands:
        interviews = sorted(c.interviews, key=lambda i: i.started_at, reverse=True)  # type: ignore
        latest = interviews[0] if interviews else None
        resume = db.query(Resume).filter_by(candidate_id=c.candidate_id).order_by(Resume.resume_id.desc()).first()
        
        d = {
            "id": c.candidate_id,
            "name": c.name,
            "email": c.email,
            "job_role": (latest.role.role_name if (latest and latest.role) else ""),
            "experience": resume.experience_years if resume else "",
            "resume_score": getattr(resume, "resume_score", 50) if resume else 50,  # BUG-04 fix: ats_score → resume_score
            "resume_status": 200 if resume else 100,
            "technical_score": latest.technical_score if latest else 0.0,
            "communication_score": latest.communication_score if latest else 0.0,
            "confidence_score": latest.confidence_score if latest else 0.0,
            "problem_solving_score": getattr(latest, "problem_solving_score", 0.0) if latest else 0.0,
            "role_alignment_score": getattr(latest, "role_alignment_score", 0.0) if latest else 0.0,
            "professionalism_score": getattr(latest, "professionalism_score", 0.0) if latest else 0.0,
            "learning_potential_score": getattr(latest, "learning_potential_score", 0.0) if latest else 0.0,
            "behavioral_score": latest.behavioral_score if latest else 0.0,
            "fluency_score": getattr(latest, "fluency_score", 0.0) if latest else 0.0,
            "eq_score": getattr(latest, "eq_score", 0.0) if latest else 0.0,
            "global_score": latest.overall_score if latest else 0.0,
            "hiring_decision": latest.recommendation if latest and latest.recommendation else "PENDING",
            "interview_status": "completed" if latest and latest.completed_at else "pending",
            "proctoring_warnings": getattr(latest, "proctoring_warnings", 0) if latest else 0,
            "created_at": c.registration_date
        }
        
        if float(d.get("global_score", 0.0)) == 0.0 and float(d.get("technical_score", 0.0)) > 0.0:  # type: ignore
            d["global_score"] = calculate_global_score(
                resume_score=float(d["resume_score"]),  # type: ignore
                technical_score=float(d["technical_score"]),  # type: ignore
                communication_score=float(d["communication_score"]),  # type: ignore
                confidence_score=float(d["confidence_score"]),  # type: ignore
                behavioral_score=float(d["behavioral_score"]),  # type: ignore
                fluency_score=float(d["fluency_score"]),  # type: ignore
                eq_score=float(d["eq_score"]),  # type: ignore
                job_role=str(d["job_role"]),  # type: ignore
            )
        candidates.append(d)

    ranked = rank_candidates(candidates)
    return {"total": len(ranked), "candidates": ranked}

# ── AI Engine: Smart Question Generation ─────────────────────────────────

@app.post("/generate-question", response_model=QuestionResponse, tags=["AI Engine"])
async def generate_question(req: QuestionRequest):
    """Context-aware, adaptive, profile-specific question generation."""
    result = await generate_smart_question(
        candidate_id=req.candidate_id,
        candidate_name=req.candidate_name,
        job_role=req.job_role,
        experience=req.experience,
        skills=req.skills,
        personality=req.personality,
    )
    return QuestionResponse(
        question=result["question"],
        topic=result["topic"],
        difficulty=result["difficulty"],
        category=result.get("category", "Technical"),
        follow_up_hint=result["follow_up_hint"],
    )

class TTSRequest(BaseModel):
    text: str = Field(..., min_length=1)

@app.post("/api/tts", tags=["AI Engine"])
async def stream_tts_post(req: TTSRequest):
    """Streams an audio blob from ElevenLabs or OpenAI based on text input."""
    return await generate_tts_stream(req.text)

@app.get("/api/tts", tags=["AI Engine"])
async def stream_tts_get(text: str):
    """Streams an audio blob via GET request for native browser streaming."""
    return await generate_tts_stream(text)

# ── WebSocket STT (Sprint 2) ──────────────────────────────────────────────

@app.websocket("/ws/stt")
async def websocket_stt_endpoint(websocket: WebSocket):
    """
    Continuous duplex stream for audio chunks.
    Receives raw audio, transcribes when silence is detected, and sends text back.
    """
    await websocket.accept()
    audio_buffer = bytearray()
    
    try:
        while True:
            data = await websocket.receive()
            if "bytes" in data:
                audio_buffer.extend(data["bytes"])
                # Memory protection: clear buffer if it exceeds ~2MB (approx 1 min of audio)
                if len(audio_buffer) > 2 * 1024 * 1024:
                    audio_buffer.clear()
                    logger.warning("WebSocket STT buffer overflow (>2MB). Cleared to prevent OOM.")
                # Send interim feedback so UI knows it's alive
                await websocket.send_json({"type": "interim", "text": "Listening..."})
            elif "text" in data:
                msg = json.loads(data["text"])
                if msg.get("action") == "transcribe_now":
                    # Silence detected by frontend VAD or manual stop
                    if len(audio_buffer) > 0:
                        result = await transcribe_audio(bytes(audio_buffer))
                        await websocket.send_json({"type": "final", "text": result["transcript"]})
                        audio_buffer.clear()
                    else:
                        await websocket.send_json({"type": "final", "text": ""})
    except WebSocketDisconnect:
        logger.info("WebSocket STT client disconnected.")
    except RuntimeError as e:
        if "disconnect message has been received" in str(e):
            logger.info("WebSocket STT client connection closed gracefully.")
        else:
            logger.error(f"WebSocket STT RuntimeError: {e}")
    except Exception as e:
        logger.error(f"WebSocket STT Error: {e}")

# ── AI Engine: Answer Assessment ──────────────────────────────────────────

@app.post("/api/interview/assess", response_model=AssessResponse, tags=["AI Engine"])
async def assess_candidate(data: AssessRequest):
    """Full context-aware answer evaluation with multi-LLM orchestration."""
    filler_words = detect_filler_words(data.spoken_answer)

    # Merge behavioral telemetry emotion with detected_emotion if Human.js is active
    resolved_emotion = (
        data.behavioral_telemetry.get("emotion") or data.detected_emotion or "Neutral"
    )

    combined_answer = data.spoken_answer
    if data.workspace_code.strip():
        combined_answer += f"\n\n[Candidate submitted the following code]:\n```\n{data.workspace_code}\n```"

    result = await assess_answer(
        candidate_id=data.candidate_id,
        job_role=data.job_role,
        experience=data.experience,
        skills=data.skills,
        question=data.current_question,
        answer=combined_answer,
        emotion=resolved_emotion,
        filler_words=filler_words,
        wpm=data.wpm,
    )

    # Log workspace code submission if present (stored for recruiter report)
    if data.workspace_code.strip():
        logger.info(
            f"Code submission from {data.candidate_id} ({len(data.workspace_code)} chars) "
            f"for: {data.current_question[:60]}..."
        )
        # Append code context to session memory
        session = get_session(data.candidate_id)
        if session:
            session.conversation_history.append({
                "role": "candidate_code",
                "content": data.workspace_code[:2000],  # cap at 2000 chars
            })

    # Safe feedback key resolution (handles both 'feedback' and 'eq_feedback' from parsers)
    feedback_text = result.get("eq_feedback") or result.get("feedback") or "Assessment complete."

    return AssessResponse(
        action=                  result.get("action", "normal"),
        technical_score=         int(result.get("technical_score", 0)),
        communication_score=     int(result.get("communication_score", 60)),
        confidence_score=        int(result.get("confidence_score", 60)),
        problem_solving_score=   int(result.get("problem_solving_score", 60)),
        role_alignment_score=    int(result.get("role_alignment_score", 60)),
        professionalism_score=   int(result.get("professionalism_score", 60)),
        learning_potential_score=int(result.get("learning_potential_score", 60)),
        behavioral_score=        int(result.get("behavioral_score", 60)),
        fluency_score=           int(result.get("fluency_score", 60)),
        eq_feedback=             feedback_text,
        repeated_words_detected= filler_words,
        next_technical_question= result.get("next_technical_question", ""),
        follow_up_question=      result.get("follow_up_question", ""),
        next_topic=              result.get("next_topic", ""),
        answer_quality=          result.get("answer_quality", "average"),
        final_verdict=           result.get("final_verdict", ""),
        model_used=              "sterling ai-2.0-flash",
    )

# ── Audio Transcription (Sterling Analysis Engine) ───────────────────────────────────

@app.post("/api/transcribe", tags=["AI Engine"])
async def transcribe_audio_endpoint(file: UploadFile = File(...)):
    """Transcribe audio blob using Groq Whisper (300ms) or OpenAI Whisper fallback."""
    raw_bytes = await file.read()
    if len(raw_bytes) < 100:
        return {"transcript": "", "model_used": "none", "error": "Audio too short"}

    result = await transcribe_audio(
        audio_bytes=raw_bytes,
        filename=file.filename or "audio.webm",
    )
    return result

# ── AI Engine: Final Report ───────────────────────────────────────────────

@app.get("/api/interview/ai-report/{candidate_id}", tags=["AI Engine"])
async def get_ai_report(candidate_id: str, db: Session = Depends(get_db)):
    """Generate Sterling AI-powered final evaluation report from memory."""
    c = db.query(Candidate).filter_by(candidate_id=candidate_id).first()
    if not c: raise HTTPException(status_code=404, detail="Candidate not found")
    
    iv = db.query(InterviewSession).filter_by(candidate_id=candidate_id).order_by(InterviewSession.started_at.desc()).first()
    resume = db.query(Resume).filter_by(candidate_id=candidate_id).order_by(Resume.resume_id.desc()).first()
    job_role_name = iv.role.role_name if (iv and iv.role) else ""
    
    report = await generate_final_report(
        candidate_id=candidate_id,
        candidate_name=str(c.name),
        job_role=job_role_name,
        experience=str(resume.experience_years) if resume else "",
    )
    return {"candidate": {"name": c.name, "job_role": job_role_name}, "ai_report": report}

# ── Data: Save Interview ──────────────────────────────────────────────────

@app.post("/api/interviews/save", tags=["Data"])
async def save_interview(req: SaveInterviewRequest, bg: BackgroundTasks, db: Session = Depends(get_db)):
    ts = datetime.now(timezone.utc).isoformat()

    c = db.query(Candidate).filter_by(candidate_id=req.candidate_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Candidate not found")
        
    iv = db.query(InterviewSession).filter_by(candidate_id=req.candidate_id).order_by(InterviewSession.started_at.desc()).first()
    if not iv:
        raise HTTPException(status_code=404, detail="Active interview session not found")
        
    resume = db.query(Resume).filter_by(candidate_id=req.candidate_id).order_by(Resume.resume_id.desc()).first()
    candidate_resume_score = getattr(resume, "resume_score", 50) if resume else 50  # BUG-05 fix: ats_score → resume_score
    candidate_job_role = iv.role.role_name if (iv and iv.role) else "default"

    global_score = calculate_global_score(
        resume_score=candidate_resume_score,
        technical_score=req.technical_score,
        communication_score=req.communication,
        confidence_score=req.confidence,
        behavioral_score=req.behavioral_score,
        fluency_score=req.fluency_score,
        eq_score=req.eq_score,
        job_role=candidate_job_role,
    )
    hiring = generate_hiring_decision(global_score, req.technical_score)

    iv.status_id = 400  # type: ignore
    iv.completed_at = ts  # type: ignore
    iv.overall_score = round(global_score, 1)  # type: ignore
    iv.technical_score = req.technical_score  # type: ignore
    iv.communication_score = req.communication  # type: ignore
    iv.behavioral_score = req.behavioral_score  # type: ignore
    iv.confidence_score = req.confidence  # type: ignore
    iv.problem_solving_score = req.problem_solving_score  # type: ignore
    iv.role_alignment_score = req.role_alignment_score  # type: ignore
    iv.professionalism_score = req.professionalism_score  # type: ignore
    iv.learning_potential_score = req.learning_potential_score  # type: ignore
    iv.fluency_score = req.fluency_score  # type: ignore
    iv.recommendation = hiring.get("decision", "Neutral")
    # Not creating a new InterviewSession, just updating the existing one
    
    # BUG-13 fix: Compute grade for FinalReport (was always NULL)
    if global_score >= 90: grade = "S"
    elif global_score >= 80: grade = "A"
    elif global_score >= 70: grade = "B"
    elif global_score >= 60: grade = "C"
    else: grade = "F"

    new_report = FinalReport(
        report_id=generate_enterprise_id(db, "REP"),
        candidate_id=req.candidate_id,
        interview_id=iv.interview_id,
        overall_score=round(global_score, 1),
        recommendation=req.hiring_recommendation,
        strengths=json.dumps(req.strengths),
        weaknesses=json.dumps(req.weaknesses),
        hiring_decision=hiring.get("decision", "Neutral"),
        grade=grade,
    )
    db.add(new_report)
    
    try:
        db.commit()
        logger.info(f"Interview saved: {iv.interview_id} | GlobalScore={global_score} | Decision={hiring.get('decision', 'N/A')}")
    except Exception as e:
        db.rollback()
        logger.error(f"DB persist failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save interview: {str(e)}")
        
    clear_session(req.candidate_id)
    return {
        "interview_id": iv.interview_id,
        "status": "saved",
        "created_at": ts,
        "global_score": round(global_score, 1),
        "hiring_decision": hiring.get("decision", "Neutral"),
        "hiring_label": hiring.get("label", "Under Review"),
    }

# ── Data: Report ──────────────────────────────────────────────────────────

@app.get("/api/reports/{candidate_id}", tags=["Data"])
async def get_candidate_report(candidate_id: str, db: Session = Depends(get_db)):
    c = db.query(Candidate).filter_by(candidate_id=candidate_id).first()
    if not c: raise HTTPException(status_code=404, detail="Candidate not found")
    
    interviews = sorted(c.interviews, key=lambda i: i.started_at, reverse=True)  # type: ignore
    latest = interviews[0] if interviews else None
    job_role_name = (latest.role.role_name if (latest and latest.role) else "")
    
    c_dict = {
        "id": c.candidate_id,
        "name": c.name,
        "email": c.email,
        "job_role": job_role_name,
    }
    
    if latest:
        report = latest.report
        # BUG-10/BUG-27 fix: Safe JSON parse — stored value could be empty string, None, or valid JSON
        def _safe_json_list(val):
            if not val: return []
            try: return json.loads(val)
            except Exception: return []
        iv = {
            "technical_score": latest.technical_score,
            "eq_score": getattr(latest, "eq_score", 0), 
            "confidence": latest.confidence_score, 
            "communication": latest.communication_score,
            "problem_solving": getattr(latest, "problem_solving_score", 0),
            "role_alignment": getattr(latest, "role_alignment_score", 0),
            "professionalism": getattr(latest, "professionalism_score", 0),
            "learning_potential": getattr(latest, "learning_potential_score", 0),
            "behavioral_score": latest.behavioral_score,
            "fluency_score": getattr(latest, "fluency_score", 0),
            "summary": "Interview completed.", 
            "strengths": _safe_json_list(report.strengths if report else None), 
            "weaknesses": _safe_json_list(report.weaknesses if report else None),
            "overall_rating": "N/A", "hiring_recommendation": report.recommendation if report else "N/A", "readiness_score": 0,
            "proctoring_warnings": getattr(latest, "proctoring_warnings", 0), 
            "proctoring_logs": []
        }
    else:
        iv = {
            "technical_score": 0, "eq_score": 0, "confidence": 0, "communication": 0,
            "problem_solving": 0, "role_alignment": 0, "professionalism": 0, "learning_potential": 0,
            "behavioral_score": 0, "fluency_score": 0,
            "summary": "Interview pending.", "strengths": [], "weaknesses": [],
            "overall_rating": "N/A", "hiring_recommendation": "N/A", "readiness_score": 0,
            "proctoring_warnings": 0, "proctoring_logs": []
        }
    return {"candidate": c_dict, "interview": iv}

# ── Data: Dashboard ───────────────────────────────────────────────────────

@app.get("/api/dashboard", response_model=DashboardData, tags=["Data"])
async def get_dashboard_data(db: Session = Depends(get_db)):
    total = db.query(Candidate).count()
    # BUG-16 fix: Count only COMPLETED sessions (completed_at IS NOT NULL), not all sessions
    complete = db.query(InterviewSession).filter(InterviewSession.completed_at.isnot(None)).count()
    
    interviews = db.query(InterviewSession).all()
    avg_tech = sum(i.technical_score for i in interviews) / len(interviews) if interviews else 0.0  # type: ignore
    avg_conf = sum(i.confidence_score for i in interviews) / len(interviews) if interviews else 0.0  # type: ignore
    
    recent = db.query(Candidate).order_by(Candidate.registration_date.desc()).limit(5).all()
    
    recent_dicts = []
    for r in recent:
        r_interviews = sorted(r.interviews, key=lambda i: i.started_at, reverse=True)  # type: ignore
        r_latest = r_interviews[0] if r_interviews else None
        recent_dicts.append({
            "name": r.name,
            "job_role": (r_latest.role.role_name if (r_latest and r_latest.role) else ""),
            "email": r.email,
            "created_at": r.registration_date
        })
        
    return DashboardData(
        total_candidates=total, interviews_completed=complete,
        avg_technical_score=round(float(avg_tech), 1),  # type: ignore
        avg_confidence=round(float(avg_conf), 1),  # type: ignore
        recent_candidates=recent_dicts,
    )

# ── WebSocket: Real-time NLP Stream ──────────────────────────────────────

@app.websocket("/ws/interview/{candidate_id}")
async def websocket_interview(websocket: WebSocket, candidate_id: str):
    await websocket.accept()
    logger.info(f"[WS] Connected: {candidate_id}")
    try:
        while True:
            raw = await websocket.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "detail": "Invalid JSON"})
                continue

            msg_type = msg.get("type", "")

            if msg_type == "ping":
                await websocket.send_json({"type": "pong", "ts": time.time()})

            elif msg_type == "transcript":
                # Real-time NLP analysis of partial transcript
                text    = msg.get("data", "")
                fillers = detect_filler_words(text)
                wpm     = words_per_minute(text, msg.get("duration", 30))
                session = get_session(candidate_id)
                await websocket.send_json({
                    "type": "analysis",
                    "filler_words": fillers,
                    "wpm": round(wpm, 1),
                    "question_count": session.question_index if session else 0,
                    "weak_areas": session.weak_areas[:3] if session else [],
                })

            elif msg_type == "behavioral_telemetry":
                # Human.js client-side behavioral metrics (runs silently in browser)
                # Store in session memory for final report generation
                telemetry = msg.get("data", {})
                session = get_session(candidate_id)
                if session and telemetry:
                    if not hasattr(session, "behavioral_log"):
                        session.behavioral_log = []
                    session.behavioral_log.append(telemetry)
                    # Keep last 50 readings (covers a ~8 minute interview at 10s intervals)
                    if len(session.behavioral_log) > 50:
                        session.behavioral_log = session.behavioral_log[-50:]
                logger.debug(f"[WS] Behavioral telemetry from {candidate_id}: attention={telemetry.get('attention_score', 'N/A')}")
                # No response needed — fire and forget

            elif msg_type == "submit_answer":
                # Full async assessment via WebSocket (avoids HTTP timeout on slow connections)
                answer   = msg.get("answer", "")
                question = msg.get("question", "")
                emotion  = msg.get("emotion", "Neutral")
                fillers  = detect_filler_words(answer)
                wpm      = msg.get("wpm", 0)
                await websocket.send_json({"type": "assessing", "message": "Sterling AI is evaluating your answer..."})
                try:
                    result = await assess_answer(
                        candidate_id=candidate_id,
                        job_role=msg.get("job_role", "Software Engineer"),
                        experience=msg.get("experience", "Fresher (0 years)"),
                        skills=msg.get("skills", ""),
                        question=question,
                        answer=answer,
                        emotion=emotion,
                        filler_words=fillers,
                        wpm=wpm,
                    )
                    feedback = result.get("eq_feedback") or result.get("feedback") or "Assessment complete."
                    await websocket.send_json({
                        "type": "assessment_complete",
                        "technical_score":     int(result.get("technical_score", 0)),
                        "communication_score": int(result.get("communication_score", 60)),
                        "confidence_score":    int(result.get("confidence_score", 60)),
                        "behavioral_score":    int(result.get("behavioral_score", 60)),
                        "fluency_score":       int(result.get("fluency_score", 60)),
                        "feedback":            feedback,
                        "next_question":       result.get("next_technical_question", ""),
                        "answer_quality":      result.get("answer_quality", "average"),
                        "filler_words":        fillers,
                        "model_used":          result.get("model_used", "sterling ai"),
                    })
                except Exception as assess_err:
                    logger.error(f"[WS] Assessment error: {assess_err}")
                    await websocket.send_json({
                        "type": "assessment_error",
                        "detail": "Assessment failed. Please try again.",
                    })

    except WebSocketDisconnect:
        logger.info(f"[WS] Disconnected: {candidate_id}")
    except Exception as e:
        logger.error(f"[WS] Error for {candidate_id}: {e}")
        try:
            await websocket.close(code=1011)
        except:
            pass

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("Main:app", host="0.0.0.0", port=8000, reload=True)