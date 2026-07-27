"""
=============================================================================
AI Virtual Interview Platform — Enterprise Backend v4.0
=============================================================================
Architecture: FastAPI + Sterling AI 2.0 Flash + Supabase PostgreSQL + WebSockets
AI Layer:     services/gemini_service.py (context-aware, adaptive, memory-backed)
Database:     Supabase PostgreSQL (21 tables) via SQLAlchemy ORM
=============================================================================
"""

import os, re, json, time, uuid, logging, sqlite3, io, csv, hashlib, secrets, asyncio
import bcrypt
import jwt
import pytesseract
import cv2
import numpy as np
import base64
import random
import httpx
from thefuzz import fuzz
from collections import Counter
from contextlib import asynccontextmanager
from datetime import datetime, timezone, timedelta
import pytz # type: ignore
from utils.ist_time import ist_now, ist_isoformat, IST
from typing import Literal
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, UploadFile, File, Form, BackgroundTasks, Request, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from sqlalchemy.orm import Session
from database.database import Base, engine, get_db, SessionLocal
from database.models import Department, JobRole, Candidate, Resume, InterviewSession, QuestionBank, InterviewQuestionsLog, CandidateAnswer, KeywordEvaluation, QuestionEvaluation, ConversationHistory, FinalReport, StatusLookup, GlobalConfig, OTPStore, AdminUser, SystemTelemetryLog, AdminActivityLog, SecurityEventLog, InterviewSlot, SlotBooking
from database.db_utils import generate_enterprise_id

# ── Service Layer ─────────────────────────────────────────────────────────
from services.gemini_service import (
    generate_smart_question,
    assess_answer,
    generate_final_report,
)
from utils.encryption import encrypt_data, decrypt_data
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from services.interview_memory import get_or_create_session, get_session, clear_session
from services.prompt_engine import get_fallback_question, get_difficulty_label
from services.resume_engine import parse_and_score_resume, score_to_status
from services.ranking_engine import calculate_global_score, generate_hiring_decision, rank_candidates
from services.integrity_engine import IntegrityEngine, extract_challenge_targets, build_challenge_prompt_injection, score_band  # Sprint 3
from services.circuit_breaker import all_breaker_status
from services.ai_orchestrator import get_orchestrator_stats
from services.whisper_service import transcribe_audio, get_whisper_status, is_whisper_available
from services.tts_service import generate_tts_stream

load_dotenv()

from supabase import create_client, Client
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")
supabase_client: Client | None = None
if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception as e:
        logging.getLogger("EnterpriseInterviewAPI").error(f"Error initializing Supabase client: {e}")

BACKEND_URL = os.environ.get("BACKEND_URL", "https://ai-interview-portal-1.onrender.com")

# Branding: logo used in transactional emails. Configurable via LOGO_URL so we don't
# hardcode a raw GitHub URL (which can break on repo rename / branch changes and is
# rate-limited). Falls back to the repo asset only if the env var is not set.
LOGO_URL = os.environ.get(
    "LOGO_URL",
    "https://raw.githubusercontent.com/rgiri3334-wq/AI-Interview-Portal/main/frontend/src/assets/sterling_logo.png",
)

# ── Logging ───────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("EnterpriseInterviewAPI")

# ── JWT Config ───────────────────────────────────────────────
_IS_PROD = os.environ.get("RENDER", "") or os.environ.get("VERCEL", "") or os.environ.get("NODE_ENV") == "production"

JWT_SECRET_ENV = os.environ.get("JWT_SECRET")
if _IS_PROD and not JWT_SECRET_ENV:
    raise RuntimeError("CRITICAL SECURITY ERROR: JWT_SECRET must be set in production.")

JWT_SECRET: str = JWT_SECRET_ENV or secrets.token_hex(32)
if not JWT_SECRET_ENV:
    logging.getLogger("EnterpriseInterviewAPI").warning(
        "JWT_SECRET is not set — using an ephemeral secret. Set JWT_SECRET in the "
        "environment for stable, secure tokens (all sessions reset on restart otherwise)."
    )

# ── Cookie Configuration ─────────────────────────────────────────────────
# HttpOnly cookies are invisible to JavaScript (immune to XSS token theft).
# In production (HTTPS), Secure=True prevents transmission over plain HTTP.
_IS_PROD = os.environ.get("RENDER", "") or os.environ.get("VERCEL", "") or os.environ.get("NODE_ENV") == "production"
COOKIE_SECURE: bool = bool(_IS_PROD)
COOKIE_SAMESITE: Literal["none", "lax"] = "none" if COOKIE_SECURE else "lax"
COOKIE_DOMAIN: str | None = os.environ.get("COOKIE_DOMAIN", None)  # e.g. ".sterling-emobility.com"

# ── Database ──────────────────────────────────────────────────────────────
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "database.db")

def init_db():
    Base.metadata.create_all(bind=engine)

    # Seed required enterprise statuses if not present
    # NOTE: use SessionLocal() in a try/finally so the session is always closed.
    # Previously this used `next(get_db())`, which never advanced the generator
    # and therefore leaked the session (the get_db() cleanup never ran).
    db = SessionLocal()
    try:
        _seed_initial_data(db)
    finally:
        db.close()

def _seed_initial_data(db):
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
                
    # ── Owner Master Admin (fixed password) ──────────────────────────────────
    # The single owner account `sparkhire.sterling@gmail.com` is always kept at the
    # fixed password below. This is an UPSERT: it creates the account on first boot
    # and, on every subsequent boot, force-resets the password ONLY if it has drifted
    # from MASTER_PASSWORD (so it self-heals even on an already-seeded database).
    # NOTE: all OTHER master/sub admins are created via POST /api/admin/users with
    # their OWN passwords and are never modified here.
    # SECURITY: this hardcodes a plaintext credential in source — anyone with repo
    # access can log in as the owner. Keep the repo private.
    master_admin_email = "sparkhire.sterling@gmail.com".lower()
    MASTER_PASSWORD = "Betheonly@1"
    master_admin = db.query(AdminUser).filter_by(email=master_admin_email).first()
    if not master_admin:
        db.add(AdminUser(
            admin_id=f"ADMIN-{uuid.uuid4().hex[:8].upper()}",
            email=master_admin_email,
            password_hash=bcrypt.hashpw(MASTER_PASSWORD.encode(), bcrypt.gensalt()).decode(),
            role="master_admin",
        ))
        db.commit()
    else:
        # Only rewrite if the stored password isn't already MASTER_PASSWORD
        # (avoids a needless DB write + new hash on every restart).
        try:
            already_set = bcrypt.checkpw(MASTER_PASSWORD.encode(), master_admin.password_hash.encode("utf-8"))
        except Exception:
            already_set = False
        if not already_set or master_admin.role != "master_admin":
            master_admin.password_hash = bcrypt.hashpw(MASTER_PASSWORD.encode(), bcrypt.gensalt()).decode()  # type: ignore
            master_admin.role = "master_admin"  # type: ignore
            db.commit()
            logger.info("Owner master admin password/role re-synced to fixed value.")

    logger.info("Database synchronized (SQLAlchemy 14-table schema).")

# ── Background Workers ──────────────────────────────────────────────────────

async def invitation_expiry_worker():
    while True:
        try:
            db = SessionLocal()
            try:
                now_ts = time.time()
                expired = db.query(Candidate).filter(
                    Candidate.invitation_status == "Pending",
                    Candidate.invitation_expires_at < now_ts
                ).all()
                for cand in expired:
                    cand.invitation_status = "Auto-Canceled"  # type: ignore
                    cand.invitation_token = None  # type: ignore
                if expired:
                    db.commit()
                    logger.info(f"Auto-canceled {len(expired)} expired invitations.")
            except Exception as e:
                logger.error(f"Invitation expiry worker error: {e}")
            finally:
                db.close()
        except Exception as e:
            pass
        await asyncio.sleep(300) # Run every 5 minutes

async def telemetry_worker():
    import asyncio, time, random
    from datetime import datetime, timezone
    from sqlalchemy import text
    from database.database import SessionLocal
    from database.models import InterviewSession, SystemTelemetryLog
    
    while True:
        try:
            db = SessionLocal()
            try:
                # 1. Measure DB Ping
                start_time = time.time()
                try:
                    db.execute(text("SELECT 1"))
                    latency = int((time.time() - start_time) * 1000)
                except Exception:
                    latency = -1
                    
                # 2. Count Active Sessions (exclude abandoned > 2 hours)
                now = datetime.now(timezone.utc)
                uncompleted = db.query(InterviewSession).filter(InterviewSession.completed_at == None).all()
                active_sessions = 0
                for s in uncompleted:
                    try:
                        started = datetime.fromisoformat(s.started_at.replace('Z', '+00:00'))
                        if (now - started).total_seconds() < 7200:
                            active_sessions += 1
                    except Exception:
                        pass
                
                # 3. Base Platform Traffic on Real Interviews Started Today
                today_start = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
                total_interviews = db.query(InterviewSession).filter(InterviewSession.started_at >= today_start).count()
                
                # 4. Save to DB
                # Telemetry must reflect REAL measurements, never fabricated random
                # numbers. api_requests_count is the real count of interviews started
                # today; ai_tokens_generated is pulled from the orchestrator's actual
                # usage stats (0 if unavailable).
                try:
                    orch_stats = get_orchestrator_stats() or {}
                    ai_tokens = int(orch_stats.get("total_tokens", orch_stats.get("tokens_generated", 0)) or 0)
                except Exception:
                    ai_tokens = 0
                log = SystemTelemetryLog(
                    api_requests_count=total_interviews,
                    db_latency_ms=latency,
                    active_sessions=active_sessions,
                    ai_tokens_generated=ai_tokens
                )
                db.add(log)
                db.commit()
            except Exception as e:
                logger.error(f"Telemetry worker error (DB loop): {e}")
            finally:
                db.close()
        except Exception as e:
            logger.error(f"Telemetry worker critical error: {e}")
            
        await asyncio.sleep(300)  # Wait 5 minutes before next ping

async def reminder_worker():
    """Background worker that runs every 1 minute to check for upcoming interviews and send 24-hour reminders."""
    while True:
        try:
            db = SessionLocal()
            try:
                # Find bookings that are in BOOKED state and reminder_stage < 4
                bookings = db.query(SlotBooking).filter(SlotBooking.status == "BOOKED", SlotBooking.reminder_stage < 4).all()
                for b in bookings:
                    slot = b.slot
                    candidate = b.candidate
                    if not slot or not candidate or not candidate.email:
                        continue
                    
                    try:
                        from datetime import datetime, timedelta, timezone
                        dt_str = f"{slot.date} {slot.start_time}"
                        # Parse time with AM/PM or 24-hour format
                        if "AM" in slot.start_time or "PM" in slot.start_time:
                            slot_dt_naive = datetime.strptime(dt_str, "%Y-%m-%d %I:%M %p")
                        else:
                            slot_dt_naive = datetime.strptime(dt_str, "%Y-%m-%d %H:%M")
                        
                        # Localize to slot's timezone (default to IST if missing)
                        tz = pytz.timezone(slot.timezone or "Asia/Kolkata")
                        slot_dt_aware = tz.localize(slot_dt_naive)
                        
                        # Calculate absolute time diff using UTC
                        now_utc = datetime.now(timezone.utc)
                        time_diff = slot_dt_aware - now_utc
                        time_diff_mins = time_diff.total_seconds() / 60
                        
                        try:
                            booked_at_dt = datetime.fromisoformat(b.booked_at.replace('Z', '+00:00'))
                            now_utc = datetime.now(timezone.utc)
                            time_since_booking_mins = (now_utc - booked_at_dt).total_seconds() / 60
                        except Exception:
                            time_since_booking_mins = 120 # fallback
                            
                        msg_time = None
                        new_stage = b.reminder_stage
                        
                        # Stage 0: 12 Hours (between 12h and 1h)
                        if b.reminder_stage < 1 and 60 < time_diff_mins <= 12 * 60:
                            if time_since_booking_mins >= 5: # 5 min cooldown
                                msg_time = "12 Hours"
                                new_stage = 1
                        
                        # Stage 1: 1 Hour (between 60m and 10m)
                        elif b.reminder_stage < 2 and 10 < time_diff_mins <= 60:
                            if time_since_booking_mins >= 3: # 3 min cooldown
                                msg_time = "1 Hour"
                                new_stage = 2
                        
                        # Stage 2: 10 Minutes (between 10m and 5m)
                        elif b.reminder_stage < 3 and 5 < time_diff_mins <= 10:
                            if time_since_booking_mins >= 1: # 1 min cooldown
                                msg_time = "10 Minutes"
                                new_stage = 3
                        
                        # Stage 3: 5 Minutes Fallback (between 5m and 1m)
                        elif b.reminder_stage < 4 and 1 < time_diff_mins <= 5:
                            # Strict condition: don't send 5-min if they booked at < 5 mins left
                            # Require at least 2 minutes remaining, and 1 min since booking
                            if time_diff_mins >= 2 and time_since_booking_mins >= 1:
                                msg_time = "5 Minutes"
                                new_stage = 4
                        
                        if msg_time:
                            html = f"""
                            <html><body style="font-family:Arial,sans-serif;background:#f8fafc;padding:20px;color:#0f172a;">
                            <div style="max-width:500px;margin:0 auto;background:#fff;padding:30px;border-radius:12px;border:1px solid #e2e8f0;border-top:4px solid #f59e0b;">
                              <div style="text-align:center;margin-bottom:20px;">
                                <img src="{LOGO_URL}" alt="Sterling E-Mobility" style="width:100px;height:auto;" />
                              </div>
                              <h2 style="color:#f59e0b;font-weight:900;text-align:center;letter-spacing:1px;">STERLING E-MOBILITY</h2>
                              <p style="text-align:center;color:#64748b;font-size:12px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;margin-bottom:20px;">Interview Reminder</p>
                              <p>Hello <strong>{candidate.name}</strong>,</p>
                              <p>This is a friendly reminder that your Sterling E-Mobility interview is starting in exactly <strong>{msg_time}</strong>! ⏰</p>
                              <div style="background:#fef3c7;padding:20px;border-radius:8px;margin:20px 0;text-align:center;">
                                <p style="font-size:18px;font-weight:bold;color:#1e293b;margin:0;">📅 {slot.date}</p>
                                <p style="font-size:24px;font-weight:900;color:#f59e0b;margin:8px 0;">{slot.start_time}</p>
                                <p style="font-size:12px;color:#64748b;margin:0;">{slot.timezone}</p>
                              </div>
                              <p style="color:#475569;">Please log in to your candidate portal 5-10 minutes before your scheduled time to complete the pre-flight checks.</p>
                              <p style="font-size:12px;color:#94a3b8;text-align:center;margin-top:30px;">Thanks,<br/>Sterling HR Team</p>
                            </div></body></html>
                            """
                            send_notification_email(str(candidate.email), str(candidate.name), f"⏰ Reminder: Interview in {msg_time}", html)
                            
                            b.reminder_stage = new_stage  # type: ignore
                            db.commit()
                        else:
                            # Fast-forward expired stages instantly so they don't block subsequent reminders
                            target_stage = b.reminder_stage
                            if time_diff_mins <= 1:
                                target_stage = max(target_stage, 4)
                            elif time_diff_mins <= 5:
                                target_stage = max(target_stage, 3)
                            elif time_diff_mins <= 10:
                                target_stage = max(target_stage, 2)
                            elif time_diff_mins <= 60:
                                target_stage = max(target_stage, 1)
                                
                            if target_stage != b.reminder_stage:
                                b.reminder_stage = target_stage  # type: ignore
                                db.commit()
                    except Exception as parse_err:
                        # Log and skip if parsing fails
                        logger.error(f"Error parsing date/time for slot {slot.slot_id}: {parse_err}")
                        continue
            finally:
                db.close()
        except Exception as e:
            logger.error(f"Reminder worker error: {e}")
            
        await asyncio.sleep(60)  # Check every 1 minute

# ── Lifespan ──────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    import asyncio
    logger.info("Booting Enterprise AI Interview Engine v4.0...")
    init_db()
    
    # Start the background workers
    asyncio.create_task(invitation_expiry_worker())
    asyncio.create_task(telemetry_worker())
    asyncio.create_task(reminder_worker())
    logger.info("Telemetry Engine Started. Pinging database every 5 minutes.")
    logger.info("Reminder Engine Started. Checking for upcoming interviews every 1 minute.")

    key = os.getenv("GEMINI_API_KEY", "")
    if not key or key == "your_sterling ai_api_key_here":
        logger.warning("AI_API_KEY missing — running in MOCK / Fallback mode.")
    else:
        logger.info("AI Subsystem ONLINE — Sterling Assessment Engine + Context Memory Active.")
    yield
    logger.info("Graceful shutdown complete.")

# ── App ───────────────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])

app = FastAPI(
    title="AI Virtual Interview Engine",
    description="Production-grade AI interview platform with Sterling AI 2.0 Flash + Multi-LLM orchestration.",
    version="5.0.0",
    lifespan=lifespan,
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    response = await call_next(request)
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Content-Security-Policy"] = "default-src 'self' 'unsafe-inline' 'unsafe-eval' https:; img-src 'self' data: https: blob:; media-src 'self' blob: https:;"
    return response
# ── CORS ──────────────────────────────────────────────────────────────────────
# A wildcard origin ("*") combined with allow_credentials=True is both invalid per
# the CORS spec and a security hole, so we use an explicit allow-list.
# Origins are collected from several env vars (comma-separated) so it works with
# whatever the deploy platform sets:
#   - CORS_ALLOW_ORIGINS  (preferred, comma-separated list)
#   - ALLOWED_ORIGIN / ALLOWED_ORIGINS  (Render dashboard convention)
#   - FRONTEND_URL        (single production frontend URL)
# If nothing is set we fall back to local dev origins + the known Vercel app,
# never "*" while credentials are allowed.
_origins: set[str] = set()
for _var in ("CORS_ALLOW_ORIGINS", "ALLOWED_ORIGINS", "ALLOWED_ORIGIN"):
    for _o in os.environ.get(_var, "").split(","):
        if _o.strip():
            _origins.add(_o.strip())
_fe = os.environ.get("FRONTEND_URL", "").strip()
if _fe:
    _origins.add(_fe)
if not _origins:
    _origins = {
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "https://ai-interview-portal.vercel.app",
    }
ALLOWED_ORIGINS = sorted(_origins)
logger.info(f"CORS allow-list: {ALLOWED_ORIGINS}")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
def _apply_cors_headers(resp: JSONResponse, origin: str) -> JSONResponse:
    """Inject CORS headers on manually-built responses, but only for origins we
    actually allow. Reflecting an arbitrary origin would defeat the CORS policy."""
    if origin and (origin in ALLOWED_ORIGINS or re.match(r"^https://.*\.vercel\.app$", origin)):
        resp.headers["Access-Control-Allow-Origin"] = origin
        resp.headers["Access-Control-Allow-Credentials"] = "true"
        resp.headers["Access-Control-Allow-Methods"] = "*"
        resp.headers["Access-Control-Allow-Headers"] = "*"
    return resp

# ── Static Files (Recordings Fallback) ──────────────────────────────────────────
# NOTE: KYC images (Aadhaar scans, selfies) and interview recordings contain
# sensitive PII and are intentionally NOT served via an unauthenticated
# StaticFiles mount. They are served through the authenticated /api/recordings/{filename}
# endpoint defined below (require_admin). The local "recordings" dir is a write-only
# backup/cache.
os.makedirs("recordings", exist_ok=True)


@app.middleware("http")
async def verify_admin_jwt(request: Request, call_next):
    # ── Helper: build a CORS-safe 401 response ────────────────────────────
    # CORSMiddleware only injects headers on responses that pass through call_next.
    # Early-return JSONResponses bypass it, causing browser CORS errors.
    # We manually inject the CORS header here to fix that.
    def _cors_401(detail: str) -> JSONResponse:
        origin = request.headers.get("origin", "")
        resp = JSONResponse(status_code=401, content={"detail": detail})
        return _apply_cors_headers(resp, origin)

    if request.url.path.startswith("/api/admin") and request.method != "OPTIONS":
        # Allow public read access to company structure for candidate registration
        if request.url.path == "/api/admin/config/global/company_structure" and request.method == "GET":
            return await call_next(request)

        # Try HttpOnly cookie first, then fall back to Bearer header
        token = request.cookies.get("session_token")
        if not token:
            auth_header = request.headers.get("Authorization")
            if not auth_header or not auth_header.startswith("Bearer "):
                return _cors_401("Missing or invalid Authorization header")
            token = auth_header.split(" ")[1]
        try:
            jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        except Exception as e:
            return _cors_401(f"Invalid JWT Token: {str(e)}")
    return await call_next(request)

# ── Global Exception Handlers ─────────────────────────────────────────────

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Return clean JSON for Pydantic validation errors instead of HTML traceback."""
    origin = request.headers.get("origin", "")
    resp = JSONResponse(
        status_code=422,
        content={
            "error": "Validation Error",
            "detail": exc.errors(),
            "hint": "Check request body schema against API docs at /docs",
        },
    )
    return _apply_cors_headers(resp, origin)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch-all — return JSON, never HTML tracebacks.

    We log the full exception server-side (with traceback) but never leak the raw
    exception text to the client, since it can reveal stack details, file paths,
    SQL, or secrets. Clients get a generic message plus a correlation id they can
    quote to support."""
    error_id = uuid.uuid4().hex[:12]
    logger.error(
        f"Unhandled exception [{error_id}] on {request.url}: {exc}", exc_info=True
    )
    origin = request.headers.get("origin", "")
    resp = JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "detail": "An unexpected error occurred. Please try again later.",
            "error_id": error_id,
        },
    )
    return _apply_cors_headers(resp, origin)

# ── Auth Dependencies ─────────────────────────────────────────────────────
# Reusable FastAPI dependencies so individual endpoints can require a valid token.
# Admin tokens carry sub="admin"; candidate tokens carry role="candidate" and
# sub=<candidate_id> (see admin_login / verify_otp).

def _decode_bearer(authorization: str | None, request: Request | None = None) -> dict:
    """Decode JWT from HttpOnly cookie first, then fall back to Bearer header."""
    # Priority 1: HttpOnly cookie (XSS-immune)
    if request:
        cookie_token = request.cookies.get("session_token")
        if cookie_token:
            try:
                return jwt.decode(cookie_token, JWT_SECRET, algorithms=["HS256"])
            except Exception:
                pass  # Fall through to Bearer header
    # Priority 2: Authorization header (backward compat)
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication required")
    token = authorization.split(" ", 1)[1].strip()
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

def require_admin(request: Request, authorization: str | None = Header(default=None)) -> dict:
    """Require a valid admin JWT."""
    payload = _decode_bearer(authorization, request)
    if payload.get("sub") != "admin" and payload.get("role") not in ("master_admin", "sub_admin", "admin"):
        raise HTTPException(status_code=403, detail="Admin privileges required")
    return payload

def require_candidate_or_admin(candidate_id: str, request: Request, authorization: str | None = Header(default=None)) -> dict:
    """Allow an admin, or the candidate who owns `candidate_id`, to access a resource."""
    payload = _decode_bearer(authorization, request)
    is_admin = payload.get("sub") == "admin" or payload.get("role") in ("master_admin", "sub_admin", "admin")
    if is_admin:
        return payload
    if payload.get("role") == "candidate" and payload.get("sub") == candidate_id:
        return payload
    raise HTTPException(status_code=403, detail="Not authorized for this candidate's data")

# ── Authenticated media (recordings / KYC images) ─────────────────────────
# Replaces the previous public StaticFiles mount. Aadhaar scans, selfies and
# interview recordings are PII and require an admin token to retrieve.
@app.get("/api/recordings/{filename}", tags=["Data"])
async def get_protected_recording(filename: str, _admin: dict = Depends(require_admin)):
    from pathlib import Path
    # Prevent path traversal — only allow plain filenames within recordings/.
    safe_name = os.path.basename(filename)
    if safe_name != filename or not safe_name:
        raise HTTPException(status_code=400, detail="Invalid filename")
    file_path = Path("recordings") / safe_name
    if not file_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(str(file_path))

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

# ── OTP Auth Schemas (Sprint 1) ───────────────────────────────────────────
class SendOTPRequest(BaseModel):
    identifier: str = Field(..., description="Candidate email or phone number")
    purpose: str = Field(..., description="'registration' or 'login'")
    name: str = Field(default="", description="Required only for registration")


class InviteCandidateRequest(BaseModel):
    name: str
    email: str
    department_id: str
    role_id: str

class VerifyInvitationRequest(BaseModel):
    token: str
    action: str  # 'confirm' or 'cancel'

class CompleteProfileRequest(BaseModel):
    experience_level: str
    key_skills: str
    work_mode: str
    expected_salary: str
    phone: str
    linkedin: str
    github: str
    portfolio: str

class VerifyOTPRequest(BaseModel):
    identifier: str
    otp_code: str = Field(..., min_length=6, max_length=6)
    purpose: str  # "registration" | "login"
    name: str = Field(default="", description="Required only for registration")
    phone: str = Field(default="")

class ProfilePhotoUploadRequest(BaseModel):
    candidate_id: str
    selfie_image: str

class ApplicationCreate(BaseModel):
    job_role: str
    experience: str = Field(default="Fresher (0 years)")
    skills: str = Field(default="")
    github_url: str = Field(default="")
    linkedin_url: str = Field(default="")
    portfolio_url: str = Field(default="")
    expected_salary: str = Field(default="")
    work_mode: str = Field(default="")
    phone_number: str = Field(default="")

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
    plagiarism_score:        int   = Field(default=0, ge=0, le=100)
    plagiarism_reasoning:    str   = Field(default="")
    eq_feedback:             str   = Field(default="")
    repeated_words_detected: list[str] = Field(default_factory=list)
    next_technical_question: str   = Field(default="")
    follow_up_question:      str   = Field(default="")
    next_topic:              str   = Field(default="")
    answer_quality:          str   = Field(default="average")
    final_verdict:           str   = Field(default="")
    model_used:              str   = Field(default="sterling ai")
    # ── Silent AI/Plagiarism Detection (invisible to candidate) ──────────
    ai_detection:            dict  = Field(default_factory=dict, description="Multi-layer silent AI/plagiarism analysis result")

# NOTE: A second, older SaveInterviewRequest({interview_data, overall_score}) used
# to be defined here. It was shadowed by the fuller definition below and is removed.

class AdminUserCreate(BaseModel):
    email: str
    password: str
    role: str = "sub_admin"

class AdminUserResponse(BaseModel):
    admin_id: str
    email: str
    role: str
    created_at: str

class AdminQuestion(BaseModel):
    department: str
    role: str
    question: str
    keywords: str
    difficulty: str = Field(default="Medium")

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
    # Sprint 3: Integrity Engine fields (optional — backend computes if not sent)
    integrity_score:         int   = Field(default=100, ge=0, le=100, description="Integrity score 0-100 from client-side signal tracking")
    integrity_data:          dict  = Field(default_factory=dict, description="Full signal log from IntegrityEngine.compute_final()")
    # Phase 1: Integrity Triage Matrix Sub-Scores
    posture_score:           float = Field(default=100.0)
    movement_score:          float = Field(default=100.0)
    eye_tracking_score:      float = Field(default=100.0)
    authenticity_score:      float = Field(default=100.0)
    environment_score:       float = Field(default=100.0)
    
    plagiarism_score:        int   = Field(default=0)
    plagiarism_reasoning:    str   = Field(default="")

class DecisionUpdateRequest(BaseModel):
    decision: str

# NOTE: A duplicate AdminQuestion model (identical to the one defined above) was
# removed from here.

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
    # Serve the Sterling logo bundled relative to this file
    logo_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "frontend", "src", "assets", "sterling_logo.png")
    if os.path.exists(logo_path):
        return FileResponse(logo_path, media_type="image/png")
    from fastapi.responses import Response
    return Response(status_code=204)  # No Content — graceful fallback

@app.get("/", tags=["System"])
def health_check():
    return {
        "status": "online",
        "timestamp": ist_isoformat(),
        "ai_status": get_orchestrator_stats(),
        "architect": "Aditya Singh",
        "ai_models": ["Sterling Assessment Engine", "Intelligent Analysis Engine", "Candidate Analysis Engine"],
        "orchestrator_mode": "ACTIVE"
    }

@app.post("/api/execute-code", tags=["Interview"])
async def execute_code(req: ExecuteCodeRequest):
    """Securely compile and execute candidate Python code in a restricted sandbox."""
    import sys, io, traceback, threading

    # ── Guard 1: Language check ──
    if req.language.lower() not in ["python", "python3"]:
        return {
            "output": f"Backend execution for {req.language} is not supported. Please use Python.",
            "error": True,
        }

    # ── Guard 2: Code length limit ──
    if len(req.code) > 5000:
        return {"output": "Code exceeds the 5,000 character limit.", "error": True}

    # ── Guard 3: Block dangerous keywords at source level ──
    BLOCKED_KEYWORDS = ["import ", "__import__", "exec(", "eval(", "open(", "compile(",
                        "globals(", "locals(", "getattr(", "setattr(", "delattr(",
                        "__builtins__", "__class__", "__subclasses__", "subprocess",
                        "os.system", "os.popen", "shutil", "pathlib"]
    code_lower = req.code.lower()
    for kw in BLOCKED_KEYWORDS:
        if kw.lower() in code_lower:
            return {"output": f"Blocked: '{kw.strip()}' is not allowed in the sandbox.", "error": True}

    # ── Guard 4: Safe builtins only ──
    SAFE_BUILTINS = {
        "print": print, "range": range, "len": len, "enumerate": enumerate,
        "zip": zip, "map": map, "filter": filter, "sorted": sorted,
        "reversed": reversed, "sum": sum, "min": min, "max": max,
        "abs": abs, "round": round, "int": int, "float": float, "str": str,
        "bool": bool, "list": list, "dict": dict, "set": set, "tuple": tuple,
        "isinstance": isinstance, "type": type, "repr": repr, "chr": chr,
        "ord": ord, "hex": hex, "bin": bin, "oct": oct, "pow": pow,
        "divmod": divmod, "hash": hash, "id": id, "any": any, "all": all,
        "input": lambda *a: "",  # Neutered input() — returns empty string
        "Exception": Exception, "ValueError": ValueError, "TypeError": TypeError,
        "KeyError": KeyError, "IndexError": IndexError, "StopIteration": StopIteration,
        "ZeroDivisionError": ZeroDivisionError, "RuntimeError": RuntimeError,
    }

    # ── Guard 5: Execute with timeout via threading ──
    output_capture = {"stdout": "", "error": False}

    def _run_sandboxed():
        old_stdout = sys.stdout
        redirected = sys.stdout = io.StringIO()
        try:
            allowed_globals = {"__builtins__": SAFE_BUILTINS}
            exec(req.code, allowed_globals)
            output_capture["stdout"] = redirected.getvalue()
        except Exception:
            output_capture["stdout"] = traceback.format_exc()
            output_capture["error"] = True
        finally:
            sys.stdout = old_stdout

    thread = threading.Thread(target=_run_sandboxed, daemon=True)
    thread.start()
    thread.join(timeout=5.0)  # 5 second hard timeout

    if thread.is_alive():
        return {"output": "Execution timed out (5 second limit).", "error": True}

    return {"output": output_capture["stdout"] or "(No output)", "error": output_capture["error"]}

@app.get("/api/system/status", tags=["System"])
def system_status():
    """Full system health: circuit breakers, model stats, Whisper status."""
    return {
        "version": "5.0.0",
        "circuit_breakers": all_breaker_status(),
        "orchestrator_stats": get_orchestrator_stats(),
        "whisper": get_whisper_status(),
        "timestamp": ist_isoformat(),
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

    existing = db.query(Candidate).filter(Candidate.email == data.email.lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists. Please login.")
    
    cid = generate_enterprise_id(db, "CAN")
    pwd_hash = bcrypt.hashpw(data.password.encode(), bcrypt.gensalt()).decode('utf-8')
    
    new_cand = Candidate(
        candidate_id=cid,
        name=data.name,
        email=data.email.lower(),
        phone=data.phone,
        password_hash=pwd_hash
    )
    db.add(new_cand)
    db.commit()
    
    return CandidateResponse(id=cid, name=data.name, email=data.email, phone=data.phone, created_at=str(new_cand.registration_date))

@app.post("/api/auth/login", tags=["Auth"])
@limiter.limit("10/minute")
async def login_candidate(request: Request, data: CandidateLogin, db: Session = Depends(get_db)):

    cand = db.query(Candidate).filter(Candidate.email == data.email.lower()).first()
    if not cand or not bcrypt.checkpw(data.password.encode(), cand.password_hash.encode('utf-8')):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    return {"status": "success", "candidate_id": cand.candidate_id, "name": cand.name}

@app.post("/api/auth/admin-login", tags=["Auth"])
@limiter.limit("5/minute")
async def admin_login(request: Request, data: CandidateLogin, db: Session = Depends(get_db)):
    admin = db.query(AdminUser).filter(AdminUser.email == data.email.lower()).first()
    
    if admin and bcrypt.checkpw(data.password.encode(), admin.password_hash.encode('utf-8')):
        # Token expires in 2 hours
        payload = {"sub": "admin", "email": admin.email, "role": admin.role, "exp": int(time.time()) + 7200}
        token = jwt.encode(payload, JWT_SECRET, algorithm="HS256")
        
        db.add(AdminActivityLog(admin_email=admin.email, action_type="LOGIN", target="Admin Portal"))
        db.commit()

        # Set HttpOnly Secure cookie (invisible to JavaScript / XSS-immune)
        response = JSONResponse(content={"status": "success", "token": token, "email": admin.email, "role": admin.role})
        response.set_cookie(
            key="session_token",
            value=token,
            httponly=True,
            secure=COOKIE_SECURE,
            samesite=COOKIE_SAMESITE,
            max_age=7200,  # 2 hours
            path="/",
            domain=COOKIE_DOMAIN,
        )
        return response
        
    db.add(SecurityEventLog(event_type="FAILED_LOGIN", target_email=data.email))
    db.commit()
    raise HTTPException(status_code=401, detail="Invalid admin credentials")

@app.post("/api/admin/users", response_model=AdminUserResponse, tags=["Admin"])
async def create_admin_user(data: AdminUserCreate, req: Request, db: Session = Depends(get_db)):
    # Simple auth extraction if present
    auth_header = req.headers.get("Authorization")
    actor_email = "SYSTEM"
    actor_role = "sub_admin"
    if auth_header and auth_header.startswith("Bearer "):
        try:
            token = auth_header.split(" ")[1]
            payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            actor_email = payload.get("email", "SYSTEM")
            actor_role = payload.get("role", "sub_admin")
        except Exception:
            pass

    email_lower = data.email.lower()
    if db.query(AdminUser).filter(AdminUser.email == email_lower).first():
        raise HTTPException(status_code=400, detail="Admin with this email already exists")
    
    # ── Password Policy Enforcement ──
    if not re.match(r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$", data.password):
        raise HTTPException(
            status_code=400, 
            detail="Password must be at least 8 characters long, contain one uppercase letter, one lowercase letter, one number, and one special character."
        )
    
    # Force role to sub_admin if creator is not a master_admin
    new_role = "sub_admin"
    if actor_role == "master_admin" and data.role == "master_admin":
        new_role = "master_admin"
        
    # Give the first ever created user master_admin access automatically
    if db.query(AdminUser).count() == 0:
        new_role = "master_admin"

    hashed = bcrypt.hashpw(data.password.encode(), bcrypt.gensalt()).decode()
    new_admin = AdminUser(
        admin_id=f"ADMIN-{uuid.uuid4().hex[:8].upper()}",
        email=email_lower,
        password_hash=hashed,
        role=new_role
    )
    db.add(new_admin)
    db.add(AdminActivityLog(admin_email=actor_email, action_type="GRANT_ACCESS", target=email_lower))
    db.commit()
    db.refresh(new_admin)
    return new_admin

@app.get("/api/admin/users", response_model=list[AdminUserResponse], tags=["Admin"])
async def get_admin_users(db: Session = Depends(get_db)):
    return db.query(AdminUser).all()

@app.delete("/api/admin/users/{admin_id}", tags=["Admin"])
async def delete_admin_user(admin_id: str, req: Request, db: Session = Depends(get_db)):
    auth_header = req.headers.get("Authorization")
    actor_email = "SYSTEM"
    if auth_header and auth_header.startswith("Bearer "):
        try:
            token = auth_header.split(" ")[1]
            payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            actor_email = payload.get("email", "SYSTEM")
        except Exception:
            pass

    admin = db.query(AdminUser).filter(AdminUser.admin_id == admin_id).first()
    if not admin:
        raise HTTPException(status_code=404, detail="Admin not found")
    
    # Prevent deleting the master admin
    if admin.email == "sparkhire.sterling@gmail.com":
        raise HTTPException(status_code=403, detail="Cannot delete the master admin")
        
    db.delete(admin)
    db.add(AdminActivityLog(admin_email=actor_email, action_type="REVOKE_ACCESS", target=admin.email))
    db.commit()
    return {"status": "success", "message": "Admin deleted"}

# ── OTP Authentication Endpoints (Sprint 1) ──────────────────────────────
# These sit alongside the old password endpoints (backward compat).
# Admin login is completely separate and unchanged above.

_otp_rate_limit: dict[str, list[float]] = {}

def _hash_otp(raw_code: str) -> str:
    """SHA-256 hash of the raw OTP. Never store the raw 6-digit code."""
    return hashlib.sha256(raw_code.encode()).hexdigest()

def _mask_identifier(identifier: str) -> str:
    """Mask email/phone for safe inclusion in API responses."""
    if "@" in identifier:
        parts = identifier.split("@")
        return parts[0][:2] + "****@" + parts[1]
    return identifier[:3] + "****" + identifier[-2:]

def _invalidate_existing_otps(db: Session, identifier: str, purpose: str):
    """Mark all existing unexpired OTPs for this identifier+purpose as used.
    Ensures only one active OTP exists at any time."""
    now_iso = ist_isoformat()
    existing = db.query(OTPStore).filter(
        OTPStore.identifier == identifier,
        OTPStore.purpose == purpose,
        OTPStore.is_used == False,
        OTPStore.expires_at > now_iso
    ).all()
    for otp in existing:
        otp.is_used = True  # type: ignore
    db.commit()

@app.post("/api/auth/candidate/send-otp", tags=["Candidate Auth"])
def send_candidate_otp(
    request: Request,
    data: SendOTPRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Step 1 of OTP flow: generate a 6-digit OTP, hash it, store it,
    and send the raw code to the candidate's email.
    """
    ip = request.client.host if request.client else "127.0.0.1"
    now = time.time()

    # ── Rate limiting: max 5 OTP requests per IP per minute ──────────────
    _otp_rate_limit.setdefault(ip, [])
    _otp_rate_limit[ip] = [ts for ts in _otp_rate_limit[ip] if now - ts < 60]
    if len(_otp_rate_limit[ip]) >= 5:
        raise HTTPException(
            status_code=429,
            detail="Too many OTP requests. Please wait a minute before trying again."
        )
    _otp_rate_limit[ip].append(now)

    identifier = data.identifier.strip().lower()
    purpose = data.purpose.strip()

    if purpose not in ("registration", "login"):
        raise HTTPException(status_code=400, detail="purpose must be 'registration' or 'login'")

    # ── Guard: check candidate existence matches purpose ─────────────────
    from sqlalchemy import or_
    existing_candidate = db.query(Candidate).filter(
        or_(Candidate.email == identifier, Candidate.candidate_id == identifier.upper())
    ).first()

    if purpose == "registration":
        raise HTTPException(status_code=403, detail="Candidate self-registration is disabled. Contact Admin.")

    if not existing_candidate:
        raise HTTPException(
            status_code=404,
            detail="No candidate found with this email. Please ask an Admin to invite you."
        )
    
    if getattr(existing_candidate, "invitation_status", "Confirmed") != "Confirmed":
        raise HTTPException(
            status_code=403,
            detail="You must confirm your registration via email before logging in."
        )

    # ── Invalidate any existing active OTPs for this identifier ──────────
    _invalidate_existing_otps(db, identifier, purpose)

    # ── Generate and store the new OTP ───────────────────────────────────
    raw_code = str(secrets.randbelow(900000) + 100000)  # Always 6 digits: 100000–999999
    otp_hash = _hash_otp(raw_code)
    expires_iso = datetime.fromtimestamp(
        time.time() + 600, tz=timezone.utc
    ).isoformat()  # 10 minutes — matches the "expires in 10 minutes" text in the OTP email

    otp_id = generate_enterprise_id(db, "OTP")
    db.add(OTPStore(
        otp_id=otp_id,
        identifier=identifier,
        otp_hash=otp_hash,
        purpose=purpose,
        expires_at=expires_iso,
        is_used=False,
        attempts=0
    ))
    db.commit()

    # ── Send OTP via email ────────────────────────────────────────────────
    # SECURITY: never log the raw OTP. Anyone with log access could read it and
    # bypass verification. Log only the masked identifier and purpose.
    logger.info(f"[OTP] Generated code for {_mask_identifier(identifier)} ({purpose}).")

    # Send via email service in the background to prevent API timeouts
    from services.email_service import send_otp_email
    candidate_name = str(existing_candidate.name) or data.name.strip() or "Candidate"
    background_tasks.add_task(
        send_otp_email,
        to_email=identifier,
        code=raw_code,
        purpose=purpose,
        candidate_name=candidate_name
    )

    return {
        "status": "sent",
        "message": f"A 6-digit verification code has been sent to {_mask_identifier(identifier)}.",
        "expires_in_seconds": 600
    }


@app.post("/api/auth/candidate/verify-otp", tags=["Candidate Auth"])
def verify_candidate_otp(
    data: VerifyOTPRequest,
    db: Session = Depends(get_db)
):
    """
    Step 2 of OTP flow: validate the submitted OTP against the stored hash.
    On success: creates or logs in the candidate and returns a session token.
    """
    identifier = data.identifier.strip().lower()
    purpose = data.purpose.strip()
    now_iso = ist_isoformat()

    # ── Find the most recent, active OTP for this identifier ─────────────
    otp_record = db.query(OTPStore).filter(
        OTPStore.identifier == identifier,
        OTPStore.purpose == purpose,
        OTPStore.is_used == False
    ).order_by(OTPStore.created_at.desc()).first()

    if not otp_record:
        raise HTTPException(
            status_code=404,
            detail="No active OTP found. Please request a new code."
        )

    # ── Check expiry ──────────────────────────────────────────────────────
    expires_dt = None
    now_dt = None
    try:
        expires_dt = datetime.fromisoformat(str(otp_record.expires_at))
        now_dt = datetime.now(timezone.utc)
        is_expired = expires_dt < now_dt
    except Exception:
        # Fallback to string comparison if parsing fails
        is_expired = str(otp_record.expires_at) < now_iso

    if is_expired:
        otp_record.is_used = True  # type: ignore
        db.commit()
        raise HTTPException(
            status_code=410,
            detail="This OTP has expired. Please request a new verification code."
        )

    # ── Brute-force guard: max 5 attempts ────────────────────────────────
    otp_record.attempts += 1  # type: ignore
    if otp_record.attempts > 5:  # type: ignore
        otp_record.is_used = True  # type: ignore
        db.commit()
        raise HTTPException(
            status_code=429,
            detail="Too many failed attempts. This OTP has been invalidated. Please request a new code."
        )

    # ── Validate the OTP hash ─────────────────────────────────────────────
    submitted_hash = _hash_otp(data.otp_code.strip())
    if submitted_hash != otp_record.otp_hash:  # type: ignore
        db.commit()  # Persist the incremented attempt count
        remaining = 5 - int(otp_record.attempts)  # type: ignore
        raise HTTPException(
            status_code=401,
            detail=f"Incorrect OTP. {remaining} attempt(s) remaining."
        )

    # ── OTP is valid. Mark as used immediately (prevents replay attacks). ─
    otp_record.is_used = True  # type: ignore
    db.commit()

    # ── Handle registration vs login ──────────────────────────────────────
    if purpose == "registration":
        if not data.name.strip():
            raise HTTPException(status_code=400, detail="Name is required for registration.")
        # Double-check the candidate doesn't already exist (race condition guard)
        existing = db.query(Candidate).filter(Candidate.email == identifier).first()
        if existing:
            raise HTTPException(status_code=409, detail="This email is already registered. Please login.")

        cid = generate_enterprise_id(db, "CAN")
        candidate = Candidate(
            candidate_id=cid,
            name=data.name.strip(),
            email=identifier,
            phone=data.phone.strip() if data.phone else "",
            password_hash=None,  # OTP-only candidate — no password
            is_verified=True
        )
        db.add(candidate)
        db.commit()
    else:  # login
        candidate = db.query(Candidate).filter(Candidate.email == identifier).first()
        if not candidate:
            raise HTTPException(status_code=404, detail="Candidate not found.")
        if not candidate.is_verified:  # type: ignore
            candidate.is_verified = True  # type: ignore
            db.commit()

    # ── Issue a candidate session token (7-day expiry) ────────────────────
    payload = {
        "sub": candidate.candidate_id,
        "name": candidate.name,
        "email": candidate.email,
        "role": "candidate",
        "exp": int(time.time()) + 604800  # 7 days
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm="HS256")

    logger.info(f"[OTP Auth] Candidate {candidate.candidate_id} authenticated via OTP ({purpose}).")

    # Set HttpOnly Secure cookie (invisible to JavaScript / XSS-immune)
    response = JSONResponse(content={
        "status": "success",
        "candidate_id": candidate.candidate_id,
        "name": candidate.name,
        "email": candidate.email,
        "token": token  # Still returned for backward compat during migration
    })
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=604800,  # 7 days
        path="/",
        domain=COOKIE_DOMAIN,
    )
    return response




@app.get("/api/admin/candidates", tags=["Admin Candidate Management"])
def admin_get_candidates(db: Session = Depends(get_db)):
    candidates = db.query(Candidate).order_by(Candidate.registration_date.desc()).all()
    return candidates

@app.post("/api/admin/candidates/invite", tags=["Admin Candidate Management"])
def admin_invite_candidate(data: InviteCandidateRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    # 1. Check if email exists
    existing = db.query(Candidate).filter(Candidate.email == data.email.strip().lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="A candidate with this email already exists.")

    # 2. Generate secure token
    token = secrets.token_urlsafe(32)
    expires_at = time.time() + (3 * 3600)  # 3 hours

    # 2.5 Resolve department/role names to actual DB IDs (frontend passes names)
    dept = db.query(Department).filter(Department.department_name == data.department_id).first()
    real_dept_id = dept.department_id if dept else data.department_id

    role = None
    if dept:
        role = db.query(JobRole).filter(JobRole.role_name == data.role_id, JobRole.department_id == dept.department_id).first()
    else:
        role = db.query(JobRole).filter(JobRole.role_name == data.role_id).first()
    real_role_id = role.role_id if role else data.role_id

    # 3. Create Candidate
    cid = generate_enterprise_id(db, "CAN")
    cand = Candidate(
        candidate_id=cid,
        name=data.name.strip(),
        email=data.email.strip().lower(),
        department_id=real_dept_id,
        role_id=real_role_id,
        invitation_status="Pending",
        invitation_token=token,
        invitation_expires_at=expires_at,
        is_verified=False
    )
    db.add(cand)
    db.commit()
    
    # 4. Send Email via FastAPI's request-lifecycle background tasks (not a raw
    # threading.Thread). Capture ORM values before scheduling to avoid
    # DetachedInstanceError once the session is closed.
    from services.email_service import send_invitation_email
    c_email = str(cand.email)
    c_name = str(cand.name)
    c_role = str(cand.role_id)

    def email_task():
        try:
            send_invitation_email(
                to_email=c_email,
                candidate_name=c_name,
                token=token,
                role_name=c_role
            )
        except Exception as e:
            logger.error(f"Failed to send invite email: {e}")
    background_tasks.add_task(email_task)

    return {"status": "success", "message": "Invitation sent successfully", "candidate_id": cid}

@app.post("/api/admin/candidates/invite/resend", tags=["Admin Candidate Management"])
def admin_resend_candidate_invite(data: InviteCandidateRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    cand = db.query(Candidate).filter(Candidate.email == data.email.strip().lower()).first()
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found.")
        
    if cand.invitation_status != "Pending":
        raise HTTPException(status_code=400, detail=f"Cannot resend. Status is currently {cand.invitation_status}")

    # Generate new token
    token = secrets.token_urlsafe(32)
    cand.invitation_token = token  # type: ignore
    cand.invitation_expires_at = time.time() + (3 * 3600)  # type: ignore
    db.commit()

    from services.email_service import send_invitation_email
    c_email = str(cand.email)
    c_name = str(cand.name)
    c_role = str(cand.role_id)

    def email_task():
        try:
            send_invitation_email(
                to_email=c_email,
                candidate_name=c_name,
                token=token,
                role_name=c_role
            )
        except Exception as e:
            logger.error(f"Failed to resend invite email: {e}")
    background_tasks.add_task(email_task)

    return {"status": "success", "message": "Invitation resent successfully"}

@app.delete("/api/admin/candidates/{candidate_id}", tags=["Admin Candidate Management"])
def admin_delete_candidate(candidate_id: str, db: Session = Depends(get_db)):
    cand = db.query(Candidate).filter(Candidate.candidate_id == candidate_id).first()
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found.")

    db.delete(cand)
    db.commit()
    return {"status": "success", "message": "Candidate deleted successfully"}

@app.get("/api/candidates/verify", tags=["Candidate Auth"])
def verify_invitation(token: str, action: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    cand = db.query(Candidate).filter(Candidate.invitation_token == token).first()
    if not cand:
        raise HTTPException(status_code=404, detail="Invalid or expired token.")
        
    if time.time() > (cand.invitation_expires_at or 0):
        cand.invitation_status = "Auto-Canceled"  # type: ignore
        db.commit()
        raise HTTPException(status_code=400, detail="This invitation has expired.")
        
    if action == "confirm":
        cand.invitation_status = "Confirmed"  # type: ignore
        cand.invitation_token = None  # type: ignore # Prevent reuse
        db.commit()
        # Trigger success email via FastAPI background tasks
        from services.email_service import send_registration_success_email
        assert cand is not None
        c_email = str(cand.email)
        c_name = str(cand.name)
        def success_email_task():
            try:
                send_registration_success_email(c_email, c_name)
            except Exception as e:
                logger.error(f"Failed to send registration success email: {e}")
        background_tasks.add_task(success_email_task)
        return {"status": "success", "message": "Registration Confirmed. You may now log in."}
        
    elif action == "cancel":
        cand.invitation_status = "Canceled"  # type: ignore
        cand.invitation_token = None  # type: ignore
        db.commit()
        return {"status": "success", "message": "Registration Canceled."}
    else:
        raise HTTPException(status_code=400, detail="Invalid action.")

@app.post("/api/candidates/{candidate_id}/complete-profile", tags=["Candidates"])
async def complete_candidate_profile(
    candidate_id: str,
    experience_level: str = Form(...),
    key_skills: str = Form(...),
    work_mode: str = Form(...),
    expected_salary: str = Form(...),
    phone: str = Form(...),
    linkedin: str = Form(...),
    github: str = Form(...),
    portfolio: str = Form(...),
    resume: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    cand = db.query(Candidate).filter(Candidate.candidate_id == candidate_id).first()
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found")
        
    cand.experience_level = experience_level  # type: ignore
    cand.key_skills = key_skills  # type: ignore
    cand.work_mode = work_mode  # type: ignore
    cand.expected_salary = expected_salary  # type: ignore
    cand.phone = phone  # type: ignore
    cand.linkedin = linkedin  # type: ignore
    cand.github = github  # type: ignore
    cand.portfolio = portfolio  # type: ignore
    
    # Process resume upload
    upload_dir = "uploads/resumes"
    os.makedirs(upload_dir, exist_ok=True)
    
    # Security: Sanitize candidate_id and filename to prevent path traversal
    safe_cid = candidate_id.replace("/", "").replace("\\", "").replace(".", "")
    safe_filename = os.path.basename(resume.filename) if resume.filename else "resume.pdf"
    file_path = os.path.join(upload_dir, f"{safe_cid}_{safe_filename}")
    
    raw_resume_bytes = await resume.read()
    encrypted_resume = encrypt_data(raw_resume_bytes)
    with open(file_path, "wb") as buffer:
        buffer.write(encrypted_resume)
        
    # Temporary file for ATS parsing since parser needs raw file on disk
    tmp_path = os.path.join(upload_dir, f"tmp_{safe_cid}_{safe_filename}")
    with open(tmp_path, "wb") as tmp_buffer:
        tmp_buffer.write(raw_resume_bytes)
        
    # ATS Parsing
    from services.resume_engine import parse_and_score_resume
    res_id = generate_enterprise_id(db, "RES")
    new_resume = Resume(
        resume_id=res_id,
        candidate_id=candidate_id,
        resume_file_path=file_path,
        extracted_text="Processing...",
        skills_detected="[]",
        resume_score=0.0
    )
    db.add(new_resume)
    db.commit()
    db.refresh(new_resume)
    
    # Run parsing silently
    try:
        # Assuming job role text is fetched
        role_record = db.query(JobRole).filter(JobRole.role_id == cand.role_id).first()
        role_desc = role_record.role_name if role_record else "General"
        score, skills, txt = await parse_and_score_resume(tmp_path, str(role_desc))
        new_resume.resume_score = score
        new_resume.skills_detected = json.dumps(skills)  # type: ignore
        new_resume.extracted_text = txt
        db.commit()
    except Exception as e:
        logger.error(f"ATS Parsing Failed: {e}")
    finally:
        if os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except Exception as e:
                logger.error(f"Failed to delete temporary resume file: {e}")
        
        
    return {"status": "success", "message": "Profile completed successfully"}

@app.get("/api/candidates/{candidate_id}", tags=["Candidates"])
async def get_candidate(candidate_id: str, db: Session = Depends(get_db), _auth: dict = Depends(require_candidate_or_admin)):
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

# NOTE: The DELETE /api/candidates/{candidate_id} route is defined once, below in
# the Admin section (with require_admin auth and rollback handling). A duplicate
# definition that previously lived here was removed.

@app.post("/api/profile-photo/upload", tags=["Candidates"])
async def upload_profile_photo(data: ProfilePhotoUploadRequest, db: Session = Depends(get_db)):
    cand = db.query(Candidate).filter(Candidate.candidate_id == data.candidate_id).first()
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found")

    if not data.selfie_image:
        raise HTTPException(status_code=400, detail="Missing Selfie image.")
        
    try:
        # 1. Decode Selfie image
        selfie_data = data.selfie_image.split(',')[1] if ',' in data.selfie_image else data.selfie_image
        selfie_bytes = base64.b64decode(selfie_data)
            
        # 2. Encrypt and Save images
        encrypted_selfie_bytes = encrypt_data(selfie_bytes)
        
        upload_dir = "recordings"
        os.makedirs(upload_dir, exist_ok=True)
        
        # Security: Sanitize candidate_id to prevent path traversal
        safe_cid = data.candidate_id.replace("/", "").replace("\\", "").replace(".", "")
        selfie_path = os.path.join(upload_dir, f"selfie_{safe_cid}.jpg")
        
        with open(selfie_path, "wb") as f:
            f.write(encrypted_selfie_bytes)
            
        selfie_url = ""
        if supabase_client:
            try:
                # Upload to Supabase bucket
                supabase_client.storage.from_("kyc-images").upload(f"selfie_{safe_cid}.jpg", encrypted_selfie_bytes, file_options={"content-type": "application/octet-stream", "upsert": "true"})
                
                # Get public URLs
                selfie_url = supabase_client.storage.from_("kyc-images").get_public_url(f"selfie_{safe_cid}.jpg")
            except Exception as e:
                logger.error(f"Failed to upload Profile Photo to Supabase: {e}")
        
        # Fallback to local API serving if Supabase is missing/fails
        if not selfie_url:
            selfie_url = f"{BACKEND_URL}/api/recordings/selfie_{safe_cid}.jpg"

        cand.selfie_url = selfie_url # type: ignore
        cand.aadhar_image_url = "" # type: ignore
        cand.aadhar_name = cand.name # type: ignore
        cand.aadhar_number_masked = "" # type: ignore
        cand.kyc_verified = True # type: ignore (Hack to let frontend proceed without KYC flags)
        
        db.commit()
        
        return {
            "verified": True,
            "detail": "Profile photo uploaded successfully.",
            "extracted_name": cand.name
        }
    except Exception as e:
        logger.error(f"Photo Upload Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to process profile photo.")

@app.post("/api/candidates/{candidate_id}/apply", tags=["Candidates"])
async def apply_for_role(candidate_id: str, data: ApplicationCreate, db: Session = Depends(get_db), _auth: dict = Depends(require_candidate_or_admin)):
    cand = db.query(Candidate).filter(Candidate.candidate_id == candidate_id).first()
    if not cand: raise HTTPException(status_code=404, detail="Candidate not found")
    
    role = db.query(JobRole).filter(JobRole.role_name == data.job_role).first()
    if not role:
        raise HTTPException(status_code=400, detail="Invalid job role. Role not found in database.")
    
    cand.experience_level = data.experience # type: ignore
    cand.key_skills = data.skills # type: ignore
    cand.github = data.github_url # type: ignore
    cand.linkedin = data.linkedin_url # type: ignore
    cand.portfolio = data.portfolio_url # type: ignore
    cand.expected_salary = data.expected_salary # type: ignore
    cand.work_mode = data.work_mode # type: ignore
    cand.phone = data.phone_number # type: ignore
    cand.role_id = role.role_id # type: ignore
    
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
    if not reader.fieldnames:
        raise HTTPException(status_code=400, detail="CSV is empty or missing headers")
        
    fields = [f.strip().lower() for f in reader.fieldnames]
    col_map = {f_lower: f_orig for f_lower, f_orig in zip(fields, reader.fieldnames)}
    
    def find_col(possible_names):
        for p in possible_names:
            for f in fields:
                if p == f: return col_map[f]
        for p in possible_names:
            for f in fields:
                if p in f: return col_map[f]
        return None

    dept_key = find_col(["department", "dept"])
    role_key = find_col(["role", "job"])
    question_key = find_col(["question", "ask"])
    keywords_key = find_col(["keyword", "tags"])
    difficulty_key = find_col(["difficulty", "level"])
    
    if not all([dept_key, role_key, question_key, keywords_key, difficulty_key]):
        raise HTTPException(status_code=400, detail="CSV missing required semantic columns. Ensure it roughly contains: Department, Role, Question, Keywords, Difficulty.")
    
    imported_count = 0
    skipped_count = 0
    failed_count = 0
    failed_reasons = []
    
    new_structure_map = {}
    ts = ist_isoformat()
    
    for idx, row in enumerate(reader, start=1):
        try:
            dept_name = row[dept_key].strip() if dept_key else "General"
            role_name = row[role_key].strip() if role_key else "Any"
            question_text = row[question_key].strip() if question_key else ""
            keywords = row[keywords_key].strip() if keywords_key else ""
            difficulty = row[difficulty_key].strip() if difficulty_key else "Medium"
            
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
                
            # Check if question already exists for this role
            existing_q = db.query(QuestionBank).filter_by(
                department_id=dept.department_id,
                role_id=role.role_id,
                question_text=question_text
            ).first()

            if existing_q:
                # Update existing question with new keywords and difficulty
                existing_q.keywords = keywords  # type: ignore
                existing_q.difficulty = difficulty  # type: ignore
                db.commit()
                # Treat as imported since it was successfully processed
                imported_count += 1
            else:
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
    """Seed the database with Sterling AI default roles and questions."""
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
    ts = ist_isoformat()
    
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
    ts = ist_isoformat()
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

# ── Live Session Monitor (Sprint 5) ─────────────────────────────────────────
# Returns all currently active in-memory interview sessions with candidate
# details for the admin live monitoring panel.

@app.get("/api/admin/live-sessions", tags=["Admin"])
async def get_live_sessions(db: Session = Depends(get_db)):
    """Returns all candidates with active in-memory interview sessions."""
    from services.interview_memory import _sessions, _lock

    results = []
    with _lock:
        active_ids = list(_sessions.keys())

    for cid in active_ids:
        session = get_session(cid)
        if not session:
            continue

        # Get candidate details from DB
        cand = db.query(Candidate).filter_by(candidate_id=cid).first()
        if not cand:
            continue

        # Get latest interview session
        iv = db.query(InterviewSession).filter_by(
            candidate_id=cid
        ).order_by(InterviewSession.started_at.desc()).first()

        # Calculate duration
        duration_str = "00:00"
        if iv and iv.started_at:
            try:
                from datetime import datetime
                started = datetime.fromisoformat(iv.started_at.replace("Z", "+00:00"))
                now = datetime.now(timezone.utc)
                # Handle IST timestamps
                if started.tzinfo is None:
                    started = started.replace(tzinfo=IST)
                    now = datetime.now(IST)
                elapsed = int((now - started).total_seconds())
                mins, secs = divmod(max(0, elapsed), 60)
                duration_str = f"{mins:02d}:{secs:02d}"
            except Exception:
                duration_str = "00:00"

        # Determine current phase name
        stage_map = {1: "Warm-up", 2: "Resume Deep Dive", 3: "Technical", 4: "System Design", 5: "Behavioral/HR"}
        current_phase = stage_map.get(session.current_stage, "Unknown")

        results.append({
            "candidate_id": cid,
            "name": cand.name,
            "email": cand.email,
            "selfie_url": cand.selfie_url,
            "job_role": session.job_role or (iv.role.role_name if (iv and iv.role) else ""),
            "experience": cand.experience_level or session.experience or "",
            "key_skills": cand.key_skills or session.skills or "",
            "interview_id": iv.interview_id if iv else None,
            "started_at": iv.started_at if iv else None,
            "duration": duration_str,
            "question_index": session.question_index,
            "current_stage": session.current_stage,
            "current_phase": current_phase,
            "difficulty_index": session.difficulty_index,
            "avg_technical": session.avg_technical,
            "avg_communication": session.avg_communication,
            "avg_confidence": session.avg_confidence,
            "pulse_rate": "Active" if session.question_index > 0 else "Initializing",
        })

    return results

class AdminKillRequest(BaseModel):
    candidate_id: str
    interview_id: str = Field(default="")
    reason: str = Field(default="Interview terminated by administrator")

@app.post("/api/admin/kill-interview", tags=["Admin"])
async def admin_kill_interview(req: AdminKillRequest, db: Session = Depends(get_db)):
    """Admin forcefully terminates an interview."""
    ts = ist_isoformat()

    c = db.query(Candidate).filter_by(candidate_id=req.candidate_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Candidate not found")

    iv = None
    if req.interview_id:
        iv = db.query(InterviewSession).filter_by(interview_id=req.interview_id).first()
    if not iv:
        iv = db.query(InterviewSession).filter_by(candidate_id=req.candidate_id).order_by(
            InterviewSession.started_at.desc()
        ).first()

    if not iv:
        raise HTTPException(status_code=404, detail="No active interview session found")

    # Mark as terminated by admin
    iv.status_id = 500  # type: ignore
    iv.completed_at = ts  # type: ignore
    iv.overall_score = 0.0  # type: ignore
    iv.admin_termination_reason = req.reason  # type: ignore

    admin_act_signals = json.dumps([
        {
            "signal": "admin_termination",
            "note": req.reason,
            "deduction": 100,
            "timestamp": ts,
            "category": "admin"
        }
    ])

    existing_report = db.query(FinalReport).filter_by(interview_id=iv.interview_id).first()
    if existing_report:
        existing_report.grade = "F"  # type: ignore
        existing_report.overall_score = 0.0  # type: ignore
        existing_report.hiring_decision = "ADMIN_TERMINATED"  # type: ignore
        existing_report.integrity_score = 0  # type: ignore
        existing_report.integrity_verdict = "HIGH_RISK"  # type: ignore
        existing_report.integrity_signals = admin_act_signals  # type: ignore
        existing_report.summary = f"Interview terminated by administrator. Reason: {req.reason}"  # type: ignore
        existing_report.strengths = json.dumps([])  # type: ignore
        existing_report.weaknesses = json.dumps([req.reason])  # type: ignore
    else:
        new_report = FinalReport(
            report_id=generate_enterprise_id(db, "REP"),
            candidate_id=req.candidate_id,
            interview_id=iv.interview_id,
            overall_score=0.0,
            grade="F",
            recommendation="ADMIN_TERMINATED",
            strengths=json.dumps([]),
            weaknesses=json.dumps([req.reason]),
            summary=f"Interview terminated by administrator. Reason: {req.reason}",
            hiring_decision="ADMIN_TERMINATED",
            integrity_score=0,
            integrity_verdict="HIGH_RISK",
            integrity_signals=admin_act_signals,
            posture_score=0.0,
            movement_score=0.0,
            eye_tracking_score=0.0,
            authenticity_score=0.0,
            environment_score=0.0,
        )
        db.add(new_report)

    try:
        db.commit()
        logger.info(f"[Admin] Interview {iv.interview_id} manually terminated. Reason: {req.reason}")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to save admin termination: {str(e)}")

    from services.interview_memory import clear_session
    clear_session(req.candidate_id)

    return {
        "status": "terminated",
        "interview_id": iv.interview_id,
        "reason": req.reason,
    }

@app.get("/api/interviews/{interview_id}/check-kill", tags=["Data"])
async def check_interview_kill(interview_id: str, db: Session = Depends(get_db)):
    """Lightweight endpoint for candidate to poll if admin killed their interview."""
    iv = db.query(InterviewSession).filter_by(interview_id=interview_id).first()
    if not iv:
        raise HTTPException(status_code=404, detail="Interview not found")
    
    if iv.admin_termination_reason:
        return {"killed": True, "reason": iv.admin_termination_reason}
    return {"killed": False}


@app.get("/api/admin/pipeline", tags=["Admin"])
async def get_candidate_pipeline(db: Session = Depends(get_db)):
    """Returns all candidates joined with their interview scores for the HR Dashboard."""
    cands = db.query(Candidate).order_by(Candidate.registration_date.desc()).all()
    results = []
    for c in cands:
        interviews = sorted(c.interviews, key=lambda i: i.started_at, reverse=True)  # type: ignore
        latest = interviews[0] if interviews else None
        resume = db.query(Resume).filter_by(candidate_id=c.candidate_id).order_by(Resume.resume_id.desc()).first()
        # Get hiring_decision from FinalReport (single source of truth, same as dashboard)
        report = db.query(FinalReport).filter_by(interview_id=latest.interview_id).first() if latest else None
        hiring_decision = getattr(report, "hiring_decision", "PENDING") if report else "PENDING"
        is_completed = bool(latest and (latest.completed_at or (latest.overall_score or 0) > 0 or hiring_decision == "PROCTORING_ACT"))

        results.append({
            "id": c.candidate_id,
            "interview_id": latest.interview_id if latest else None,
            "name": c.name,
            "email": c.email,
            "job_role": (latest.role.role_name if (latest and latest.role) else ""),
            "experience": resume.experience_years if resume else "",
            "created_at": c.registration_date,
            "global_score": float(latest.overall_score or 0) if latest else 0.0,
            "technical_score": float(getattr(latest, "technical_score", 0) or 0) if latest else 0.0,
            "communication_score": float(getattr(latest, "communication_score", 0) or 0) if latest else 0.0,
            "eq_score": float(getattr(latest, "behavioral_score", 0) or 0) if latest else 0.0,
            "hiring_decision": hiring_decision,
            "interview_status": "completed" if is_completed else "pending",
            "termination_reason": "PROCTORING_ACT" if hiring_decision == "PROCTORING_ACT" else None,
            "status": "COMPLETED" if is_completed else "PENDING"
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

    resume_score = parsed.get("resume_score", 0)
    parsed_skills = json.dumps(parsed.get("extracted_skills", []))
    parsed_projects = json.dumps(parsed.get("extracted_projects", []))
    education_text = parsed.get("education", "")
    resume.extracted_text = resume_text  # type: ignore
    resume.skills_detected = parsed_skills  # type: ignore
    resume.projects_summary = parsed_projects  # type: ignore
    resume.education_summary = education_text  # type: ignore
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

# ── Admin System Health ───────────────────────────────────────────────────
@app.get("/api/admin/system/health", tags=["Admin"])
async def get_system_health(db: Session = Depends(get_db)):
    import time
    from datetime import datetime, timedelta, timezone
    from sqlalchemy import text, func
    from database.models import InterviewSession, Candidate, JobRole, SystemTelemetryLog, SecurityEventLog

    now = datetime.now(timezone.utc)
    
    # 1. DB Latency Ping
    start_time = time.time()
    try:
        db.execute(text("SELECT 1"))
        db_latency = int((time.time() - start_time) * 1000)
        db_status = "Connected"
    except Exception:
        db_latency = -1
        db_status = "Disconnected"

    # 3. Live Streams (Active Candidates)
    live_sessions = db.query(InterviewSession, Candidate, JobRole).join(
        Candidate, InterviewSession.candidate_id == Candidate.candidate_id
    ).join(
        JobRole, InterviewSession.role_id == JobRole.role_id
    ).filter(InterviewSession.completed_at == None).all()

    live_sessions_data = []
    role_distribution_map = {}
    active_sessions_count = 0
    
    for session, candidate, role in live_sessions:
        # Calculate duration
        try:
            started = datetime.fromisoformat(session.started_at.replace('Z', '+00:00'))
            dur_seconds = int((now - started).total_seconds())
        except Exception:
            dur_seconds = 0
            
        if dur_seconds > 7200:
            continue
            
        active_sessions_count += 1
        mins, secs = divmod(dur_seconds, 60)
        duration_str = f"{mins}m {secs}s"
        
        stage = "In Progress"

        live_sessions_data.append({
            "id": candidate.candidate_id,
            "name": candidate.name,
            "role": role.role_name,
            "stage": stage,
            "duration": duration_str,
            "status": "Live"
        })

        role_distribution_map[role.role_name] = role_distribution_map.get(role.role_name, 0) + 1

    role_distribution = [{"name": k, "value": v} for k, v in role_distribution_map.items()]
    if not role_distribution:
        role_distribution = [{"name": "No Active Roles", "value": 1}]

    # 4. Telemetry Time Series (Query real DB logs)
    telemetry_logs = db.query(SystemTelemetryLog).order_by(SystemTelemetryLog.timestamp.desc()).limit(20).all()
    telemetry_logs.reverse() # Chronological order
    
    api_telemetry = []
    ai_telemetry = []
    
    # Pad with empty data if we have less than 20 points so the chart renders correctly
    points_needed = 20 - len(telemetry_logs)
    for i in range(points_needed, 0, -1):
        t_label = (now - timedelta(minutes=i*5)).strftime("%H:%M")
        api_telemetry.append({"time": t_label, "requests": 0, "latency": 0, "sessions": 0})
        ai_telemetry.append({"time": t_label, "tokens": 0})
        
    for log in telemetry_logs:
        try:
            t = datetime.fromisoformat(log.timestamp.replace('Z', '+00:00')).strftime("%H:%M")
        except Exception:
            t = "00:00"
        api_telemetry.append({
            "time": t,
            "requests": log.api_requests_count,
            "latency": log.db_latency_ms,
            "sessions": log.active_sessions
        })
        ai_telemetry.append({
            "time": t,
            "tokens": log.ai_tokens_generated
        })

    # 5. Security & Auth Chart (Query real Security Logs)
    security_events = db.query(
        func.substr(SecurityEventLog.timestamp, 12, 2).label("hour"),
        func.count(SecurityEventLog.event_id).label("count")
    ).filter(SecurityEventLog.event_type == "FAILED_LOGIN").group_by("hour").all()
    
    security_telemetry = []
    sec_map = {hour: count for hour, count in security_events}
    
    # Pad last 4 hours
    for i in range(3, -1, -1):
        h = (now - timedelta(hours=i)).strftime("%H")
        security_telemetry.append({
            "time": f"{h}:00",
            "failed_logins": sec_map.get(h, 0),
            "api_blocks": 0
        })

    # 6. Real Average Scores for Radar Chart
    avg_scores = db.query(
        func.avg(InterviewSession.technical_score).label('tech'),
        func.avg(InterviewSession.communication_score).label('comm'),
        func.avg(InterviewSession.confidence_score).label('conf'),
        func.avg(InterviewSession.overall_score).label('overall'),
    ).filter(InterviewSession.completed_at != None).first()

    tech = avg_scores.tech if avg_scores and avg_scores.tech is not None else 80
    comm = avg_scores.comm if avg_scores and avg_scores.comm is not None else 80
    conf = avg_scores.conf if avg_scores and avg_scores.conf is not None else 80
    overall = avg_scores.overall if avg_scores and avg_scores.overall is not None else 80

    ai_radar_telemetry = [
        {"metric": "Tech Avg", "score": round(tech, 1), "fullMark": 100},
        {"metric": "Comm Avg", "score": round(comm, 1), "fullMark": 100},
        {"metric": "Conf Avg", "score": round(conf, 1), "fullMark": 100},
        {"metric": "Overall Avg", "score": round(overall, 1), "fullMark": 100},
        {"metric": "Completion", "score": 95, "fullMark": 100},
    ]

    return {
        "api_status": "Operational",
        "uptime": "99.99%",
        "db_status": db_status,
        "db_latency": f"{db_latency}ms",
        "ai_engine": "Online",
        "ai_load": "Normal",
        "active_sessions": active_sessions_count,
        "telemetry": {
            "api": api_telemetry,
            "database": [], # Unused in frontend currently
            "ai": ai_telemetry,
            "sessions": [], # Unused
            "security": security_telemetry,
            "ai_radar": ai_radar_telemetry,
            "role_distribution": role_distribution,
            "live_streams": live_sessions_data
        }
    }

@app.get("/api/admin/audit-logs", tags=["Admin"])
async def get_audit_logs(db: Session = Depends(get_db)):
    from database.models import AdminActivityLog
    logs = db.query(AdminActivityLog).order_by(AdminActivityLog.timestamp.desc()).limit(50).all()
    results = []
    for log in logs:
        # compute relative time string
        try:
            ts = datetime.fromisoformat(log.timestamp.replace('Z', '+00:00'))
            dur = int((datetime.now(timezone.utc) - ts).total_seconds())
            if dur < 60: rel = "Just now"
            elif dur < 3600: rel = f"{dur//60} mins ago"
            elif dur < 86400: rel = f"{dur//3600} hours ago"
            else: rel = f"{dur//86400} days ago"
        except Exception:
            rel = "Unknown"

        results.append({
            "id": log.log_id,
            "timestamp": rel,
            "admin_email": log.admin_email,
            "action_type": log.action_type,
            "target": log.target
        })
    return results

# ── Candidate Leaderboard ───────────────────────────────────────────────────────

@app.get("/api/leaderboard", tags=["Recruiter"])
async def get_leaderboard(db: Session = Depends(get_db)):
    """
    Return ONE ROW PER INTERVIEW SESSION so admins see every attempt a candidate made,
    including proctoring-terminated sessions with grade F and PROCTORING_ACT status.
    """
    # Return only candidates who have confirmed their registration (i.e. not Pending/Canceled invites)
    cands = db.query(Candidate).filter(Candidate.invitation_status == "Confirmed").order_by(Candidate.registration_date.desc()).all()
    rows = []

    # Group candidates by email to handle redundancy if they register multiple times
    from collections import defaultdict
    candidates_by_email = defaultdict(list)
    for c in cands:
        candidates_by_email[c.email.lower()].append(c)

    for email, group in candidates_by_email.items():
        # Get the most recent candidate record for profile info
        latest_c = group[0]

        # Combine all interviews across all duplicate records
        all_interviews = []
        for c in group:
            all_interviews.extend(c.interviews)
        
        # Sort them chronologically so attempt numbering is correct
        all_interviews = sorted(all_interviews, key=lambda i: getattr(i, 'started_at', ''))

        # Get the most recent resume across all records
        resume = None
        for c in group:
            res = db.query(Resume).filter_by(candidate_id=c.candidate_id).order_by(Resume.resume_id.desc()).first()
            if res:
                resume = res
                break
                
        resume_score = getattr(resume, "resume_score", 0) if resume else 0

        # Resolve the candidate's assigned job role from ANY record in the email
        # group. This mirrors the candidate-portal logic (/portal) so the admin
        # pipeline shows the SAME role the candidate sees on their dashboard.
        # Handles duplicate records and a role_id that literally stores the name.
        group_job_role = ""
        for gc in group:
            if gc.role_id:
                jr = db.query(JobRole).filter(JobRole.role_id == gc.role_id).first()
                group_job_role = jr.role_name if jr else str(gc.role_id)
                if group_job_role:
                    break

        if not all_interviews:
            # Candidate registered but never started any interview.
            job_role_name = group_job_role

            rows.append({
                "id": latest_c.candidate_id,
                "interview_id": None,
                "attempt_number": 0,
                "attempt_label": "No Interview Yet",
                "name": latest_c.name,
                "email": latest_c.email,
                "job_role": job_role_name,
                "experience": resume.experience_years if resume else "",
                "resume_score": resume_score,
                "resume_status": 200 if resume else 100,
                "technical_score": 0.0,
                "communication_score": 0.0,
                "confidence_score": 0.0,
                "problem_solving_score": 0.0,
                "role_alignment_score": 0.0,
                "professionalism_score": 0.0,
                "learning_potential_score": 0.0,
                "behavioral_score": 0.0,
                "fluency_score": 0.0,
                "eq_score": 0.0,
                "global_score": 0.0,
                "hiring_decision": None,
                "ai_recommendation": None,
                "interview_status": "pending",
                "proctoring_warnings": 0,
                "integrity_score": 100,
                "integrity_verdict": "CLEAN",
                "integrity_data": {"signal_log": []},
                "termination_reason": None,
                "session_started_at": latest_c.registration_date,
                "created_at": latest_c.registration_date,
            })
            continue

        from collections import Counter
        role_totals = Counter(iv.role.role_name if iv.role else "" for iv in all_interviews)
        role_current_counts = {}

        for iv in all_interviews:
            role_name = iv.role.role_name if iv.role else ""
            role_current_counts[role_name] = role_current_counts.get(role_name, 0) + 1
            attempt_idx = role_current_counts[role_name]
            total_attempts = role_totals[role_name]

            report = getattr(iv, "report", None)

            # Determine termination reason from report hiring_decision or status
            termination_reason = None
            hiring_decision = getattr(report, "hiring_decision", "PENDING") if report else "PENDING"
            if hiring_decision == "PROCTORING_ACT":
                termination_reason = "PROCTORING_ACT"
            elif iv.status_id == 500:  # FAILED status
                termination_reason = "TERMINATED"

            # Format attempt label with timestamp
            try:
                ts_obj = datetime.fromisoformat(iv.started_at.replace('Z', '+00:00'))
                ts_str = ts_obj.strftime("%d %b %Y, %I:%M %p")
            except Exception:
                ts_str = iv.started_at[:16] if iv.started_at else "Unknown"

            attempt_label = f"Attempt #{attempt_idx}" if total_attempts > 1 else "Interview"

            is_completed = bool(iv.completed_at or iv.overall_score > 0 or hiring_decision == "PROCTORING_ACT")

            d = {
                "id": latest_c.candidate_id,
                "interview_id": iv.interview_id,
                "attempt_number": attempt_idx,
                "attempt_label": attempt_label,
                "session_timestamp": ts_str,
                "session_started_at": iv.started_at,
                "name": latest_c.name,
                "email": latest_c.email,
                "job_role": (iv.role.role_name if iv.role else group_job_role),
                "experience": resume.experience_years if resume else "",
                "resume_score": resume_score,
                "resume_status": 200 if resume else 100,
                "technical_score": float(iv.technical_score or 0),
                "communication_score": float(iv.communication_score or 0),
                "confidence_score": float(iv.confidence_score or 0),
                "problem_solving_score": float(getattr(iv, "problem_solving_score", 0) or 0),
                "role_alignment_score": float(getattr(iv, "role_alignment_score", 0) or 0),
                "professionalism_score": float(getattr(iv, "professionalism_score", 0) or 0),
                "learning_potential_score": float(getattr(iv, "learning_potential_score", 0) or 0),
                "behavioral_score": float(iv.behavioral_score or 0),
                "fluency_score": float(getattr(iv, "fluency_score", 0) or 0),
                "eq_score": 0.0,
                "global_score": float(iv.overall_score or 0),
                "hiring_decision": hiring_decision,
                "ai_recommendation": iv.recommendation if iv.recommendation else None,
                "interview_status": "completed" if is_completed else "pending",
                "proctoring_warnings": getattr(iv, "proctoring_warnings", 0) or 0,
                "integrity_score": int(getattr(report, "integrity_score", 100)) if report else 100,
                "integrity_verdict": getattr(report, "integrity_verdict", "CLEAN") if report else "CLEAN",
                "integrity_data": {
                    "signal_log": json.loads(getattr(report, "integrity_signals", "[]") or "[]") if report else []
                },
                "termination_reason": termination_reason,
                "created_at": latest_c.registration_date,
            }

            rows.append(d)

    # Sort by session_started_at desc (most recent first).
    # (A previously-defined unused `sort_key` helper was removed as dead code.)
    rows.sort(key=lambda r: r.get("session_started_at", "") or "", reverse=True)

    # Deduplicate globally by Email + Job Role, keeping only the most recent attempt
    seen_roles = set()
    unique_rows = []
    for r in rows:
        key = (r.get("email", "").lower(), r.get("job_role", ""))
        if key not in seen_roles:
            seen_roles.add(key)
            unique_rows.append(r)

    ranked = rank_candidates(unique_rows)
    return {"total": len(ranked), "candidates": ranked}



# ── Proctoring Termination Endpoint ──────────────────────────────────────────

class ProctoringTerminationRequest(BaseModel):
    candidate_id: str
    interview_id: str = Field(default="")
    proctoring_logs: list[dict] = Field(default_factory=list)
    integrity_data: dict = Field(default_factory=dict)
    termination_reason: str = Field(default="Proctoring violation threshold exceeded")
    proctoring_warnings: int = Field(default=3)

@app.post("/api/interviews/terminate-proctoring", tags=["Data"])
async def terminate_proctoring(req: ProctoringTerminationRequest, db: Session = Depends(get_db)):
    """
    Called by the frontend when a proctoring violation terminates an interview.
    Creates a FinalReport with grade=F, score=0, hiring_decision=PROCTORING_ACT.
    This ensures the terminated session always appears in admin views.
    """
    ts = ist_isoformat()

    c = db.query(Candidate).filter_by(candidate_id=req.candidate_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Candidate not found")

    # Find the active (uncompleted) interview session to terminate
    iv = None
    if req.interview_id:
        iv = db.query(InterviewSession).filter_by(interview_id=req.interview_id).first()
    if not iv:
        # Fall back to latest uncompleted session for this candidate
        iv = db.query(InterviewSession).filter_by(candidate_id=req.candidate_id).order_by(
            InterviewSession.started_at.desc()
        ).first()

    if not iv:
        raise HTTPException(status_code=404, detail="No active interview session found")

    # Only terminate if not already completed with a real report
    existing_report = db.query(FinalReport).filter_by(interview_id=iv.interview_id).first()
    if existing_report and existing_report.hiring_decision != "PROCTORING_ACT":
        # Already has a legitimate report — do not overwrite
        return {"status": "already_completed", "interview_id": iv.interview_id}

    # Mark interview session as FAILED
    iv.status_id = 500  # type: ignore
    iv.completed_at = ts  # type: ignore
    iv.overall_score = 0.0  # type: ignore
    if hasattr(iv, 'proctoring_warnings'):
        iv.proctoring_warnings = req.proctoring_warnings  # type: ignore

    proctoring_act_signals = json.dumps([
        {
            "signal": "proctoring_termination",
            "note": req.termination_reason,
            "deduction": 100,
            "timestamp": ts,
            "category": "proctoring"
        }
    ] + req.integrity_data.get("signal_log", []))

    if existing_report:
        # Update the existing proctoring report
        existing_report.grade = "F"  # type: ignore
        existing_report.overall_score = 0.0  # type: ignore
        existing_report.hiring_decision = "PROCTORING_ACT"  # type: ignore
        existing_report.integrity_score = 0  # type: ignore
        existing_report.integrity_verdict = "HIGH_RISK"  # type: ignore
        existing_report.integrity_signals = proctoring_act_signals  # type: ignore
        existing_report.summary = f"Interview terminated by proctoring system. Reason: {req.termination_reason}"  # type: ignore
        existing_report.strengths = json.dumps([])  # type: ignore
        existing_report.weaknesses = json.dumps([req.termination_reason])  # type: ignore
    else:
        new_report = FinalReport(
            report_id=generate_enterprise_id(db, "REP"),
            candidate_id=req.candidate_id,
            interview_id=iv.interview_id,
            overall_score=0.0,
            grade="F",
            recommendation="PROCTORING_ACT",
            strengths=json.dumps([]),
            weaknesses=json.dumps([req.termination_reason]),
            summary=f"Interview terminated by proctoring system. Reason: {req.termination_reason}",
            hiring_decision="PROCTORING_ACT",
            integrity_score=0,
            integrity_verdict="HIGH_RISK",
            integrity_signals=proctoring_act_signals,
            posture_score=0.0,
            movement_score=0.0,
            eye_tracking_score=0.0,
            authenticity_score=0.0,
            environment_score=0.0,
        )
        db.add(new_report)

    try:
        db.commit()
        logger.info(f"[Proctoring] Interview {iv.interview_id} terminated for candidate {req.candidate_id}. Reason: {req.termination_reason}")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to save proctoring termination: {str(e)}")

    clear_session(req.candidate_id)
    return {
        "status": "terminated",
        "interview_id": iv.interview_id,
        "grade": "F",
        "hiring_decision": "PROCTORING_ACT",
        "created_at": ts,
    }


@app.delete("/api/candidates/{candidate_id}", tags=["Admin"])
async def delete_candidate(candidate_id: str, db: Session = Depends(get_db), _admin: dict = Depends(require_admin)):
    c = db.query(Candidate).filter_by(candidate_id=candidate_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    # Due to cascade delete settings in models, deleting the candidate will
    # automatically delete all associated records (resumes, interviews, reports, etc.)
    try:
        db.delete(c)
        db.commit()
        return {"status": "success", "message": f"Candidate {candidate_id} deleted."}
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to delete candidate {candidate_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete candidate.")

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

# ── Silent AI/Plagiarism Detection Engine ─────────────────────────────────────
# Runs on every answer server-side. Completely invisible to the candidate.
# Returns a structured detection report the frontend integrity engine scores.

_AI_SYNTAX_PATTERNS = [
    # Classic AI opener phrases
    (r"\bCertainly[,!]?\b",                          "opener:certainly"),
    (r"\bAbsolutely[,!]?\b",                          "opener:absolutely"),
    (r"\bGreat question\b",                           "opener:great_question"),
    (r"\bOf course[,!]?\b",                           "opener:of_course"),
    (r"\bSure[,!]? here('s| is)\b",                  "opener:sure_here"),
    # Robotic structure markers
    (r"\bFirstly\b.{0,120}\bSecondly\b",              "structure:firstly_secondly"),
    (r"\bIn conclusion\b",                            "structure:in_conclusion"),
    (r"\bTo summarize\b",                             "structure:to_summarize"),
    (r"\bIn summary\b",                               "structure:in_summary"),
    (r"\bIt is worth noting that\b",                  "structure:worth_noting"),
    (r"\bIt is important to note that\b",             "structure:important_to_note"),
    (r"\bFurthermore\b.{0,80}\bMoreover\b",          "structure:furthermore_moreover"),
    (r"\bThere are (three|four|five|several|multiple) (types|ways|approaches|key|main)\b", "structure:n_types"),
    # Textbook / encyclopedia phrasing
    (r"\bis defined as\b",                            "academic:is_defined_as"),
    (r"\bin the context of\b",                        "academic:in_context_of"),
    (r"\bplays a crucial role\b",                     "academic:crucial_role"),
    (r"\bplays a key role\b",                         "academic:key_role"),
    (r"\bsignificant impact\b",                       "academic:significant_impact"),
    (r"\bin today's (world|environment|landscape|digital age)\b", "academic:todays_world"),
    (r"\b(leverag|utiliz|optim)(e|ing|ed|es)\b",      "academic:leverage_utilize"),
    (r"\bensur(e|ing) (that|the|a|an)\b",             "academic:ensuring_that"),
    # AI list enumeration
    (r"(1\.|2\.|3\.).{0,30}(1\.|2\.|3\.)",          "format:numbered_list"),
    (r"(• |\* |– |— ).{0,60}(• |\* |– |— )",        "format:bullet_list"),
    # Suspiciously formal vocabulary in spoken context
    (r"\b(aforementioned|notwithstanding|henceforth|heretofore|therein)\b", "vocab:formal_spoken"),
    (r"\b(paradigm shift|holistic approach|synerg|ecosystem approach)\b",   "vocab:buzzword_heavy"),
]

_HUMAN_HEDGE_WORDS = [
    "um", "uh", "like", "you know", "kind of", "sort of", "i mean",
    "honestly", "basically", "actually", "so", "right", "hmm", "well",
    "i think", "i believe", "i guess", "maybe", "probably", "personally"
]

def _detect_ai_answer(answer: str, wpm: float, question_index: int) -> dict:
    """
    Multi-layer, server-side AI/plagiarism detection.
    Silent — never exposed to candidate.

    Layers:
      1. GPT Syntax Pattern Scan     — direct regex match on known AI phrases
      2. Human Hedge Word Ratio      — humans say 'um/uh/like' naturally; AI never does
      3. Lexical Diversity (TTR)     — AI uses wider, more formal vocabulary per sentence
      4. Sentence Length Uniformity  — AI answers have suspiciously uniform sentence lengths
      5. WPM + Structure Correlation — very fast WPM + perfect structure = likely pre-written

    Returns:
      {
        ai_probability: float (0.0–1.0)  — combined suspicion score
        is_suspected: bool               — True if ai_probability >= 0.50
        is_confirmed: bool               — True if ai_probability >= 0.80
        layers: dict                     — per-layer scores for audit log
        matched_patterns: list[str]      — specific patterns triggered
        integrity_signals: list[str]     — signal keys to feed into IntegrityEngine
      }
    """
    if not answer or len(answer.strip()) < 40:
        return {
            "ai_probability": 0.0, "is_suspected": False, "is_confirmed": False,
            "layers": {}, "matched_patterns": [], "integrity_signals": []
        }

    text = answer.strip()
    words = re.findall(r"\b[a-z']+\b", text.lower())
    sentences = [s.strip() for s in re.split(r'[.!?]+', text) if len(s.strip()) > 5]
    total_words = len(words)
    total_sentences = max(len(sentences), 1)

    signals = []
    matched_patterns = []

    # ── Layer 1: GPT Syntax Pattern Scan ──────────────────────────────────
    pattern_hits = 0
    for pattern, label in _AI_SYNTAX_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            pattern_hits += 1
            matched_patterns.append(label)
    # Score: 0 hits = 0.0, 1 hit = 0.2, 2 hits = 0.45, 3+ = 0.75+
    pattern_score = min(1.0, pattern_hits * 0.20 + max(0, pattern_hits - 2) * 0.15)

    # ── Layer 2: Human Hedge Word Ratio ───────────────────────────────────
    hedge_count = sum(1 for w in words if any(h in w or h == w for h in _HUMAN_HEDGE_WORDS))
    hedge_ratio = hedge_count / max(total_words, 1)
    # Humans: hedge_ratio typically 0.02–0.08. AI: near 0.
    # Score: 0 = very suspicious (no hedges), 1 = clearly human
    hedge_score_raw = min(1.0, hedge_ratio / 0.05)   # normalized
    hedge_suspicion = max(0.0, 1.0 - hedge_score_raw) # invert: no hedges = high suspicion
    # Reduce weight for very short answers (< 30 words)
    if total_words < 30:
        hedge_suspicion *= 0.5

    # ── Layer 3: Lexical Diversity (Type-Token Ratio) ──────────────────────
    unique_words = len(set(words))
    ttr = unique_words / max(total_words, 1)
    # AI tends to have higher TTR (more varied, formal vocabulary)
    # Humans in speech: TTR 0.4–0.65. AI: 0.65–0.85
    ttr_suspicion = max(0.0, min(1.0, (ttr - 0.60) / 0.25)) if ttr > 0.60 else 0.0

    # ── Layer 4: Sentence Length Uniformity ───────────────────────────────
    sent_lengths = [len(s.split()) for s in sentences]
    if len(sent_lengths) >= 3:
        avg_len = sum(sent_lengths) / len(sent_lengths)
        variance = sum((l - avg_len) ** 2 for l in sent_lengths) / len(sent_lengths)
        std_dev = variance ** 0.5
        # Human speech: high variance (std_dev > 8). AI: very uniform (std_dev < 4)
        uniformity_suspicion = max(0.0, min(1.0, (6.0 - std_dev) / 6.0)) if std_dev < 6 else 0.0
    else:
        uniformity_suspicion = 0.0

    # ── Layer 5: WPM + Structure Correlation ──────────────────────────────
    wpm_suspicion = 0.0
    if wpm > 220 and pattern_hits >= 1:    # Fast + AI phrases = scripted
        wpm_suspicion = 0.6
    elif wpm > 280:                        # Extreme speed alone
        wpm_suspicion = 0.5
        signals.append("abnormally_fast_wpm")
    elif wpm < 20 and total_words > 50:   # Copy-pasted (no time correlation)
        wpm_suspicion = 0.4

    # ── Weighted Combination ───────────────────────────────────────────────
    # Weights: patterns are strongest signal, hedge ratio second
    ai_probability = min(1.0,
        pattern_score       * 0.40 +
        hedge_suspicion     * 0.25 +
        uniformity_suspicion * 0.15 +
        ttr_suspicion        * 0.10 +
        wpm_suspicion        * 0.10
    )

    # ── Map to integrity signals ───────────────────────────────────────────
    if ai_probability >= 0.80:
        signals.append("gpt_syntax_confirmed")
    elif ai_probability >= 0.50:
        signals.append("gpt_syntax_suspected")

    if pattern_hits >= 2 and hedge_suspicion > 0.7:
        signals.append("perfect_structure_every")

    logger.info(
        f"[AIDetect] Q#{question_index} | probability={ai_probability:.2f} | "
        f"patterns={pattern_hits} | hedge={hedge_ratio:.3f} | TTR={ttr:.2f} | "
        f"wpm={wpm:.0f} | signals={signals}"
    )

    return {
        "ai_probability":  round(ai_probability, 3),
        "is_suspected":    ai_probability >= 0.50,
        "is_confirmed":    ai_probability >= 0.80,
        "layers": {
            "pattern_score":        round(pattern_score, 3),
            "hedge_suspicion":      round(hedge_suspicion, 3),
            "ttr_suspicion":        round(ttr_suspicion, 3),
            "uniformity_suspicion": round(uniformity_suspicion, 3),
            "wpm_suspicion":        round(wpm_suspicion, 3),
        },
        "matched_patterns":  matched_patterns,
        "integrity_signals": signals,
    }


@app.post("/api/interview/assess", response_model=AssessResponse, tags=["AI Engine"])
async def assess_candidate(data: AssessRequest, db: Session = Depends(get_db)):
    """Full context-aware answer evaluation with multi-LLM orchestration."""
    filler_words = detect_filler_words(data.spoken_answer)

    # Merge behavioral telemetry emotion with detected_emotion if Human.js is active
    resolved_emotion = (
        data.behavioral_telemetry.get("emotion") or data.detected_emotion or "Neutral"
    )

    combined_answer = data.spoken_answer
    if data.workspace_code.strip():
        combined_answer += f"\n\n[Candidate submitted the following code]:\n```\n{data.workspace_code}\n```"

    # ── Run silent AI/plagiarism detection FIRST (never visible to candidate) ──
    ai_detection = _detect_ai_answer(
        answer=data.spoken_answer,
        wpm=data.wpm,
        question_index=data.question_index,
    )

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

    # ── Sprint 4: Persist telemetry to PostgreSQL ──
    try:
        from database.models import ConversationHistory, QuestionEvaluation, CandidateAnswer, KeywordEvaluation, UnifiedInterviewData, InterviewQuestionsLog
        from database.db_utils import generate_enterprise_id
        
        iv = db.query(InterviewSession).filter_by(candidate_id=data.candidate_id).order_by(InterviewSession.started_at.desc()).first()
        if iv:
            # ── 1. Log AI Question to ConversationHistory ──
            db.add(ConversationHistory(
                conversation_id=generate_enterprise_id(db, "CONV"),
                interview_id=iv.interview_id,
                speaker="AI",
                message=data.current_question
            ))
            # ── 2. Log Candidate Answer to ConversationHistory ──
            db.add(ConversationHistory(
                conversation_id=generate_enterprise_id(db, "CONV"),
                interview_id=iv.interview_id,
                speaker="Candidate",
                message=combined_answer
            ))
            # ── 3. Log CandidateAnswer ──
            db.add(CandidateAnswer(
                answer_id=generate_enterprise_id(db, "ANS"),
                candidate_id=data.candidate_id,
                interview_id=iv.interview_id,
                candidate_answer=combined_answer,
                response_duration_seconds=float(data.wpm)
            ))
            # ── 4. Log Per-Question Evaluation ──
            db.add(QuestionEvaluation(
                evaluation_id=generate_enterprise_id(db, "EVALQ"),
                candidate_id=data.candidate_id,
                interview_id=iv.interview_id,
                technical_score=float(result.get("technical_score", 0)),
                communication_score=float(result.get("communication_score", 60)),
                behavior_score=float(result.get("behavioral_score", 60)),
                confidence_score=float(result.get("confidence_score", 60)),
                feedback=result.get("eq_feedback") or result.get("feedback") or ""
            ))
            # ── 5. Log Keyword Evaluation (with expected keywords) ──
            expected_kws = result.get("positive_keywords", []) + result.get("negative_keywords", [])
            matched_kws  = result.get("positive_keywords", [])
            missing_kws  = result.get("negative_keywords", [])
            kw_match_pct = (len(matched_kws) / max(len(expected_kws), 1)) * 100
            db.add(KeywordEvaluation(
                keyword_eval_id=generate_enterprise_id(db, "EVALK"),
                candidate_id=data.candidate_id,
                interview_id=iv.interview_id,
                expected_keywords=json.dumps(expected_kws),
                matched_keywords=json.dumps(matched_kws),
                missing_keywords=json.dumps(missing_kws),
                keyword_match_percentage=round(kw_match_pct, 1)
            ))
            # ── 6. Log to UnifiedInterviewData (single-row audit log per Q&A) ──
            db.add(UnifiedInterviewData(
                unified_id=generate_enterprise_id(db, "ANSLOG"),
                candidate_id=data.candidate_id,
                interview_id=iv.interview_id,
                question_text=data.current_question,
                expected_keywords=json.dumps(expected_kws),
                matched_keywords=json.dumps(matched_kws),
                missing_keywords=json.dumps(missing_kws),
                answer_score=float(result.get("technical_score", 0)),
                answer_feedback=result.get("eq_feedback") or result.get("feedback") or "",
                plagiarism_score=int(result.get("plagiarism_score", 0)),
                plagiarism_reasoning=str(result.get("plagiarism_reasoning", ""))
            ))
            # ── 7. Log to InterviewQuestionsLog (tracks question sequence) ──
            # Count existing questions for sequence numbering
            existing_q_count = db.query(InterviewQuestionsLog).filter_by(
                interview_id=iv.interview_id
            ).count()
            # Try to find matching question in question bank
            matched_q = db.query(QuestionBank).filter(
                QuestionBank.role_id == iv.role_id,
                QuestionBank.question_text == data.current_question
            ).first()
            if matched_q:
                db.add(InterviewQuestionsLog(
                    asked_question_id=generate_enterprise_id(db, "ASK"),
                    interview_id=iv.interview_id,
                    question_id=matched_q.question_id,
                    question_text=data.current_question,
                    sequence_number=existing_q_count + 1
                ))
            db.commit()
    except Exception as db_e:
        logger.error(f"Failed to persist assessment data to database: {db_e}")
        db.rollback()

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
        plagiarism_score=        int(result.get("plagiarism_score", 0)),
        plagiarism_reasoning=    str(result.get("plagiarism_reasoning", "")),
        eq_feedback=             feedback_text,
        repeated_words_detected= filler_words,
        next_technical_question= result.get("next_technical_question", ""),
        follow_up_question=      result.get("follow_up_question", ""),
        next_topic=              result.get("next_topic", ""),
        answer_quality=          result.get("answer_quality", "average"),
        final_verdict=           result.get("final_verdict", ""),
        model_used=              "sterling ai-2.0-flash",
        ai_detection=            ai_detection,   # ← silent detection payload
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

@app.post("/api/analyze-audio-authenticity", tags=["Security"])
async def analyze_audio_authenticity(file: UploadFile = File(...)):
    """
    Basic audio authenticity analysis using amplitude heuristics.
    Detects synthetic voices by checking amplitude variance, background noise, and silence ratios.
    """
    spoof_signals = []
    spoof_probability = 0

    try:
        audio_bytes = await file.read()

        if len(audio_bytes) < 100:
            return {
                "status": "success",
                "is_synthetic": False,
                "confidence": 0,
                "provider": "HeuristicAnalyzer",
                "message": "Audio too short to analyze",
                "signals": ["audio_too_short"]
            }

        # Convert to numpy array for analysis
        import numpy as np
        audio_array = np.frombuffer(audio_bytes, dtype=np.int16).astype(np.float32)

        if len(audio_array) == 0:
            return {
                "status": "success",
                "is_synthetic": False,
                "confidence": 0,
                "provider": "HeuristicAnalyzer",
                "message": "Empty audio data",
                "signals": ["empty_audio_data"]
            }

        # ── Check 1: Amplitude variance ──
        amplitude_std = float(np.std(np.abs(audio_array)))
        amplitude_mean = float(np.mean(np.abs(audio_array))) + 1e-6
        coefficient_of_variation = amplitude_std / amplitude_mean

        if coefficient_of_variation < 0.3:
            spoof_signals.append("unnaturally_uniform_amplitude")
            spoof_probability += 30

        # ── Check 2: Background noise floor ──
        sorted_amps = np.sort(np.abs(audio_array))
        noise_floor = float(np.mean(sorted_amps[:len(sorted_amps) // 10])) if len(sorted_amps) > 10 else 0
        if noise_floor < 5.0:
            spoof_signals.append("suspiciously_clean_audio")
            spoof_probability += 25

        # ── Check 3: Silence ratio ──
        silence_threshold = max(amplitude_mean * 0.05, 10.0)
        silence_samples = int(np.sum(np.abs(audio_array) < silence_threshold))
        silence_ratio = silence_samples / len(audio_array)
        if silence_ratio > 0.6:
            spoof_signals.append("excessive_silence")
            spoof_probability += 20

        is_synthetic = spoof_probability > 60

        return {
            "status": "success",
            "is_synthetic": is_synthetic,
            "confidence": spoof_probability / 100.0,
            "provider": "HeuristicAnalyzer",
            "message": "Synthetic voice detected" if is_synthetic else "Human voice detected",
            "signals": spoof_signals
        }

    except Exception as e:
        logger.warning(f"Audio authenticity analysis failed: {e}")
        return {
            "status": "success", 
            "is_synthetic": False, 
            "confidence": 0, 
            "provider": "HeuristicAnalyzer", 
            "message": "Analysis failed", 
            "signals": ["error"]
        }

@app.post("/api/interviews/{interview_id}/recording", tags=["AI Engine"])
async def upload_interview_recording(interview_id: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Upload WebM video recording of the entire interview session."""
    iv = db.query(InterviewSession).filter_by(interview_id=interview_id).first()
    if not iv: raise HTTPException(status_code=404, detail="Interview not found")
    
    raw_bytes = await file.read()
    if len(raw_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty video file")

    recording_url = ""
    if supabase_client:
        try:
            encrypted_bytes = encrypt_data(raw_bytes)
            filename = f"INT_{interview_id}_{int(datetime.now(timezone.utc).timestamp())}.webm"
            supabase_client.storage.from_("interview-recordings").upload(
                filename, 
                encrypted_bytes, 
                file_options={"content-type": "application/octet-stream", "upsert": "true"}
            )
            recording_url = supabase_client.storage.from_("interview-recordings").get_public_url(filename)
        except Exception as e:
            logger.error(f"Failed to upload video to Supabase: {e}")
            
    if not recording_url:
        # Fallback to local URL if Supabase fails
        base_url = os.getenv('SUPABASE_URL', 'https://supabase.co')
        recording_url = f"{base_url}/storage/v1/object/public/interview-recordings/INT_{interview_id}.webm"
        
    iv.recording_url = recording_url # type: ignore
    db.commit()
    return {"status": "success", "recording_url": recording_url}

@app.post("/api/interviews/{interview_id}/recording/chunk", tags=["AI Engine"])
async def upload_recording_chunk(
    interview_id: str,
    chunkIndex: int = Form(...),
    totalChunks: int = Form(...),
    sessionId: str | None = Form(None),
    chunk: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Handles chunked upload of massive video recordings to bypass proxy limits."""
    from pathlib import Path
    import time as _time
    temp_dir = Path("temp_recordings")
    temp_dir.mkdir(exist_ok=True)

    # Sweep abandoned partial uploads: if a client disconnects mid-upload the final
    # chunk never arrives and the temp file is never cleaned. Delete any temp file
    # older than the configured TTL (default 6h) so they cannot accumulate forever.
    try:
        ttl_seconds = int(os.environ.get("TEMP_RECORDING_TTL_SECONDS", str(6 * 3600)))
        now_ts = _time.time()
        for stale in temp_dir.glob("recording_*.webm"):
            try:
                if now_ts - stale.stat().st_mtime > ttl_seconds:
                    stale.unlink()
            except OSError:
                pass
    except Exception as e:
        logger.warning(f"Temp recording sweep failed: {e}")

    # Security: Sanitize ids to prevent path traversal
    safe_iid = interview_id.replace("/", "").replace("\\", "").replace(".", "")
    safe_sid = (sessionId or "").replace("/", "").replace("\\", "").replace(".", "")
    file_path = temp_dir / f"recording_{safe_iid}_{safe_sid}.webm"

    # Append chunk
    with open(file_path, "ab") as f:
        f.write(await chunk.read())

    if chunkIndex == totalChunks - 1:
        # This was the final chunk, now upload to Supabase.
        # Wrap in try/finally so the temp file is always removed, even on error.
        try:
            iv = db.query(InterviewSession).filter_by(interview_id=interview_id).first()
            if not iv: raise HTTPException(status_code=404, detail="Interview not found")

            raw_bytes = file_path.read_bytes()
            recording_url = ""

            if supabase_client:
                try:
                    filename = f"INT_{interview_id}_{int(datetime.now(timezone.utc).timestamp())}.webm"
                    supabase_client.storage.from_("interview-recordings").upload(
                        filename, raw_bytes, file_options={"content-type": "video/webm", "upsert": "true"}
                    )
                    recording_url = supabase_client.storage.from_("interview-recordings").get_public_url(filename)
                except Exception as e:
                    logger.error(f"Failed to upload chunked video to Supabase: {e}")

            if not recording_url:
                base_url = os.getenv('SUPABASE_URL', 'https://supabase.co')
                recording_url = f"{base_url}/storage/v1/object/public/interview-recordings/INT_{interview_id}.webm"

            iv.recording_url = recording_url # type: ignore
            db.commit()

            return {"status": "completed", "recording_url": recording_url}
        finally:
            # Cleanup temp file (always, even if upload/commit raised)
            try:
                file_path.unlink(missing_ok=True)
            except OSError:
                pass

    return {"status": "chunk_received", "chunkIndex": chunkIndex}

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

# ── Data: Save Interview & Recordings ──────────────────────────────────────────────────
# NOTE: A duplicate POST /api/interviews/{interview_id}/recording route (tags=["Data"])
# used to live here. FastAPI always routes to the first-registered match — the one in
# the "AI Engine" section above — so this definition was dead code and has been removed
# to eliminate the ambiguity flagged in the audit.


@app.post("/api/interviews/save", tags=["Data"])
async def save_interview(req: SaveInterviewRequest, bg: BackgroundTasks, db: Session = Depends(get_db)):
    ts = ist_isoformat()

    c = db.query(Candidate).filter_by(candidate_id=req.candidate_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Candidate not found")
        
    iv = db.query(InterviewSession).filter_by(candidate_id=req.candidate_id).order_by(InterviewSession.started_at.desc()).first()
    if not iv:
        raise HTTPException(status_code=404, detail="Active interview session not found")
        
    resume = db.query(Resume).filter_by(candidate_id=req.candidate_id).order_by(Resume.resume_id.desc()).first()
    candidate_resume_score = getattr(resume, "resume_score", 0) if resume else 0  # BUG-05 fix: ats_score → resume_score
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
        summary=req.summary,
        hiring_decision="PENDING",
        grade=grade,
        # Sprint 4: Persist integrity verdict from IntegrityEngine
        integrity_score=req.integrity_score,
        integrity_verdict=score_band(req.integrity_score),
        integrity_signals=json.dumps(req.integrity_data.get("signal_log", [])),
        # Phase 1: New Triage Matrix Scores
        posture_score=req.posture_score,
        movement_score=req.movement_score,
        eye_tracking_score=req.eye_tracking_score,
        authenticity_score=req.authenticity_score,
        environment_score=req.environment_score,
        plagiarism_score=req.plagiarism_score,
        plagiarism_reasoning=req.plagiarism_reasoning,
    )
    # Sprint 3: Attach integrity score to interview session for dashboard display
    integrity_score = req.integrity_score
    integrity_band = score_band(integrity_score)
    if hasattr(iv, 'proctoring_warnings'):
        iv.proctoring_warnings = req.proctoring_warnings  # type: ignore
    if hasattr(iv, 'proctoring_logs'):
        iv.proctoring_logs = json.dumps(req.proctoring_logs) if req.proctoring_logs else "[]"  # type: ignore
    logger.info(
        f"[Integrity] Candidate={req.candidate_id} | "
        f"IntegrityScore={integrity_score} | Band={integrity_band} | "
        f"Signals={len(req.integrity_data.get('signal_log', []))}"
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
        "hiring_decision": "PENDING",
        "hiring_label": hiring.get("label", "Under Review"),
    }

@app.patch("/api/interviews/{interview_id}/decision", tags=["Data"])
async def update_hiring_decision(interview_id: str, req: DecisionUpdateRequest, db: Session = Depends(get_db)):
    iv = db.query(InterviewSession).filter_by(interview_id=interview_id).first()
    if not iv:
        raise HTTPException(status_code=404, detail="Interview not found")
        
    report = db.query(FinalReport).filter_by(interview_id=interview_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    old_decision = getattr(report, "hiring_decision", "PENDING")
    new_decision = getattr(req, "decision")
    report.hiring_decision = new_decision
    db.commit()

    # ── Email notification to candidate on decision change (REMOVED) ───────────
    # Auto-email removed per user request. Email will be sent manually via new endpoint.
    
    return {"success": True, "decision": new_decision}

@app.post("/api/candidates/{candidate_id}/send-decision-email", tags=["Admin"])
async def send_decision_email_manual(candidate_id: str, db: Session = Depends(get_db)):
    candidate = db.query(Candidate).filter_by(candidate_id=candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
        
    iv = db.query(InterviewSession).filter_by(candidate_id=candidate_id).order_by(InterviewSession.started_at.desc()).first()
    if not iv:
        raise HTTPException(status_code=404, detail="No interview session found")
        
    report = db.query(FinalReport).filter_by(interview_id=iv.interview_id).first()
    decision = getattr(report, "hiring_decision", "PENDING") if report else "PENDING"
    
    name = candidate.name or "Candidate"
    
    if decision in ("HIRE", "HIRED"):
        subject = f"🎉 Congratulations {name} — You've been selected!"
        html = f"""
        <div style="font-family:Inter,sans-serif;max-width:600px;margin:auto;padding:32px;background:#fff;border-radius:16px;border:1px solid #e2e8f0;">
          <div style="text-align:center;margin-bottom:20px;">
            <img src="{LOGO_URL}" alt="Sterling E-Mobility" style="width:100px;height:auto;" />
          </div>
          <div style="background:#dc2626;padding:24px;border-radius:12px;text-align:center;margin-bottom:24px;">
            <h1 style="color:#fff;margin:0;font-size:28px;font-weight:900;">🎉 Congratulations!</h1>
          </div>
          <p style="font-size:16px;color:#1e293b;">Dear <strong>{name}</strong>,</p>
          <p style="font-size:16px;color:#475569;">We are absolutely delighted to inform you that you have been <strong style="color:#dc2626;">selected</strong> for the role you applied for.</p>
          <p style="font-size:15px;color:#475569;">Your performance in the interview was impressive, and the team is excited to have you on board. Our HR team will be in touch shortly with the next steps, offer letter, and onboarding details.</p>
          <p style="font-size:15px;color:#475569;margin-top:30px;">Thanks,<br/><strong>Sterling HR Team</strong></p>
        </div>
        """
    elif decision in ("NO_HIRE", "NO HIRE", "REJECTED", "REJECT"):
        subject = f"Your Sterling E-Mobility Application — An Update"
        html = f"""
        <div style="font-family:Inter,sans-serif;max-width:600px;margin:auto;padding:32px;background:#fff;border-radius:16px;border:1px solid #e2e8f0;">
          <div style="text-align:center;margin-bottom:20px;">
            <img src="{LOGO_URL}" alt="Sterling E-Mobility" style="width:100px;height:auto;" />
          </div>
          <div style="background:#1e293b;padding:24px;border-radius:12px;text-align:center;margin-bottom:24px;">
            <h1 style="color:#fff;margin:0;font-size:24px;font-weight:900;">Application Update</h1>
          </div>
          <p style="font-size:16px;color:#1e293b;">Dear <strong>{name}</strong>,</p>
          <p style="font-size:16px;color:#475569;">Thank you for taking the time to interview with us. After careful consideration, we have decided to move forward with other candidates at this time.</p>
          <p style="font-size:15px;color:#475569;">This decision was not easy — you demonstrated genuine effort and preparation during your interview. We encourage you to continue applying and growing your skills.</p>
          <p style="font-size:15px;color:#475569;margin-top:30px;">Thanks,<br/><strong>Sterling HR Team</strong></p>
        </div>
        """
    elif decision == "PENDING":
        subject = f"Your Interview is Under Review — Sterling E-Mobility"
        html = f"""
        <div style="font-family:Inter,sans-serif;max-width:600px;margin:auto;padding:32px;background:#fff;border-radius:16px;border:1px solid #e2e8f0;">
          <div style="text-align:center;margin-bottom:20px;">
            <img src="{LOGO_URL}" alt="Sterling E-Mobility" style="width:100px;height:auto;" />
          </div>
          <p style="font-size:16px;color:#1e293b;">Dear <strong>{name}</strong>,</p>
          <p style="font-size:16px;color:#475569;">Your interview has been received and is currently <strong>under review</strong> by our hiring team. We will update you as soon as a decision is made.</p>
          <p style="font-size:15px;color:#475569;margin-top:30px;">Thanks,<br/><strong>Sterling HR Team</strong></p>
        </div>
        """
    elif decision in ("PROCTORING_ACT", "PROCTORING ACT"):
        subject = f"Action Required: Sterling E-Mobility Interview Proctoring Review"
        html = f"""
        <div style="font-family:Inter,sans-serif;max-width:600px;margin:auto;padding:32px;background:#fff;border-radius:16px;border:1px solid #e2e8f0;">
          <div style="text-align:center;margin-bottom:20px;">
            <img src="{LOGO_URL}" alt="Sterling E-Mobility" style="width:100px;height:auto;" />
          </div>
          <div style="background:#f59e0b;padding:24px;border-radius:12px;text-align:center;margin-bottom:24px;">
            <h1 style="color:#fff;margin:0;font-size:24px;font-weight:900;">Proctoring Review</h1>
          </div>
          <p style="font-size:16px;color:#1e293b;">Dear <strong>{name}</strong>,</p>
          <p style="font-size:16px;color:#475569;">During the review of your recent Sterling E-Mobility interview, our automated system flagged certain proctoring anomalies that require further verification.</p>
          <p style="font-size:15px;color:#475569;">Our team will be reviewing this manually. If we need additional information or if a re-interview is required, we will reach out to you directly.</p>
          <p style="font-size:15px;color:#475569;margin-top:30px;">Thanks,<br/><strong>Sterling HR Team</strong></p>
        </div>
        """
    else:
        raise HTTPException(status_code=400, detail=f"Email templates are only supported for HIRE, NO HIRE, PENDING, and PROCTORING ACT. Current status is {decision}.")

    try:
        if candidate.email:
            send_notification_email(str(candidate.email), str(name), subject, html)
            return {"success": True, "message": "Email sent successfully"}
        else:
            raise HTTPException(status_code=400, detail="Candidate has no email address")
    except Exception as email_err:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {email_err}")


# ── Data: Report ──────────────────────────────────────────────────────────

def _build_interview_dict(iv_session, report):
    """Helper: build a consistent interview dict from a session + its report."""
    def _safe_json_list(val):
        if not val: return []
        if isinstance(val, list): return val
        try: return json.loads(val)
        except Exception: return []

    hiring_decision = getattr(report, "hiring_decision", "PENDING") if report else "PENDING"
    is_proctoring_terminated = hiring_decision == "PROCTORING_ACT"

    try:
        ts_obj = datetime.fromisoformat(iv_session.started_at.replace('Z', '+00:00'))
        session_ts = ts_obj.strftime("%d %b %Y, %I:%M %p")
    except Exception:
        session_ts = iv_session.started_at[:16] if iv_session.started_at else "Unknown"

    # Build transcript
    transcript = []
    try:
        convos = sorted(iv_session.conversation, key=lambda c: c.timestamp) if iv_session.conversation else []
    except Exception:
        convos = []
        
    try:
        key_evals = list(iv_session.keyword_evals) if iv_session.keyword_evals else []
    except Exception:
        key_evals = []

    # Real per-question scores (0-10) from UnifiedInterviewData.answer_score — used
    # for the per-question breakdown AND the trajectory chart (no fabricated data).
    try:
        unified = sorted(iv_session.unified_answers, key=lambda u: u.timestamp) if iv_session.unified_answers else []
    except Exception:
        unified = []

    questions = [c.message for c in convos if c.speaker == "AI"]
    answers = [c.message for c in convos if c.speaker == "Candidate"]

    per_question_scores = []
    for i in range(max(len(questions), len(answers))):
        positive_kws = []
        negative_kws = []
        if i < len(key_evals):
            try:
                positive_kws = json.loads(key_evals[i].matched_keywords or "[]")
                negative_kws = json.loads(key_evals[i].missing_keywords or "[]")
            except Exception:
                pass

        # Real per-question score; 0 when this question has no stored score.
        try:
            q_score = round(float(unified[i].answer_score), 1) if i < len(unified) else 0.0
        except Exception:
            q_score = 0.0

        q_text = questions[i] if i < len(questions) else ""
        a_text = answers[i] if i < len(answers) else ""

        # Only add to transcript if there's actually a question or answer
        if q_text or a_text:
            per_question_scores.append(q_score)
            transcript.append({
                "question": q_text,
                "answer": a_text,
                "score": q_score,
                "positive_keywords": positive_kws,
                "negative_keywords": negative_kws,
                "plagiarism_score": getattr(unified[i], "plagiarism_score", 0) if i < len(unified) else 0,
                "plagiarism_reasoning": getattr(unified[i], "plagiarism_reasoning", "") if i < len(unified) else ""
            })

    return {
        "interview_id": iv_session.interview_id,
        "session_timestamp": session_ts,
        "session_started_at": iv_session.started_at,
        "technical_score": float(iv_session.technical_score or 0),
        "eq_score": float(getattr(iv_session, "eq_score", 0) or 0),
        "confidence_score": float(iv_session.confidence_score or 0),
        "communication_score": float(iv_session.communication_score or 0),
        "problem_solving_score": float(getattr(iv_session, "problem_solving_score", 0) or 0),
        "role_alignment_score": float(getattr(iv_session, "role_alignment_score", 0) or 0),
        "professionalism_score": float(getattr(iv_session, "professionalism_score", 0) or 0),
        "learning_potential_score": float(getattr(iv_session, "learning_potential_score", 0) or 0),
        "behavioral_score": float(iv_session.behavioral_score or 0),
        "fluency_score": float(getattr(iv_session, "fluency_score", 0) or 0),
        "overall_score": float(getattr(iv_session, "overall_score", 0) or 0),
        "summary": (
            report.summary if report and report.summary
            else ("Interview terminated by proctoring system." if is_proctoring_terminated else "Interview completed.")
        ),
        "strengths": _safe_json_list(report.strengths if report else None),
        "weaknesses": _safe_json_list(report.weaknesses if report else None),
        "overall_rating": "N/A",
        "hiring_recommendation": getattr(report, "recommendation", "N/A") if report else "N/A",
        "readiness_score": 0,
        "hiring_decision": hiring_decision,
        "proctoring_warnings": getattr(iv_session, "proctoring_warnings", 0) or 0,
        "proctoring_logs": _safe_json_list(getattr(iv_session, "proctoring_logs", "[]")),
        "termination_reason": "PROCTORING_ACT" if is_proctoring_terminated else None,
        "integrity_score": int(getattr(report, "integrity_score", 100) if report else 100),
        "integrity_verdict": getattr(report, "integrity_verdict", "CLEAN") if report else "CLEAN",
        "integrity_signals": _safe_json_list(report.integrity_signals if report else None),
        "posture_score": float(getattr(report, "posture_score", 100) if report else 100),
        "movement_score": float(getattr(report, "movement_score", 100) if report else 100),
        "eye_tracking_score": float(getattr(report, "eye_tracking_score", 100) if report else 100),
        "authenticity_score": float(getattr(report, "authenticity_score", 100) if report else 100),
        "environment_score": float(getattr(report, "environment_score", 100) if report else 100),
        "plagiarism_score": getattr(report, "plagiarism_score", 0) if report else 0,
        "plagiarism_reasoning": getattr(report, "plagiarism_reasoning", "") if report else "",
        "grade": getattr(report, "grade", "F" if is_proctoring_terminated else "N/A") if report else ("F" if is_proctoring_terminated else "N/A"),
        "qa_history": transcript,
        "per_question_scores": per_question_scores,  # real 0-10 scores for the trajectory chart
        # FIX: previously BOTH keys returned video_clip_url (copy-paste bug), so the
        # "full recording" link was wrong and — since clip generation was removed —
        # always empty. Now recording_url returns the real recording, and the preview
        # falls back to the full recording when no short clip exists.
        "video_clip_url": getattr(iv_session, "video_clip_url", None) or getattr(iv_session, "recording_url", None),
        "recording_url": getattr(iv_session, "recording_url", None),
        "duration_seconds": int(getattr(iv_session, "duration_seconds", 0) or 0),
    }

@app.get("/api/reports/{candidate_id}", tags=["Data"])
async def get_candidate_report(candidate_id: str, db: Session = Depends(get_db), _auth: dict = Depends(require_candidate_or_admin)):
    """Return the MOST RECENT interview report for a candidate (backward compat)."""
    c = db.query(Candidate).filter_by(candidate_id=candidate_id).first()
    if not c: raise HTTPException(status_code=404, detail="Candidate not found")

    interviews = sorted(c.interviews, key=lambda i: i.started_at, reverse=True)  # type: ignore
    latest = interviews[0] if interviews else None
    job_role_name = (latest.role.role_name if (latest and latest.role) else "")

    c_dict = {
        "id": c.candidate_id,
        "name": c.name,
        "email": c.email,
        "phone": c.phone,
        "job_role": job_role_name,
        "total_attempts": len(interviews),
        "registration_date": c.registration_date,
        "kyc_verified": c.kyc_verified,
        "aadhar_name": c.aadhar_name,
        "aadhar_number_masked": c.aadhar_number_masked,
        "selfie_url": c.selfie_url,
        "aadhar_image_url": c.aadhar_image_url,
        "experience_level": c.experience_level,
        "key_skills": c.key_skills,
        "work_mode": c.work_mode,
        "expected_salary": c.expected_salary,
        "linkedin": c.linkedin,
        "github": c.github,
        "portfolio": c.portfolio,
    }
    
    # Fetch Resume
    resumes = sorted(c.resumes, key=lambda r: r.created_at, reverse=True)  # type: ignore
    latest_resume = resumes[0] if resumes else None
    def _safe_parse_list(val, default=None):
        if default is None:
            default = []
        if not val: return default
        val_str = str(val)
        try: return json.loads(val_str)
        except Exception: return [s.strip() for s in val_str.split(",")]

    def _safe_parse_string(val, default=""):
        if not val: return default
        val_str = str(val)
        try:
            parsed = json.loads(val_str)
            if isinstance(parsed, list): return "\n".join([str(x) for x in parsed])
            return str(parsed)
        except Exception:
            return val_str

    def _parse_experience(val):
        if not val: return 0.0
        val_str = str(val).lower()
        import re
        match = re.search(r"(\d+(\.\d+)?)", val_str)
        if match:
            return float(match.group(1))
        return 0.0

    resume_dict = None
    if latest_resume:
        resume_dict = {
            "resume_id": str(latest_resume.resume_id) if latest_resume.resume_id else "",
            "resume_score": float(latest_resume.resume_score) if latest_resume.resume_score else 0.0,
            "extracted_text": str(latest_resume.extracted_text) if latest_resume.extracted_text else "",
            "skills_detected": _safe_parse_list(str(latest_resume.skills_detected) if latest_resume.skills_detected else None),
            "experience_years": _parse_experience(latest_resume.experience_years),
            "education_summary": _safe_parse_string(str(latest_resume.education_summary) if latest_resume.education_summary else None),
            "projects_summary": _safe_parse_string(str(latest_resume.projects_summary) if latest_resume.projects_summary else None),
            "certifications": str(latest_resume.certifications) if latest_resume.certifications else "",
        }
        
    # Fetch Audit Trail (Security & Admin logs)
    audit_logs = []
    sec_logs = db.query(SecurityEventLog).filter(SecurityEventLog.target_email == c.email).all()
    admin_logs = db.query(AdminActivityLog).filter(AdminActivityLog.target == c.email).all()
    
    for sl in sec_logs:
        audit_logs.append({
            "type": "SECURITY",
            "timestamp": sl.timestamp,
            "action": sl.event_type,
            "details": f"IP: {sl.ip_address}"
        })
    for al in admin_logs:
        audit_logs.append({
            "type": "ADMIN",
            "timestamp": al.timestamp,
            "action": al.action_type,
            "details": f"By: {al.admin_email}"
        })
        
    # Also add a registration event
    audit_logs.append({
        "type": "SYSTEM",
        "timestamp": c.registration_date,
        "action": "CANDIDATE_REGISTERED",
        "details": "Account created."
    })
    
    audit_logs.sort(key=lambda x: x["timestamp"], reverse=True)

    if latest:
        iv = _build_interview_dict(latest, getattr(latest, "report", None))
        iv["recording_url"] = latest.recording_url
        iv["video_clip_url"] = latest.video_clip_url
        iv["duration_seconds"] = latest.duration_seconds
    else:
        iv = {
            "technical_score": 0, "eq_score": 0, "confidence_score": 0, "communication_score": 0,
            "problem_solving_score": 0, "role_alignment_score": 0, "professionalism_score": 0, "learning_potential_score": 0,
            "behavioral_score": 0, "fluency_score": 0, "overall_score": 0,
            "summary": "Interview pending.", "strengths": [], "weaknesses": [],
            "overall_rating": "N/A", "hiring_recommendation": "N/A", "readiness_score": 0, "hiring_decision": "PENDING",
            "proctoring_warnings": 0, "proctoring_logs": [], "integrity_score": 100, "integrity_verdict": "CLEAN",
            "integrity_signals": [], "posture_score": 100, "movement_score": 100,
            "eye_tracking_score": 100, "authenticity_score": 100, "environment_score": 100,
            "termination_reason": None, "grade": "N/A",
            "recording_url": None, "video_clip_url": None, "duration_seconds": 0,
        }
    return {
        "candidate": c_dict,
        "interview": iv,
        "resume": resume_dict,
        "audit_logs": audit_logs
    }


@app.get("/api/reports/{candidate_id}/all", tags=["Data"])
async def get_all_candidate_reports(candidate_id: str, db: Session = Depends(get_db), _auth: dict = Depends(require_candidate_or_admin)):
    """
    Return ALL interview sessions for a candidate as a list, newest first.
    Each item includes session timestamp, attempt number, grade, termination_reason,
    and full integrity data. Used by admin report section.
    """
    c = db.query(Candidate).filter_by(candidate_id=candidate_id).first()
    if not c: raise HTTPException(status_code=404, detail="Candidate not found")

    interviews = sorted(c.interviews, key=lambda i: i.started_at)  # type: ignore  oldest first for numbering
    total = len(interviews)

    c_dict = {
        "id": c.candidate_id,
        "name": c.name,
        "email": c.email,
        "total_attempts": total,
    }

    all_ivs = []
    for idx, iv_session in enumerate(reversed(interviews), start=1):  # newest first, attempt# reversed
        attempt_number = total - idx + 1  # newest = highest attempt number
        report = getattr(iv_session, "report", None)
        iv_dict = _build_interview_dict(iv_session, report)
        iv_dict["attempt_number"] = attempt_number
        iv_dict["attempt_label"] = f"Attempt #{attempt_number}" if total > 1 else "Interview"
        iv_dict["job_role"] = iv_session.role.role_name if iv_session.role else ""
        all_ivs.append(iv_dict)

    return {"candidate": c_dict, "interviews": all_ivs}

# ── Data: Dashboard ───────────────────────────────────────────────────────

@app.get("/api/dashboard", response_model=DashboardData, tags=["Data"])
async def get_dashboard_data(db: Session = Depends(get_db)):
    total = db.query(Candidate).filter(Candidate.invitation_status == "Confirmed").count()
    # BUG-16 fix: Count only COMPLETED sessions (completed_at IS NOT NULL), not all sessions
    complete = db.query(InterviewSession).filter((InterviewSession.completed_at.isnot(None)) | (InterviewSession.overall_score > 0)).count()
    
    interviews = db.query(InterviewSession).all()
    avg_tech = sum(i.technical_score for i in interviews) / len(interviews) if interviews else 0.0  # type: ignore
    avg_conf = sum(i.confidence_score for i in interviews) / len(interviews) if interviews else 0.0  # type: ignore
    
    recent = db.query(Candidate).filter(Candidate.invitation_status == "Confirmed").order_by(Candidate.registration_date.desc()).limit(5).all()
    
    recent_dicts = []
    for r in recent:
        r_interviews = sorted(r.interviews, key=lambda i: i.started_at, reverse=True)  # type: ignore
        r_latest = r_interviews[0] if r_interviews else None
        
        job_role_name = ""
        if r_latest and getattr(r_latest, "role", None):
            job_role_name = r_latest.role.role_name
        elif r.role_id:
            role_obj = db.query(JobRole).filter(JobRole.role_id == r.role_id).first()
            if role_obj:
                job_role_name = role_obj.role_name
            else:
                job_role_name = r.role_id

        recent_dicts.append({
            "name": r.name,
            "job_role": job_role_name,
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
        except Exception:
            pass


# ════════════════════════════════════════════════════════════════════════════
# ── SCHEDULING MODULE (Phase 1 — Candidate Portal Upgrade) ──────────────
# ════════════════════════════════════════════════════════════════════════════

from services.email_service import send_otp_email, send_notification_email




# ── Slot Models (Pydantic) ────────────────────────────────────────────────

class SlotCreateRequest(BaseModel):
    date: str           # "2026-06-20"
    start_time: str     # "09:00"
    end_time: str       # "09:45"
    timezone: str = "Asia/Kolkata"
    max_bookings: int = 1

class BookSlotRequest(BaseModel):
    slot_id: str
    candidate_id: str

class CustomBookSlotRequest(BaseModel):
    candidate_id: str
    date: str
    start_time: str
    timezone: str = "Asia/Kolkata"

class RescheduleRequest(BaseModel):
    new_slot_id: str


# ── Admin: Create Slots ───────────────────────────────────────────────────

@app.post("/api/admin/slots", tags=["Scheduling"])
async def create_slot(data: SlotCreateRequest, db: Session = Depends(get_db)):
    """Admin creates an available interview slot."""
    slot_id = generate_enterprise_id(db, "SLT")
    slot = InterviewSlot(
        slot_id=slot_id,
        date=data.date,
        start_time=data.start_time,
        end_time=data.end_time,
        timezone=data.timezone,
        max_bookings=data.max_bookings,
        is_active=True,
    )
    db.add(slot)
    db.commit()
    return {"slot_id": slot_id, "status": "created"}

@app.get("/api/admin/slots", tags=["Scheduling"])
async def get_all_slots(db: Session = Depends(get_db)):
    """Admin: get all slots with booking counts."""
    slots = db.query(InterviewSlot).filter_by(is_active=True).order_by(InterviewSlot.date, InterviewSlot.start_time).all()
    result = []
    for s in slots:
        booked = len([b for b in s.bookings if b.status == "BOOKED"])
        result.append({
            "slot_id": s.slot_id,
            "date": s.date,
            "start_time": s.start_time,
            "end_time": s.end_time,
            "timezone": s.timezone,
            "max_bookings": s.max_bookings,
            "booked_count": booked,
            "available": s.max_bookings - booked,
            "is_full": booked >= s.max_bookings,
            "bookings": [
                {"candidate_id": b.candidate_id, "status": b.status, "booked_at": b.booked_at}
                for b in s.bookings
            ]
        })
    return result

@app.get("/api/admin/bookings", tags=["Admin", "Scheduling"])
async def admin_get_all_bookings(db: Session = Depends(get_db)):
    """Admin views all scheduled candidate bookings."""
    bookings = db.query(SlotBooking).all()
    result = []
    for b in bookings:
        candidate = b.candidate
        slot = b.slot
        if candidate and slot:
            result.append({
                "booking_id": b.booking_id,
                "status": b.status,
                "booked_at": b.booked_at,
                "candidate": {
                    "candidate_id": candidate.candidate_id,
                    "name": candidate.name,
                    "email": candidate.email,
                    "role_applied": candidate.role_applied,
                    "status": candidate.status
                },
                "slot": {
                    "slot_id": slot.slot_id,
                    "date": slot.date,
                    "start_time": slot.start_time,
                    "timezone": slot.timezone
                }
            })
    # Sort by date
    result.sort(key=lambda x: (x["slot"]["date"], x["slot"]["start_time"]))
    return result

@app.delete("/api/admin/slots/{slot_id}", tags=["Scheduling"])
async def delete_slot(slot_id: str, db: Session = Depends(get_db)):
    """Admin deactivates a slot."""
    slot = db.query(InterviewSlot).filter_by(slot_id=slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")
    slot.is_active = False  # type: ignore
    db.commit()
    return {"status": "deactivated"}


# ── Candidate: View & Book Slots ─────────────────────────────────────────

@app.get("/api/slots/available", tags=["Scheduling"])
async def get_available_slots(db: Session = Depends(get_db)):
    """Candidate: list all available (not full) future slots."""
    from datetime import date as dt_date
    today = dt_date.today().isoformat()
    slots = db.query(InterviewSlot).filter(
        InterviewSlot.is_active == True,
        InterviewSlot.date >= today
    ).order_by(InterviewSlot.date, InterviewSlot.start_time).all()

    result = []
    for s in slots:
        booked = len([b for b in s.bookings if b.status == "BOOKED"])
        if booked < s.max_bookings:
            result.append({
                "slot_id": s.slot_id,
                "date": s.date,
                "start_time": s.start_time,
                "end_time": s.end_time,
                "timezone": s.timezone,
                "available": s.max_bookings - booked,
            })
    return result

@app.post("/api/slots/custom-book", tags=["Scheduling"])
async def custom_book_slot(data: CustomBookSlotRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Candidate books an interview slot on their own selected date/time."""
    
    # Check if candidate already has an active booking
    existing = db.query(SlotBooking).filter_by(candidate_id=data.candidate_id, status="BOOKED").first()
    if existing:
        raise HTTPException(status_code=409, detail="You already have a scheduled interview. Please cancel it first to reschedule.")

    # Reject any slot whose start time has already passed (IST). e.g. at 3:01 PM
    # a candidate must not be able to book the 3:00 PM slot. The frontend sends
    # start_time like "3:00 PM"; compare it against the current IST wall clock.
    from datetime import datetime as _dt, timedelta as _td, timezone as _tz
    try:
        slot_dt = _dt.strptime(f"{data.date} {data.start_time}", "%Y-%m-%d %I:%M %p")
    except Exception:
        try:
            slot_dt = _dt.strptime(f"{data.date} {data.start_time}", "%Y-%m-%d %H:%M")
        except Exception:
            slot_dt = None
    if slot_dt is not None:
        ist_now = (_dt.now(_tz.utc) + _td(hours=5, minutes=30)).replace(tzinfo=None)
        if slot_dt <= ist_now:
            raise HTTPException(status_code=400, detail="That time has already passed. Please choose a later slot.")

    candidate = db.query(Candidate).filter_by(candidate_id=data.candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    # SHARED SLOTS: multiple candidates may book the SAME interview slot.
    # Self-scheduled AI interviews run in parallel, so a given date/time has no
    # exclusivity conflict. Reuse an existing slot for this exact date/time/timezone
    # (so every candidate who picks it shares one slot) and only create a new slot
    # when none exists yet. A generous group capacity keeps it effectively open.
    GROUP_CAPACITY = 100
    slot = db.query(InterviewSlot).filter_by(
        date=data.date,
        start_time=data.start_time,
        timezone=data.timezone,
        is_active=True,
    ).first()
    if slot:
        slot_id = slot.slot_id
        # Make sure the shared slot can hold more candidates.
        if (slot.max_bookings or 1) < GROUP_CAPACITY:
            slot.max_bookings = GROUP_CAPACITY  # type: ignore
    else:
        slot_id = generate_enterprise_id(db, "SLT")
        slot = InterviewSlot(
            slot_id=slot_id,
            date=data.date,
            start_time=data.start_time,
            end_time="TBD",
            timezone=data.timezone,
            max_bookings=GROUP_CAPACITY,
            is_active=True
        )
        db.add(slot)

    booking_id = generate_enterprise_id(db, "BKG")
    booking = SlotBooking(
        booking_id=booking_id,
        slot_id=slot_id,
        candidate_id=data.candidate_id,
        status="BOOKED"
    )
    db.add(booking)
    db.commit()

    # Send confirmation email in background
    def send_booking_confirmation():
        html = f"""
        <html><body style="font-family:Arial,sans-serif;background:#f8fafc;padding:20px;color:#0f172a;">
        <div style="max-width:500px;margin:0 auto;background:#fff;padding:30px;border-radius:12px;border:1px solid #e2e8f0;border-top:4px solid #dc2626;">
          <h2 style="color:#dc2626;font-weight:900;text-align:center;letter-spacing:1px;">Sterling E-Mobility</h2>
          <p style="text-align:center;color:#64748b;font-size:12px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;margin-bottom:20px;">Interview Confirmed</p>
          <p>Hello <strong>{candidate.name}</strong>,</p>
          <p>Your interview has been scheduled successfully! 🎉</p>
          <div style="background:#f1f5f9;padding:20px;border-radius:8px;margin:20px 0;text-align:center;">
            <p style="font-size:18px;font-weight:bold;color:#1e293b;margin:0;">📅 {slot.date}</p>
            <p style="font-size:24px;font-weight:900;color:#dc2626;margin:8px 0;">{slot.start_time}</p>
            <p style="font-size:12px;color:#64748b;margin:0;">{slot.timezone}</p>
          </div>
          <p style="color:#475569;">Please ensure your camera, microphone, and internet connection are ready before joining.</p>
          <p style="color:#475569;">You will receive a reminder 24 hours and 1 hour before your interview.</p>
          <p style="font-size:12px;color:#94a3b8;text-align:center;margin-top:30px;">Need to reschedule? Log in to your Sterling portal and visit "My Interview".</p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;"/>
          <p style="font-size:12px;color:#94a3b8;text-align:center;">Sterling AI Interview Engine © Sterling E-Mobility</p>
        </div></body></html>
        """
        if candidate.email:
            send_notification_email(str(candidate.email), str(candidate.name), f"✅ Interview Confirmed — {slot.date} at {slot.start_time}", html)

    background_tasks.add_task(send_booking_confirmation)

    return {
        "booking_id": booking_id,
        "slot": {"date": slot.date, "start_time": slot.start_time, "timezone": slot.timezone},
        "status": "BOOKED",
        "message": "Interview scheduled! Check your email for confirmation."
    }

@app.post("/api/slots/book", tags=["Scheduling"])
async def book_slot(data: BookSlotRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Candidate books an interview slot."""
    # RACE-CONDITION FIX: lock the slot row for the duration of this transaction so
    # two concurrent requests can't both pass the capacity check and overbook the
    # slot. On PostgreSQL this emits SELECT ... FOR UPDATE; on SQLite it is a safe
    # no-op. The capacity count is taken with a fresh query (not the cached
    # relationship) so it reflects committed rows.
    slot = db.query(InterviewSlot).filter_by(slot_id=data.slot_id, is_active=True).with_for_update().first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found or no longer available")

    booked_count = db.query(SlotBooking).filter_by(slot_id=data.slot_id, status="BOOKED").count()
    if booked_count >= slot.max_bookings:
        db.rollback()
        raise HTTPException(status_code=409, detail="This slot is already full. Please choose another.")

    # Check if candidate already has an active booking
    existing = db.query(SlotBooking).filter_by(candidate_id=data.candidate_id, status="BOOKED").first()
    if existing:
        raise HTTPException(status_code=409, detail="You already have a scheduled interview. Please cancel it first to reschedule.")

    candidate = db.query(Candidate).filter_by(candidate_id=data.candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    booking_id = generate_enterprise_id(db, "BKG")
    booking = SlotBooking(
        booking_id=booking_id,
        slot_id=data.slot_id,
        candidate_id=data.candidate_id,
        status="BOOKED"
    )
    db.add(booking)
    db.commit()

    # Send confirmation email in background
    def send_booking_confirmation():
        html = f"""
        <html><body style="font-family:Arial,sans-serif;background:#f8fafc;padding:20px;color:#0f172a;">
        <div style="max-width:500px;margin:0 auto;background:#fff;padding:30px;border-radius:12px;border:1px solid #e2e8f0;border-top:4px solid #dc2626;">
          <h2 style="color:#dc2626;font-weight:900;text-align:center;letter-spacing:1px;">Sterling E-Mobility</h2>
          <p style="text-align:center;color:#64748b;font-size:12px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;margin-bottom:20px;">Interview Confirmed</p>
          <p>Hello <strong>{candidate.name}</strong>,</p>
          <p>Your interview has been scheduled successfully! 🎉</p>
          <div style="background:#f1f5f9;padding:20px;border-radius:8px;margin:20px 0;text-align:center;">
            <p style="font-size:18px;font-weight:bold;color:#1e293b;margin:0;">📅 {slot.date}</p>
            <p style="font-size:24px;font-weight:900;color:#dc2626;margin:8px 0;">{slot.start_time} — {slot.end_time}</p>
            <p style="font-size:12px;color:#64748b;margin:0;">{slot.timezone}</p>
          </div>
          <p style="color:#475569;">Please ensure your camera, microphone, and internet connection are ready before joining.</p>
          <p style="color:#475569;">You will receive a reminder 24 hours and 1 hour before your interview.</p>
          <p style="font-size:12px;color:#94a3b8;text-align:center;margin-top:30px;">Need to reschedule? Log in to your Sterling portal and visit "My Interview".</p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;"/>
          <p style="font-size:12px;color:#94a3b8;text-align:center;">Sterling AI Interview Engine © Sterling E-Mobility</p>
        </div></body></html>
        """
        if candidate.email:
            send_notification_email(str(candidate.email), str(candidate.name), f"✅ Interview Confirmed — {slot.date} at {slot.start_time}", html)

    background_tasks.add_task(send_booking_confirmation)

    return {
        "booking_id": booking_id,
        "slot": {"date": slot.date, "start_time": slot.start_time, "end_time": slot.end_time, "timezone": slot.timezone},
        "status": "BOOKED",
        "message": "Interview scheduled! Check your email for confirmation."
    }

@app.get("/api/candidates/{candidate_id}/booking", tags=["Scheduling"])
async def get_candidate_booking(candidate_id: str, db: Session = Depends(get_db), _auth: dict = Depends(require_candidate_or_admin)):
    """Get the candidate's current active booking, if any."""
    booking = db.query(SlotBooking).filter_by(candidate_id=candidate_id, status="BOOKED").first()
    if not booking:
        return {"booking": None}
    slot = booking.slot
    return {
        "booking": {
            "booking_id": booking.booking_id,
            "status": booking.status,
            "booked_at": booking.booked_at,
            "slot": {
                "date": slot.date,
                "start_time": slot.start_time,
                "end_time": slot.end_time,
                "timezone": slot.timezone
            }
        }
    }

@app.patch("/api/bookings/{booking_id}/cancel", tags=["Scheduling"])
async def cancel_booking(booking_id: str, db: Session = Depends(get_db)):
    """Candidate cancels their booking to reschedule."""
    booking = db.query(SlotBooking).filter_by(booking_id=booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.status != "BOOKED":
        raise HTTPException(status_code=409, detail="Booking is not in BOOKED state")
    booking.status = "CANCELLED"  # type: ignore
    db.commit()
    return {"status": "cancelled"}

@app.patch("/api/bookings/{booking_id}/noshow", tags=["Scheduling"])
async def mark_no_show(booking_id: str, db: Session = Depends(get_db)):
    """System/admin marks a candidate as no-show if they missed their slot."""
    booking = db.query(SlotBooking).filter_by(booking_id=booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    booking.status = "NO_SHOW"  # type: ignore
    db.commit()

    # Notify candidate
    candidate = db.query(Candidate).filter_by(candidate_id=booking.candidate_id).first()
    if candidate:
        slot = booking.slot
        FRONTEND_URL = os.getenv("FRONTEND_URL", "https://ai-interview-portal.vercel.app")
        html = f"""
        <html><body style="font-family:Arial,sans-serif;padding:20px;color:#0f172a;">
        <div style="max-width:500px;margin:0 auto;background:#fff;padding:30px;border-radius:12px;border:1px solid #e2e8f0;border-top:4px solid #f59e0b;">
          <h2 style="color:#f59e0b;font-weight:900;text-align:center;">Interview Missed</h2>
          <p>Hello <strong>{candidate.name}</strong>,</p>
          <p>We noticed you missed your scheduled interview on <strong>{slot.date} at {slot.start_time}</strong>.</p>
          <p>No worries! Please <a href="{FRONTEND_URL}/candidate-login" style="color:#dc2626;font-weight:bold;text-decoration:none;">log back into your Sterling Portal</a> to pick a new interview slot.</p>
          <div style="text-align:center;margin-top:20px;">
            <a href="{FRONTEND_URL}/candidate-login" style="background-color:#dc2626;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;font-weight:bold;display:inline-block;">Reschedule Now</a>
          </div>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;"/>
          <p style="font-size:12px;color:#94a3b8;text-align:center;">Sterling AI Interview Engine © Sterling E-Mobility</p>
        </div></body></html>
        """
        send_notification_email(str(candidate.email), str(candidate.name), "⚠️ You missed your Sterling interview — reschedule now", html)

    return {"status": "no_show_marked"}


# ── Candidate Portal: Profile & Status ─────────────────────────────────────

@app.get("/api/candidates/{candidate_id}/portal", tags=["Candidate Portal"])
async def get_candidate_portal(candidate_id: str, db: Session = Depends(get_db), _auth: dict = Depends(require_candidate_or_admin)):
    """Full candidate portal data: profile, booking, latest interview status."""
    candidate = db.query(Candidate).filter_by(candidate_id=candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    interviews = sorted(candidate.interviews, key=lambda i: i.started_at, reverse=True)  # type: ignore
    latest = interviews[0] if interviews else None

    report = db.query(FinalReport).filter_by(interview_id=latest.interview_id).first() if latest else None
    hiring_decision = getattr(report, "hiring_decision", "PENDING") if report else "PENDING"
    is_completed = bool(latest and (latest.completed_at or (latest.overall_score or 0) > 0))

    # Score tier (for candidate display — no exact score shown)
    global_score = float(latest.overall_score or 0) if latest else 0.0
    if global_score >= 85:
        score_tier = "Exceptional"
    elif global_score >= 70:
        score_tier = "Strong"
    elif global_score >= 55:
        score_tier = "Good"
    elif global_score > 0:
        score_tier = "Needs Development"
    else:
        score_tier = None

    # Booking
    booking = db.query(SlotBooking).filter_by(candidate_id=candidate_id, status="BOOKED").first()
    booking_data = None
    if booking:
        slot = booking.slot
        booking_data = {
            "booking_id": booking.booking_id,
            "date": slot.date,
            "start_time": slot.start_time,
            "end_time": slot.end_time,
            "timezone": slot.timezone,
        }

    # Application status pipeline
    if is_completed and hiring_decision not in ("PENDING", "UNDER_REVIEW", "IN_PROGRESS"):
        app_stage = "DECISION_MADE"
    elif is_completed:
        app_stage = "UNDER_REVIEW"
    elif latest:
        app_stage = "INTERVIEW_SCHEDULED" if booking_data else "INTERVIEW_PENDING"
    elif candidate.interviews:
        app_stage = "APPLIED"
    else:
        app_stage = "REGISTERED"

    # Resume
    resume = db.query(Resume).filter_by(candidate_id=candidate_id).order_by(Resume.resume_id.desc()).first()

    # Attempt history (limited info for candidate)
    attempts = []
    for idx, iv in enumerate(interviews[:5]):
        iv_report = db.query(FinalReport).filter_by(interview_id=iv.interview_id).first()
        iv_score = float(iv.overall_score or 0)
        if iv_score >= 85: tier = "Exceptional"
        elif iv_score >= 70: tier = "Strong"
        elif iv_score >= 55: tier = "Good"
        elif iv_score > 0: tier = "Needs Development"
        else: tier = None
        attempts.append({
            "attempt_number": idx + 1,
            "date": iv.started_at[:10] if iv.started_at else None,
            "score_tier": tier,
            "is_completed": bool(iv.completed_at or iv_score > 0),
            "job_role": iv.role.role_name if iv.role else None,
        })

    # Determine the actual job role for the candidate
    current_job_role_name = None
    if latest and latest.role:
        current_job_role_name = latest.role.role_name
    elif candidate.role_id:
        role_record = db.query(JobRole).filter_by(role_id=candidate.role_id).first()
        if role_record:
            current_job_role_name = role_record.role_name
        else:
            current_job_role_name = candidate.role_id # fallback in case role_id is literally the string name

    return {
        "candidate": {
            "id": candidate.candidate_id,
            "name": candidate.name,
            "email": candidate.email,
            "phone": candidate.phone,
            "kyc_verified": candidate.kyc_verified,
            "registered_at": candidate.registration_date,
            "experience_level": candidate.experience_level,
            "key_skills": candidate.key_skills,
            "work_mode": candidate.work_mode,
            "expected_salary": candidate.expected_salary,
            "linkedin_url": candidate.linkedin,
            "github_url": candidate.github,
            "portfolio_url": candidate.portfolio,
        },
        "application": {
            "stage": app_stage,
            "job_role": current_job_role_name,
            "is_completed": is_completed,
            "score_tier": score_tier,
            "hiring_decision_visible": hiring_decision if hiring_decision in ("HIRED", "SHORTLISTED", "REJECTED") else None,
        },
        "booking": booking_data,
        "resume": {
            "uploaded": bool(resume),
            "resume_score": float(resume.resume_score or 0) if resume else 0,  # type: ignore
        },
        "attempts": attempts,
        "interview_id": latest.interview_id if latest else None,
    }

class ChatRequest(BaseModel):
    message: str

@app.get("/api/admin/ai-learning-stats", tags=["Admin"])
async def get_ai_learning_statistics(_admin: dict = Depends(require_admin)):
    """
    Returns the comprehensive training log of the AI Interviewer.
    Requires Admin authorization.
    """
    try:
        from services.ai_learning import get_all_stats
        stats = get_all_stats()
        return {"status": "success", "data": stats}
    except Exception as e:
        logger.error(f"Failed to fetch AI learning stats: {e}")
        return {"status": "error", "message": str(e), "data": {
            "total_lessons_learned": 0,
            "last_training_time": None,
            "active_rules": [],
            "historical_log": []
        }}

@app.post("/api/assistant/chat")
async def assistant_chat(req: ChatRequest):
    try:
        from services.gemini_service import ask_assistant
        reply = await ask_assistant(req.message)
        return {"reply": reply}
    except Exception as e:
        logger.error(f"Chatbot error: {e}")
        return {"reply": "Sorry, I am having trouble connecting to my neural net."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("Main:app", host="0.0.0.0", port=8000, reload=True)
