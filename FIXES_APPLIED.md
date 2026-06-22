# Fixes Applied — Master Audit Consolidation

## Fixed now (code)
| ID | Flaw | Fix | Why (reasoning) | File(s) |
| :-- | :-- | :-- | :-- | :-- |
| 2 | Arbitrary client-side JS exec (`new Function(code)()`) | Run candidate JS in an **isolated Web Worker** + 5s timeout | A Worker has no DOM/React/`sessionStorage` access, so the candidate can't steal the token or tamper with the proctored session. Keeps the "Run" feature working. | `LiveInterview.jsx` |
| 4 | Stored-XSS via `dangerouslySetInnerHTML` of the AI's `evaluated_answer` | Added `sanitizeHighlightHtml()` — DOMParser whitelist that keeps only `<span class>` and escapes everything else | The only legitimate markup is the highlight spans; escaping the rest neutralizes `<script>`/`<img onerror>` without adding a new dependency (can't reliably `npm i` here). | `Report.jsx` |
| 5 | 13 bare `except:` (Main) + 1 (gemini) | Converted all to `except Exception:` | Bare `except` also swallows `KeyboardInterrupt`/`SystemExit`. Pure token swap = zero indentation risk. | `Main.py`, `gemini_service.py` |
| 12 | Dead `moviepy` dependency | Removed from `requirements.txt` | Its only consumer route was deleted earlier; it pulled ffmpeg/imageio and slowed Render builds. | `requirements.txt` |
| 14 | OTP expiry mismatch (email says 10 min, code 30 min) | Set code to **600s (10 min)** | Match the user-facing promise and shrink the validity window (more secure). | `Main.py` |
| 18 | `print()` instead of logger | Switched Supabase-init error to `logging.getLogger(...).error` | Consistent structured logging. (`logger` global isn't defined yet at that point, so used `logging.getLogger`.) | `Main.py` |
| 19 | `console.log` on every API request in prod | Guarded behind `import.meta.env.DEV` | Removes prod console noise / info leak; keeps dev visibility. | `apiClient.js` |
| 16 | Dead Vite template files | Deleted `counter.ts`, `main.ts` | Nothing imports them (entry is `main.jsx`). | — |

## Deliberately deferred (with reason)
| ID | Flaw | Why deferred |
| :-- | :-- | :-- |
| 1 | Exposed API keys | **Not a code fix** — must be rotated in each provider console. |
| 3 | Email blocked on Render free tier | **Config, not code** — set `BREVO_API_KEY` on Render (code already supports it). |
| 6 | `adminToken` in sessionStorage | Moving to httpOnly cookies is a **full auth-flow refactor** that would break the current working login; needs careful redesign + testing. |
| 7 | String timestamps → DateTime | **Risky migration** on a live Supabase with existing string rows; needs a data migration. High regression risk. |
| 8 | In-memory rate limiting | Requires **new infra (Redis)**; out of scope without an instance. |
| 9 | `Main.py` god object | **Massive refactor**, highest regression risk; unsafe to do blind without a runnable test suite. |
| 11 | Unpinned `requirements.txt` | Needs a **known-good install** to capture exact working versions; pinning blind could break the build. |
| 13 | `localhost:8000` fallbacks | Intentional for **local dev**; production is already handled by `.env.production`. Making it "fail loud" would break dev. |
| 15 | Re-register `IntegrityError` | Real but **moderate**; the fix touches the OTP/registration DB path and I can't compile-verify `Main.py` here. Low-risk to do next with you watching. |
| 17 | "Dead" hooks | **NOT dead** — `useAIVoice` is used by `InterviewPrepKit.jsx`. Kept all three. |
| 20 | Type-check pass | Can't run pyrefly/tsc in this environment. |
| 21 | Unused 3D assets | `counter.ts`/`main.ts` removed; the two `.glb` files are cloud-locked on the mount — **delete `model.glb` (root) and `frontend/public/avatar.glb` manually**. |

## Verification
- New JS logic (worker sandbox + sanitizer) parses cleanly under a real Linux esbuild.
- `Main.py` / `gemini_service.py` edits were exact-match token swaps; py_compile parsed past all of them (only the mount-truncated file tail errors).
- Could not run a full app build here — do one `npm run build` + `uvicorn Main:app` locally before pushing.
