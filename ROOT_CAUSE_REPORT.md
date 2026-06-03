# ROOT CAUSE REPORT

## Error Signature
```
:8000/api/dashboard:1 Failed to load resource: net::ERR_CONNECTION_REFUSED
TypeError: Failed to fetch at fetchConfigs()
```

## Diagnostic Breakdown
Based on an exhaustive audit of the `Main.py` routes, frontend API client, and network bindings, the `net::ERR_CONNECTION_REFUSED` error stems from a total lack of backend server availability at the TCP layer.

### Primary Root Cause: The Backend Was Offline
When diagnostics began, a `netstat` scan of port `8000` revealed **no listening processes**. Despite the user's `run.py` terminal indicating that the backend was started, the underlying `uvicorn` process had silently exited or crashed, while the terminal remained open blocking on the active `vite` frontend process.

**Why did Uvicorn crash silently in the user's session?**
Manual execution of `python -m uvicorn Main:app --reload` successfully booted the server without syntax errors, missing routes, or dependency issues. Therefore, the user's crash was likely caused by a **transient port collision** (e.g., an orphaned Python process was temporarily holding port 8000 when `run.py` was executed, causing `uvicorn` to throw an `[Errno 10048] Address already in use` error and exit). Because `run.py` does not stream the backend's `stderr` visibly if the terminal focuses on Vite, this failure was obfuscated.

### Secondary Contributing Factor: IPv6 `localhost` Resolution
The frontend explicitly targets `http://localhost:8000`. By default, Uvicorn binds exclusively to `127.0.0.1` (IPv4). Modern Chromium-based browsers attempt to resolve `localhost` to `[::1]` (IPv6) first. If the backend is running but bound only to IPv4, the browser can instantly reject the connection as `ERR_CONNECTION_REFUSED` before attempting a fallback.

## Proposed Surgical Fix
1. **Host Binding**: Modify `run.py` to enforce Uvicorn binding to `0.0.0.0` or `127.0.0.1` explicitly, and align the frontend `.env` to hit `127.0.0.1` directly, bypassing the `localhost` DNS resolution ambiguity entirely.
2. **Process Management**: Restart the Uvicorn server, ensuring port 8000 is clean.

*No architectural or route-level changes are required, as all 5 missing APIs (`/api/dashboard`, `/api/leaderboard`, etc.) are correctly implemented in `Main.py`.*
