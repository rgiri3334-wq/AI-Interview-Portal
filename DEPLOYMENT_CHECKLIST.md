# Deployment Checklist — Sterling Interview Portal

Stack: **Vercel** (frontend) · **Render** (backend) · **Supabase** (Postgres + Storage).
You deploy; this is everything needed to make it work end-to-end.

---

## 0. Before anything: rotate the leaked secrets
The keys in `.env` were exposed. Rotate them at each provider and use the NEW
values below (see `SECURITY_REMEDIATION.md`): Gemini, Groq, ElevenLabs, OpenAI,
Supabase service key, and the Supabase DB password.

---

## 1. Supabase
- [ ] Project is up; copy the **session-pooler** connection string → `DATABASE_URL`
      (URL-encode special chars, e.g. `@` → `%40`).
- [ ] Copy **Project URL** → `SUPABASE_URL` and **service key** → `SUPABASE_KEY`.
- [ ] Create two **Storage buckets** (the app uploads to these):
      - `kyc-images`
      - `interview-recordings`
      (If missing, uploads fall back to the authenticated `/api/recordings` endpoint.)
- [ ] Tables auto-create on first backend boot (`init_db()` runs `create_all`).

## 2. Render (backend)
Render reads `render.yaml`. Set every `sync: false` var in the dashboard:
- [ ] `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_KEY`
- [ ] `GEMINI_API_KEY`, `GROQ_API_KEY`, `OPENAI_API_KEY`, `ELEVENLABS_API_KEY`
- [ ] `MASTER_ADMIN_PASSWORD` (you choose; used to seed the master admin —
      login email is `sparkhire.sterling@gmail.com`)
- [ ] `CORS_ALLOW_ORIGINS` = your Vercel URL, e.g. `https://<app>.vercel.app`
- [ ] `FRONTEND_URL` = same Vercel URL (also used in email links)
- [ ] `BACKEND_URL` = this Render service URL, e.g. `https://<svc>.onrender.com`
- [ ] `SMTP_USER`, `SMTP_PASS` (Gmail App Password, not the account password)
- [ ] `JWT_SECRET` — **auto-generated** by Render (`generateValue: true`); leave it.
- Start command (already in render.yaml): `uvicorn Main:app --host 0.0.0.0 --port $PORT`
- System deps (Tesseract/FFmpeg/OpenCV libs) are in the `Dockerfile`; if you use
  Render's native Python runtime instead, add an aptfile or use the Docker option.

## 3. Vercel (frontend)
- [ ] **Root Directory** = `frontend`
- [ ] Framework = Vite · Build = `npm run build` · Output = `dist`
- [ ] Env vars (also committed in `frontend/.env.production` — set here too to be safe):
      - `VITE_API_URL` = your Render backend URL (`https://<svc>.onrender.com`)
      - `VITE_WS_URL`  = `wss://<svc>.onrender.com`
- [ ] SPA routing: `frontend/vercel.json` already rewrites all routes to `index.html`.

## 4. After deploy — smoke test
- [ ] Open the Vercel URL; admin login at `sparkhire.sterling@gmail.com` +
      `MASTER_ADMIN_PASSWORD`.
- [ ] Check the Render log line `CORS allow-list: [...]` includes your Vercel URL.
- [ ] Start a live interview: avatar loads (`model.glb`), greets with a wave,
      speaks in a male voice, mic transcribes, questions advance.
- [ ] Confirm browser console shows API calls going to the Render URL (not localhost).

---

## Notes / honest caveats
- I could not run a full build here (the sandbox can't render 3D or reliably
  compile the large files over the cloud-synced mount), so do one local
  `npm run build` / `uvicorn Main:app` pass if you want belt-and-suspenders before
  pushing. All edited code regions were verified individually.
- `requirements.txt` is unpinned — Render installs latest. If a future release
  breaks the build, pin versions.
- Lip-sync needs a mouth blendshape on the avatar (see `AVATAR_INTEGRATION_NOTES.md`).
