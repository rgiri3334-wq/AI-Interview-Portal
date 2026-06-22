# Security Remediation Checklist

This file tracks the fixes applied during the security & architecture audit and the
manual actions you still need to take. **Code-level fixes are done; the items under
"Action required by you" cannot be done from code and must be performed in provider
consoles.**

## ⚠️ Action required by you (rotate exposed secrets)

The following credentials were exposed in `.env` and must be **rotated/regenerated**
at the source. Rotating in the provider console is the only thing that actually
invalidates the leaked value — editing this repo does not.

- [ ] **Gemini API key** — Google AI Studio → revoke old key, create new, update `GEMINI_API_KEY`.
- [ ] **Groq API key** — Groq console → delete old key, create new, update `GROQ_API_KEY`.
- [ ] **ElevenLabs API key** — ElevenLabs profile → regenerate, update `ELEVENLABS_API_KEY`.
- [ ] **OpenAI API key** — OpenAI dashboard → revoke `sk-proj-...`, create new, update `OPENAI_API_KEY`.
- [ ] **Supabase service key** — Supabase → Project Settings → API → roll the service key, update `SUPABASE_KEY`.
- [ ] **Supabase/Postgres DB password** — reset the database password and update `DATABASE_URL`.
- [ ] **SMTP password** — regenerate the Gmail app password, set `SMTP_PASS`.
- [ ] After rotating, confirm the leaked values appear in **no** git history. If they
      were ever committed, scrub history (e.g. `git filter-repo`) and force-push.

## ✅ Fixed in code

- **JWT secret** now read from `JWT_SECRET` env (loud warning + ephemeral fallback if unset).
- **Master admin password** no longer hardcoded; read from `MASTER_ADMIN_PASSWORD`, or a
  random one is generated and logged once. (Old default `Betheonly@1` removed.)
- **Candidate/report endpoints authenticated** via `require_admin` /
  `require_candidate_or_admin` dependencies (candidate, report, portal, booking, delete).
- **KYC bypass removed** — verification now reflects the real OCR name-match score
  against `KYC_MATCH_THRESHOLD` (default 60) instead of hardcoded `True`.
- **OTP no longer logged in plaintext** — only the masked identifier/purpose is logged.
- **CORS** restricted to `CORS_ALLOW_ORIGINS` (no wildcard with credentials); manual
  CORS headers only reflect allow-listed origins.
- **KYC images / recordings** no longer served via public `StaticFiles`; now behind an
  authenticated `/api/recordings/{filename}` endpoint with path-traversal protection.
  `recordings/` and `temp_recordings/` added to `.gitignore`.
- **Global exception handler** no longer leaks `str(exc)`; returns a generic message +
  correlation `error_id` (full detail logged server-side).
- **Duplicate routes removed** — duplicate `DELETE /api/candidates/{id}` and
  `POST /api/interviews/{id}/recording` definitions consolidated.
- **Duplicate Pydantic models removed** — old `SaveInterviewRequest` and duplicate
  `AdminQuestion`.
- **Slot booking race condition** — slot row locked with `SELECT ... FOR UPDATE` and
  capacity re-checked in the same transaction.
- **Fabricated telemetry removed** — `api_requests_count` and `ai_tokens_generated` now
  use real values instead of `random`.
- **DB session leak in `init_db()`** fixed (uses `SessionLocal()` with `try/finally`).
- **Temp recording cleanup** — abandoned chunk-upload temp files swept by TTL; final
  upload wrapped in `try/finally`.
- **Threading → BackgroundTasks** — invite/resend/verify emails now use FastAPI's
  request-lifecycle background tasks.
- **Dead code removed** — unused `sort_key` in `/api/leaderboard`.
- **AI plagiarism fairness** — `zero_filler_words` no longer penalizes the score
  (weight 0); recorded as informational only.
- **Branding** — `SPARK-HIRE`/`Spark-Hire` → `Sterling E-Mobility`/`Sterling`; logo URL
  is now configurable via `LOGO_URL`.
- **`.gitignore`** recreated as clean UTF-8; `database.db` deleted (contained PII).

## Known limitations / follow-ups

- **Rate limiting is still in-memory** (per-process dicts) and resets on restart and
  doesn't share state across workers. For production, move to a shared store (e.g.
  Redis) or an API-gateway rate limiter. Tracked but not changed here to avoid adding a
  new infra dependency.
- **`Main.py` is a "god object" (~4k lines).** Recommended to split into FastAPI
  routers (`auth`, `candidates`, `interviews`, `scheduling`, `admin`, `ai`). This is a
  larger refactor left as a follow-up to avoid destabilizing behavior in this pass.
