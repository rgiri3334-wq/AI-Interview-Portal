# ENVIRONMENT & NETWORK AUDIT

## Port & Host Bindings
- **Backend (FastAPI)**: Configured in `run.py` to start via `uvicorn Main:app --reload`. By default, this binds to `127.0.0.1:8000` (IPv4 localhost).
- **Frontend (Vite/React)**: Configured in `vite.config.js` to start on port `5173`.
- **Frontend Target URL**: Evaluates to `http://localhost:8000`.

## Network Diagnostic Results
- Pre-intervention scan of port `8000` (`netstat -ano | findstr 8000`) yielded **no active listeners**. The backend was functionally offline.
- Test script `test_api.py` execution against `http://127.0.0.1:8000` (after manually starting the server) confirmed the backend is capable of returning `200 OK` (when serving valid endpoints).
- Python's `urllib` successfully resolves and connects to `http://localhost:8000/api/dashboard` when the server is active, but browser environments like Chrome 118+ often prioritize `[::1]` (IPv6) over `127.0.0.1` (IPv4) when resolving `localhost`.

## Discovery
1. The backend application (`Main.py`) does **not** possess syntax or startup-crashing logic (it booted flawlessly upon manual invocation).
2. The `net::ERR_CONNECTION_REFUSED` error implies the frontend's browser network layer was aggressively rejecting the connection because no process was listening on the requested socket (`localhost:8000`), or it was targeting `::1:8000` while Uvicorn was on `127.0.0.1:8000`.
3. If the backend *was* running but inaccessible, it's due to the `localhost` (IPv6) vs `127.0.0.1` (IPv4) mismatch. However, initial diagnostics proved the backend was entirely dead/down.
