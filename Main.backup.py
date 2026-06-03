"""
=============================================================================
AI Virtual Interview Platform — Enterprise Backend v4.0
=============================================================================
Author:       Aditya Singh (Principal Architect)
Architecture: FastAPI + Gemini 2.0 Flash + SQLite + WebSockets
AI Layer:     services/gemini_service.py (context-aware, adaptive, memory-backed)
=============================================================================
"""

import os, re, json, time, uuid, logging, sqlite3, io, csv
from collections import Counter
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, UploadFile, File, Form, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# ── Service Layer ─────────────────────────────────────────────────────────
from services.gemini_service import (
    generate_smart_question,
    assess_answer,
    generate_final_report,
)
from services.interview_memory import get_or_create_session, get_session, clear_session
from services.prompt_engine import get_fallback_question, get_difficulty
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

# ── Database ──────────────────────────────────────────────────────────────
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "database.db")

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS candidates (
            id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL,
            phone TEXT, job_role TEXT NOT NULL, experience TEXT, skills TEXT,
            resume_text TEXT DEFAULT '',
            resume_score INTEGER DEFAULT 0,
            resume_status TEXT DEFAULT 'PENDING',
            parsed_skills TEXT DEFAULT '[]',
            parsed_projects TEXT DEFAULT '[]',
            interview_focus TEXT DEFAULT '[]',
            created_at TEXT NOT NULL
        )
    """)
    c.execute("""
        CREATE TABLE IF NOT EXISTS interviews (
            id TEXT PRIMARY KEY, candidate_id TEXT NOT NULL,
            technical_score INTEGER DEFAULT 0, eq_score INTEGER DEFAULT 0,
            confidence INTEGER DEFAULT 0, communication INTEGER DEFAULT 0,
            behavioral_score INTEGER DEFAULT 0, fluency_score INTEGER DEFAULT 0,
            facial_score INTEGER DEFAULT 0,
            global_score REAL DEFAULT 0.0,
            hiring_decision TEXT DEFAULT 'PENDING',
            summary TEXT, strengths TEXT, weaknesses TEXT,
            overall_rating TEXT, hiring_recommendation TEXT,
            readiness_score INTEGER DEFAULT 0,
            status TEXT DEFAULT 'pending', created_at TEXT NOT NULL,
            proctoring_warnings INTEGER DEFAULT 0,
            proctoring_logs TEXT DEFAULT '[]',
            FOREIGN KEY(candidate_id) REFERENCES candidates(id)
        )
    """)
    c.execute("""
        CREATE TABLE IF NOT EXISTS admin_questions (
            id TEXT PRIMARY KEY, 
            department TEXT NOT NULL, 
            role TEXT NOT NULL, 
            question TEXT NOT NULL, 
            keywords TEXT NOT NULL, 
            difficulty TEXT DEFAULT 'Medium',
            created_at TEXT NOT NULL
        )
    """)
    c.execute("""
        CREATE TABLE IF NOT EXISTS global_config (
            id TEXT PRIMARY KEY,
            key TEXT UNIQUE NOT NULL,
            value TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)
    c.execute("""
        CREATE TABLE IF NOT EXISTS role_config (
            job_role TEXT PRIMARY KEY,
            persona TEXT DEFAULT 'Strictly Technical (System Design)',
            tech_weight INTEGER DEFAULT 40,
            comm_weight INTEGER DEFAULT 20,
            eq_weight INTEGER DEFAULT 20,
            conf_weight INTEGER DEFAULT 20,
            updated_at TEXT NOT NULL
        )
    """)
    # Add new columns to existing tables if upgrading from older schema
    for col_def in [
        ("candidates", "resume_text", "TEXT DEFAULT ''"),
        ("candidates", "resume_score", "INTEGER DEFAULT 0"),
        ("candidates", "resume_status", "TEXT DEFAULT 'PENDING'"),
        ("candidates", "parsed_skills", "TEXT DEFAULT '[]'"),
        ("candidates", "parsed_projects", "TEXT DEFAULT '[]'"),
        ("candidates", "interview_focus", "TEXT DEFAULT '[]'"),
        ("interviews",  "global_score",  "REAL DEFAULT 0.0"),
        ("interviews",  "hiring_decision","TEXT DEFAULT 'PENDING'"),
        ("interviews",  "proctoring_warnings","INTEGER DEFAULT 0"),
        ("interviews",  "proctoring_logs","TEXT DEFAULT '[]'"),
        ("role_config", "tech_weight", "INTEGER DEFAULT 40"),
        ("role_config", "comm_weight", "INTEGER DEFAULT 20"),
        ("role_config", "eq_weight", "INTEGER DEFAULT 20"),
        ("role_config", "conf_weight", "INTEGER DEFAULT 20"),
    ]:
        try:
            c.execute(f"ALTER TABLE {col_def[0]} ADD COLUMN {col_def[1]} {col_def[2]}")
        except sqlite3.OperationalError:
            pass  # Column already exists — safe to ignore
            
    # Force sync the new comprehensive structure to the database
    full_structure = {
      "Customer Support": ["Customer Success Manager"],
      "Engineering": [
        "Embedded Systems Engineer", "BMS Engineer", "Motor Control Engineer",
        "Power Electronics Engineer", "Software Engineer", "Frontend Developer",
        "Backend Developer", "DevOps Engineer", "Data Scientist", "AI/ML Engineer"
      ],
      "Finance": ["Financial Analyst", "Accounts Manager"],
      "Human Resources": [
        "HR Specialist", "Talent Acquisition Specialist", "HR Manager",
        "Learning and Development Specialist", "Payroll Specialist"
      ],
      "IT": ["Cybersecurity Analyst", "System Administrator"],
      "Marketing": ["Marketing Specialist", "Brand Manager"],
      "Operations": ["Operations Manager", "Supply Chain Analyst"],
      "Sales": ["Sales Executive", "Sales Manager"]
    }
    
    ts = datetime.now(timezone.utc).isoformat()
    # Always merge to ensure we don't delete any roles they manually added, but we strictly enforce these exist
    curr = c.execute("SELECT value FROM global_config WHERE key = 'company_structure'").fetchone()
    if curr:
        try:
            curr_struct = json.loads(curr[0])
            for dept, roles in full_structure.items():
                if dept not in curr_struct:
                    curr_struct[dept] = []
                for role in roles:
                    if role not in curr_struct[dept]:
                        curr_struct[dept].append(role)
            full_structure = curr_struct
        except:
            pass
            
    c.execute(
        "INSERT INTO global_config (id, key, value, updated_at) VALUES (?,?,?,?) "
        "ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at",
        (str(uuid.uuid4()), "company_structure", json.dumps(full_structure), ts)
    )
            
    conn.commit(); conn.close()
    logger.info("Database synchronized (v5.0 schema): %s", DB_PATH)

# ── Lifespan ──────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Booting Enterprise AI Interview Engine v4.0...")
    init_db()
    key = os.getenv("GEMINI_API_KEY", "")
    if not key or key == "your_gemini_api_key_here":
        logger.warning("GEMINI_API_KEY missing — running in MOCK / Fallback mode.")
    else:
        logger.info("AI Subsystem ONLINE — Gemini 2.0 Flash + Context Memory Active.")
    yield
    logger.info("Graceful shutdown complete.")

# ── App ───────────────────────────────────────────────────────────────────
app = FastAPI(
    title="AI Virtual Interview Engine",
    description="Production-grade AI interview platform with Gemini 2.0 Flash + Multi-LLM orchestration.",
    version="5.0.0",
    lifespan=lifespan,
)

CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware, allow_origins=CORS_ORIGINS,
    allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)

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

class CandidateCreate(BaseModel):
    name:       str = Field(..., min_length=1)
    email:      str = Field(..., min_length=3)
    phone:      str = Field(default="")
    job_role:   str = Field(..., min_length=1)
    experience: str = Field(default="Fresher (0 years)")
    skills:     str = Field(default="")

class CandidateResponse(BaseModel):
    id: str; name: str; email: str; job_role: str; created_at: str

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

class AssessResponse(BaseModel):
    action:                  str   = Field(default="normal", description="repeat | skip | normal")
    technical_score:         int   = Field(default=0, ge=0, le=100)  # 0-100 scale
    communication_score:     int   = Field(default=60, ge=0, le=100)
    confidence_score:        int   = Field(default=60, ge=0, le=100)
    behavioral_score:        int   = Field(default=60, ge=0, le=100)
    fluency_score:           int   = Field(default=60, ge=0, le=100)
    eq_feedback:             str   = Field(default="")
    repeated_words_detected: list[str] = Field(default_factory=list)
    next_technical_question: str   = Field(default="")
    follow_up_question:      str   = Field(default="")
    next_topic:              str   = Field(default="")
    answer_quality:          str   = Field(default="average")
    final_verdict:           str   = Field(default="")
    model_used:              str   = Field(default="gemini")

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
        "ai_models": ["gemini-2.0-flash", "groq/llama-3.3-70b", "deepseek-chat"],
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
        "True": True, "False": False, "None": None,
    }
    restricted_globals = {"__builtins__": SAFE_BUILTINS}

    try:
        # Prototype sandbox — in production this would be an ephemeral Docker/judge0 container
        exec(req.code, restricted_globals)
        output = redirected_output.getvalue()
        return {"output": output or "Execution complete. No output.", "error": False}
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

@app.post("/api/candidates", response_model=CandidateResponse, tags=["Candidates"])
async def create_candidate(data: CandidateCreate):
    ts  = datetime.now(timezone.utc).isoformat()
    conn = sqlite3.connect(DB_PATH)
    try:
        cur = conn.cursor()
        cur.execute("SELECT id FROM candidates WHERE id LIKE 'SEM%' ORDER BY id DESC LIMIT 1")
        row = cur.fetchone()
        if row:
            try:
                num = int(row[0].replace("SEM", ""))
                cid = f"SEM{num+1:04d}"
            except ValueError:
                cid = "SEM0001"
        else:
            cid = "SEM0001"
            
        conn.execute(
            "INSERT INTO candidates (id,name,email,phone,job_role,experience,skills,resume_text,resume_score,resume_status,parsed_skills,parsed_projects,interview_focus,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (cid, data.name, data.email, data.phone, data.job_role, data.experience, data.skills, '', 0, 'PENDING', '[]', '[]', '[]', ts)
        )
        conn.commit()
    except sqlite3.Error as e:
        raise HTTPException(status_code=500, detail=f"DB error: {e}")
    finally:
        conn.close()
    # Pre-warm memory session
    get_or_create_session(cid, data.job_role, data.experience, data.skills)
    logger.info(f"Candidate registered: {data.name} [{cid}] | Role: {data.job_role}")
    return CandidateResponse(id=cid, name=data.name, email=data.email, job_role=data.job_role, created_at=ts)

@app.get("/candidate/{candidate_id}", tags=["Candidates"])
async def get_candidate(candidate_id: str):
    conn = sqlite3.connect(DB_PATH); conn.row_factory = sqlite3.Row
    row = conn.execute("SELECT * FROM candidates WHERE id=?", (candidate_id,)).fetchone()
    conn.close()
    if not row: raise HTTPException(status_code=404, detail="Candidate not found")
    return dict(row)

@app.delete("/api/candidates/{candidate_id}", tags=["Candidates"])
async def delete_candidate(candidate_id: str):
    conn = sqlite3.connect(DB_PATH)
    conn.execute("DELETE FROM interviews WHERE candidate_id=?", (candidate_id,))
    conn.execute("DELETE FROM candidates WHERE id=?", (candidate_id,))
    conn.commit(); conn.close()
    return {"status": "success"}

# ── Admin Panel ───────────────────────────────────────────────────────────

@app.get("/api/admin/questions", tags=["Admin"])
async def get_admin_questions():
    """Fetch all admin-defined questions."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    rows = conn.execute("SELECT * FROM admin_questions ORDER BY department, role").fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.post("/api/admin/questions", tags=["Admin"])
async def add_admin_question(data: AdminQuestion):
    """Add a new question to the admin question bank."""
    qid = str(uuid.uuid4())
    ts  = datetime.now(timezone.utc).isoformat()
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        "INSERT INTO admin_questions (id, department, role, question, keywords, difficulty, created_at) VALUES (?,?,?,?,?,?,?)",
        (qid, data.department, data.role, data.question, data.keywords, data.difficulty, ts)
    )
    conn.commit(); conn.close()
    return {"status": "success", "id": qid}

@app.post("/api/admin/questions/bulk", tags=["Admin"])
async def add_admin_questions_bulk(file: UploadFile = File(...)):
    """Bulk import questions from a CSV file."""
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")
        
    content = await file.read()
    try:
        text_content = content.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="Invalid file encoding. Please upload a UTF-8 CSV.")
        
    reader = csv.DictReader(io.StringIO(text_content))
    required_cols = {"department", "role", "question", "keywords", "difficulty"}
    
    # Check headers
    if not reader.fieldnames or not required_cols.issubset(set([f.strip().lower() for f in reader.fieldnames])):
        raise HTTPException(status_code=400, detail=f"CSV must contain columns: {', '.join(required_cols)}")
        
    # Map actual column names (case-insensitive) to our required keys
    col_map = {f.strip().lower(): f for f in reader.fieldnames}
        
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("BEGIN TRANSACTION")
    
    imported_count = 0
    new_structure_map = {}
    
    try:
        ts = datetime.now(timezone.utc).isoformat()
        for row in reader:
            qid = str(uuid.uuid4())
            dept_name = row[col_map["department"]].strip() or "General"
            role_name = row[col_map["role"]].strip() or "Any"
            
            # Skip empty rows
            if not row[col_map["question"]].strip():
                continue
                
            cursor.execute(
                "INSERT INTO admin_questions (id, department, role, question, keywords, difficulty, created_at) VALUES (?,?,?,?,?,?,?)",
                (
                    qid,
                    dept_name,
                    role_name,
                    row[col_map["question"]].strip(),
                    row[col_map["keywords"]].strip(),
                    row[col_map["difficulty"]].strip() or "Medium",
                    ts
                )
            )
            imported_count += 1
            
            if dept_name not in new_structure_map:
                new_structure_map[dept_name] = set()
            new_structure_map[dept_name].add(role_name)
            
        # Merge with existing company structure
        curr_struct_row = cursor.execute("SELECT value FROM global_config WHERE key = 'company_structure'").fetchone()
        company_structure = json.loads(curr_struct_row[0]) if curr_struct_row else {}
        
        for dept, roles in new_structure_map.items():
            if dept not in company_structure:
                company_structure[dept] = []
            for role in roles:
                if role not in company_structure[dept]:
                    company_structure[dept].append(role)
                    
        # Save merged structure back to global_config
        struct_json = json.dumps(company_structure)
        cursor.execute(
            "INSERT INTO global_config (id, key, value, updated_at) VALUES (?,?,?,?) "
            "ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at",
            (str(uuid.uuid4()), "company_structure", struct_json, ts)
        )
        
        conn.commit()
    except Exception as e:
        conn.rollback()
        logger.error(f"Bulk import failed: {e}")
        raise HTTPException(status_code=400, detail=f"Failed to import CSV: {e}. Transaction rolled back.")
    finally:
        conn.close()
        
    return {"status": "success", "imported": imported_count}

@app.delete("/api/admin/questions/{q_id}", tags=["Admin"])
async def delete_admin_question(q_id: str):
    """Delete a question from the admin question bank."""
    conn = sqlite3.connect(DB_PATH)
    conn.execute("DELETE FROM admin_questions WHERE id=?", (q_id,))
    conn.commit(); conn.close()
    return {"status": "success"}

@app.post("/api/admin/seed", tags=["Admin"])
async def seed_admin_questions():
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
        
        # Software
        ("Software", "AI/ML Engineer", "How would you optimize a large language model for real-time inference on edge devices?", "Quantization, Pruning, Edge computing, Inference latency, TensorRT, Model distillation", "Hard"),
        ("Software", "AI/ML Engineer", "Explain the vanishing gradient problem in deep neural networks and how to mitigate it.", "Vanishing gradient, Backpropagation, ReLU, Batch normalization, LSTM, ResNet", "Hard"),
        ("Software", "Frontend Developer", "How do you optimize the rendering performance of a React application with a large list of dynamic components?", "React memo, Virtualization, useMemo, useCallback, Code splitting, React Profiler, Debouncing", "Medium"),
        ("Software", "Frontend Developer", "Explain the difference between Server-Side Rendering (SSR) and Static Site Generation (SSG).", "SSR, SSG, Next.js, SEO, Time to Interactive (TTI), Build time, Hydration", "Medium"),
        ("Software", "Backend Developer", "How would you design a rate limiter for a public API that handles millions of requests per minute?", "Rate limiting, Token bucket, Leaky bucket, Redis, Distributed caching, API Gateway", "Hard"),
        ("Software", "Backend Developer", "Explain how you handle database migrations and zero-downtime deployments in a microservices architecture.", "Database migration, Zero-downtime, Blue-green deployment, Canary release, Backward compatibility", "Hard"),
        ("Software", "Product Manager", "How do you prioritize features in a product roadmap when multiple stakeholders have conflicting demands?", "Prioritization framework, RICE, MoSCoW, Stakeholder management, Data-driven decisions, User impact", "Medium"),
        ("Software", "Product Manager", "Describe a time when a product launch failed to meet its metrics. How did you analyze and pivot?", "Post-mortem, Metrics analysis, Root cause, A/B testing, User feedback, Iteration, Pivot", "Medium"),
    ]

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("BEGIN TRANSACTION")
    
    seeded_count = 0
    new_structure_map = {}
    
    try:
        ts = datetime.now(timezone.utc).isoformat()
        for d, r, q, k, diff in seed_data:
            # Check if this exact question already exists
            existing = cursor.execute("SELECT COUNT(*) FROM admin_questions WHERE question = ?", (q,)).fetchone()[0]
            if existing == 0:
                qid = str(uuid.uuid4())
                cursor.execute(
                    "INSERT INTO admin_questions (id, department, role, question, keywords, difficulty, created_at) VALUES (?,?,?,?,?,?,?)",
                    (qid, d, r, q, k, diff, ts)
                )
                seeded_count += 1
                
            if d not in new_structure_map:
                new_structure_map[d] = set()
            new_structure_map[d].add(r)
            
        # Merge with existing company structure
        curr_struct_row = cursor.execute("SELECT value FROM global_config WHERE key = 'company_structure'").fetchone()
        company_structure = json.loads(curr_struct_row[0]) if curr_struct_row else {}
        
        for dept, roles in new_structure_map.items():
            if dept not in company_structure:
                company_structure[dept] = []
            for role in roles:
                if role not in company_structure[dept]:
                    company_structure[dept].append(role)
                    
        # Save merged structure back to global_config
        struct_json = json.dumps(company_structure)
        cursor.execute(
            "INSERT INTO global_config (id, key, value, updated_at) VALUES (?,?,?,?) "
            "ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at",
            (str(uuid.uuid4()), "company_structure", struct_json, ts)
        )
        
        conn.commit()
    except Exception as e:
        conn.rollback()
        logger.error(f"Seed failed: {e}")
        return {"status": "error", "message": str(e)}
    finally:
        conn.close()
    
    if seeded_count > 0:
        return {"status": "success", "message": f"Seeded {seeded_count} new questions."}
    else:
        return {"status": "skipped", "message": "Defaults are already fully seeded."}

# ── Admin Config ──────────────────────────────────────────────────────────

@app.get("/api/admin/config/global/{key}", tags=["Admin"])
async def get_global_config(key: str):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    row = conn.execute("SELECT value FROM global_config WHERE key=?", (key,)).fetchone()
    conn.close()
    return {"value": row["value"] if row else ""}

@app.post("/api/admin/config/global", tags=["Admin"])
async def set_global_config(req: GlobalConfigSet):
    ts = datetime.now(timezone.utc).isoformat()
    conn = sqlite3.connect(DB_PATH)
    # Upsert
    conn.execute(
        "INSERT INTO global_config (id, key, value, updated_at) VALUES (?,?,?,?) "
        "ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at",
        (str(uuid.uuid4()), req.key, req.value, ts)
    )
    conn.commit(); conn.close()
    return {"status": "success"}

@app.get("/api/admin/config/role/{job_role:path}", tags=["Admin"])
async def get_role_config(job_role: str):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    row = conn.execute("SELECT * FROM role_config WHERE job_role=?", (job_role,)).fetchone()
    conn.close()
    if row:
        return dict(row)
    return {
        "job_role": job_role,
        "persona": "Strictly Technical (System Design)",
        "tech_weight": 40, "comm_weight": 20, "eq_weight": 20, "conf_weight": 20
    }

@app.post("/api/admin/config/role", tags=["Admin"])
async def set_role_config(req: RoleConfigSet):
    ts = datetime.now(timezone.utc).isoformat()
    conn = sqlite3.connect(DB_PATH)
    # Upsert
    conn.execute(
        "INSERT INTO role_config (job_role, persona, tech_weight, comm_weight, eq_weight, conf_weight, updated_at) "
        "VALUES (?,?,?,?,?,?,?) "
        "ON CONFLICT(job_role) DO UPDATE SET persona=excluded.persona, "
        "tech_weight=excluded.tech_weight, comm_weight=excluded.comm_weight, "
        "eq_weight=excluded.eq_weight, conf_weight=excluded.conf_weight, updated_at=excluded.updated_at",
        (req.job_role, req.persona, req.tech_weight, req.comm_weight, req.eq_weight, req.conf_weight, ts)
    )
    conn.commit(); conn.close()
    return {"status": "success"}

@app.get("/api/admin/pipeline", tags=["Admin"])
async def get_candidate_pipeline():
    """Returns all candidates joined with their interview scores for the HR Dashboard."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    query = """
    SELECT c.id, c.name, c.email, c.job_role, c.experience, c.created_at,
           i.global_score, i.hiring_decision,
           CASE 
               WHEN i.id IS NOT NULL THEN 'COMPLETED' 
               ELSE 'PENDING' 
           END as status
    FROM candidates c
    LEFT JOIN (
        SELECT candidate_id, global_score, hiring_decision, id,
               ROW_NUMBER() OVER(PARTITION BY candidate_id ORDER BY created_at DESC) as rn
        FROM interviews
    ) i ON c.id = i.candidate_id AND i.rn = 1
    ORDER BY c.created_at DESC
    """
    rows = conn.execute(query).fetchall()
    conn.close()
    return [dict(r) for r in rows]

# ── Resume Upload & AI Screening ──────────────────────────────────────────────────

@app.post("/api/candidates/{candidate_id}/upload-resume", tags=["Resume Intelligence"])
async def upload_resume(
    candidate_id: str,
    file: UploadFile = File(...),
):
    """Upload a resume PDF/TXT, parse it with Gemini, and score it against the job role."""
    conn = sqlite3.connect(DB_PATH); conn.row_factory = sqlite3.Row
    candidate = conn.execute("SELECT * FROM candidates WHERE id=?", (candidate_id,)).fetchone()
    conn.close()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    c = dict(candidate)

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
        # Try PyPDF2 if available, else decode raw bytes
        try:
            import PyPDF2
            reader = PyPDF2.PdfReader(io.BytesIO(raw_bytes))
            resume_text = " ".join(
                page.extract_text() or "" for page in reader.pages
            )
        except Exception as e:
            logger.error(f"PyPDF2 extraction failed: {e}")
            resume_text = raw_bytes.decode("utf-8", errors="ignore")
    else:
        resume_text = raw_bytes.decode("utf-8", errors="ignore")

    # Fetch specific role persona from DB
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    role_cfg = conn.execute("SELECT persona FROM role_config WHERE job_role=?", (c["job_role"],)).fetchone()
    persona = role_cfg["persona"] if role_cfg else "General Technical Applicant"

    # Fetch specific role keywords from DB (aggregate from admin_questions)
    questions = conn.execute("SELECT keywords FROM admin_questions WHERE role=?", (c["job_role"],)).fetchall()
    role_keywords = ", ".join(set([q["keywords"] for q in questions if q["keywords"]]))
    conn.close()

    # AI Parse + Score
    parsed = await parse_and_score_resume(
        resume_text=resume_text,
        job_role=c["job_role"],
        required_skills=c.get("skills", ""),
        role_keywords=role_keywords,
        persona=persona,
    )

    resume_score   = parsed.get("resume_score", 50)
    resume_status  = score_to_status(resume_score)
    parsed_skills  = json.dumps(parsed.get("extracted_skills", []))
    parsed_projects = json.dumps(parsed.get("extracted_projects", []))
    focus_areas    = json.dumps(parsed.get("interview_focus_areas", []))

    # Persist to DB
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        "UPDATE candidates SET resume_text=?, resume_score=?, resume_status=?, parsed_skills=?, parsed_projects=?, interview_focus=? WHERE id=?",
        (resume_text[:5000], resume_score, resume_status, parsed_skills, parsed_projects, focus_areas, candidate_id)
    )
    conn.commit(); conn.close()

    # Pre-warm interview session with resume context
    session = get_or_create_session(candidate_id, c["job_role"], c.get("experience", ""), c.get("skills", ""))
    session.resume_context = parsed

    logger.info(f"Resume processed: {candidate_id} | Score: {resume_score} | Status: {resume_status}")
    return {
        "resume_score":           resume_score,
        "status":                 resume_status,
        "shortlist_recommendation": parsed.get("shortlist_recommendation", "REVIEW"),
        "shortlist_reason":       parsed.get("shortlist_reason", ""),
        "extracted_skills":       parsed.get("extracted_skills", []),
        "interview_focus_areas":  parsed.get("interview_focus_areas", []),
        "resume_quality":         parsed.get("resume_quality", "Average"),
        "strengths":              parsed.get("strengths", []),
        "red_flags":              parsed.get("red_flags", []),
    }

# ── Candidate Leaderboard ───────────────────────────────────────────────────────

@app.get("/api/leaderboard", tags=["Recruiter"]) 
async def get_leaderboard():
    """Return all candidates ranked by global score. The recruiter's shortlist view."""
    conn = sqlite3.connect(DB_PATH); conn.row_factory = sqlite3.Row
    rows = conn.execute("""
        SELECT c.id, c.name, c.email, c.job_role, c.experience,
               c.resume_score, c.resume_status,
               COALESCE(MAX(i.technical_score),0) as technical_score,
               COALESCE(MAX(i.communication),0) as communication_score,
               COALESCE(MAX(i.confidence),0) as confidence_score,
               COALESCE(MAX(i.behavioral_score),0) as behavioral_score,
               COALESCE(MAX(i.fluency_score),0) as fluency_score,
               COALESCE(MAX(i.eq_score),0) as eq_score,
               COALESCE(MAX(i.global_score),0) as global_score,
               COALESCE(MAX(i.hiring_decision),'PENDING') as hiring_decision,
               COALESCE(MAX(i.status),'pending') as interview_status,
               COALESCE(MAX(i.proctoring_warnings),0) as proctoring_warnings,
               c.created_at
        FROM candidates c
        LEFT JOIN interviews i ON c.id = i.candidate_id AND i.status='completed'
        GROUP BY c.id
        ORDER BY c.created_at DESC
    """).fetchall()
    conn.close()

    candidates = []
    for r in rows:
        d = dict(r)
        if d["global_score"] == 0 and d["technical_score"] > 0:
            d["global_score"] = calculate_global_score(
                resume_score=d["resume_score"],
                technical_score=d["technical_score"],
                communication_score=d["communication_score"],
                confidence_score=d["confidence_score"],
                behavioral_score=d["behavioral_score"],
                fluency_score=d["fluency_score"],
                eq_score=d["eq_score"],
                job_role=d["job_role"],
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
                # Memory protection: clear buffer if it exceeds ~15MB (approx 5 mins of audio)
                if len(audio_buffer) > 15 * 1024 * 1024:
                    audio_buffer.clear()
                    logger.warning("WebSocket STT buffer overflow. Cleared to prevent OOM.")
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
        behavioral_score=        int(result.get("behavioral_score", 60)),
        fluency_score=           int(result.get("fluency_score", 60)),
        eq_feedback=             feedback_text,
        repeated_words_detected= filler_words,
        next_technical_question= result.get("next_technical_question", ""),
        follow_up_question=      result.get("follow_up_question", ""),
        next_topic=              result.get("next_topic", ""),
        answer_quality=          result.get("answer_quality", "average"),
        final_verdict=           result.get("final_verdict", ""),
        model_used=              "gemini-2.0-flash",
    )

# ── Audio Transcription (Groq Whisper) ───────────────────────────────────

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
async def get_ai_report(candidate_id: str):
    """Generate Gemini-powered final evaluation report from memory."""
    conn = sqlite3.connect(DB_PATH); conn.row_factory = sqlite3.Row
    row = conn.execute("SELECT * FROM candidates WHERE id=?", (candidate_id,)).fetchone()
    conn.close()
    if not row: raise HTTPException(status_code=404, detail="Candidate not found")
    c = dict(row)
    report = await generate_final_report(
        candidate_id=candidate_id,
        candidate_name=c["name"],
        job_role=c["job_role"],
        experience=c.get("experience", ""),
    )
    return {"candidate": c, "ai_report": report}

# ── Data: Save Interview ──────────────────────────────────────────────────

@app.post("/api/interviews/save", tags=["Data"])
async def save_interview(req: SaveInterviewRequest, bg: BackgroundTasks):
    iid = str(uuid.uuid4()); ts = datetime.now(timezone.utc).isoformat()

    # Fetch actual candidate data so we can use the real resume_score and job_role
    candidate_resume_score = 0
    candidate_job_role = "default"
    try:
        conn_c = sqlite3.connect(DB_PATH)
        conn_c.row_factory = sqlite3.Row
        cand_row = conn_c.execute("SELECT resume_score, job_role FROM candidates WHERE id=?", (req.candidate_id,)).fetchone()
        conn_c.close()
        if cand_row:
            candidate_resume_score = cand_row["resume_score"] or 0
            candidate_job_role = cand_row["job_role"] or "default"
    except Exception as e:
        logger.warning(f"Could not fetch candidate data for scoring: {e}")

    # Compute global score and hiring decision using real resume score + role weights
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

    conn = sqlite3.connect(DB_PATH)
    try:
        conn.execute(
            """
            INSERT INTO interviews
            (id, candidate_id, technical_score, eq_score, confidence, communication,
             behavioral_score, fluency_score, facial_score, global_score, hiring_decision,
             summary, strengths, weaknesses, overall_rating, hiring_recommendation,
             readiness_score, status, proctoring_warnings, proctoring_logs, created_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """,
            (iid, req.candidate_id, req.technical_score, req.eq_score,
             req.confidence, req.communication, req.behavioral_score, req.fluency_score,
             req.facial_score, round(global_score, 1), hiring["decision"],
             req.summary,
             json.dumps(req.strengths), json.dumps(req.weaknesses),
             req.overall_rating, req.hiring_recommendation, req.readiness_score,
             "completed", req.proctoring_warnings, json.dumps(req.proctoring_logs), ts)
        )
        conn.commit()
        logger.info(f"Interview saved: {iid} | GlobalScore={global_score} | Decision={hiring['decision']} | Warnings={req.proctoring_warnings}")
    except Exception as e:
        logger.error(f"DB persist failed: {e}")
    finally:
        conn.close()
    clear_session(req.candidate_id)
    return {
        "interview_id": iid,
        "status": "saved",
        "created_at": ts,
        "global_score": round(global_score, 1),
        "hiring_decision": hiring["decision"],
        "hiring_label": hiring["label"],
    }

# ── Data: Report ──────────────────────────────────────────────────────────

@app.get("/api/reports/{candidate_id}", tags=["Data"])
async def get_candidate_report(candidate_id: str):
    conn = sqlite3.connect(DB_PATH); conn.row_factory = sqlite3.Row
    candidate = conn.execute("SELECT * FROM candidates WHERE id=?", (candidate_id,)).fetchone()
    interview  = conn.execute(
        "SELECT * FROM interviews WHERE candidate_id=? AND status='completed' ORDER BY created_at DESC LIMIT 1",
        (candidate_id,),
    ).fetchone()
    conn.close()
    if not candidate: raise HTTPException(status_code=404, detail="Candidate not found")

    if interview:
        d = dict(interview)
        d["strengths"]  = json.loads(d.get("strengths") or "[]")
        d["weaknesses"] = json.loads(d.get("weaknesses") or "[]")
        d["proctoring_logs"] = json.loads(d.get("proctoring_logs") or "[]")
        iv = d
    else:
        iv = {
            "technical_score": 0, "eq_score": 0, "confidence": 0, "communication": 0,
            "summary": "Interview pending.", "strengths": [], "weaknesses": [],
            "overall_rating": "N/A", "hiring_recommendation": "N/A", "readiness_score": 0,
            "proctoring_warnings": 0, "proctoring_logs": []
        }
    return {"candidate": dict(candidate), "interview": iv}

# ── Data: Dashboard ───────────────────────────────────────────────────────

@app.get("/api/dashboard", response_model=DashboardData, tags=["Data"])
async def get_dashboard_data():
    conn = sqlite3.connect(DB_PATH); conn.row_factory = sqlite3.Row
    total    = conn.execute("SELECT COUNT(*) FROM candidates").fetchone()[0] or 0
    complete = conn.execute("SELECT COUNT(*) FROM interviews WHERE status='completed'").fetchone()[0] or 0
    avg_tech = conn.execute("SELECT AVG(technical_score) FROM interviews WHERE status='completed'").fetchone()[0] or 0.0
    avg_conf = conn.execute("SELECT AVG(confidence) FROM interviews WHERE status='completed'").fetchone()[0] or 0.0
    recent   = conn.execute("SELECT name, job_role, email, created_at FROM candidates ORDER BY created_at DESC LIMIT 5").fetchall()
    conn.close()
    return DashboardData(
        total_candidates=total, interviews_completed=complete,
        avg_technical_score=round(float(avg_tech), 1),
        avg_confidence=round(float(avg_conf), 1),
        recent_candidates=[dict(r) for r in recent],
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
                await websocket.send_json({"type": "assessing", "message": "Gemini is evaluating your answer..."})
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
                        "model_used":          result.get("model_used", "gemini"),
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("Main:app", host="0.0.0.0", port=8000, reload=True)