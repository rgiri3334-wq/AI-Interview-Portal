# API CLIENT AUDIT

## Frontend Network Configuration
- **File Checked**: `frontend/src/api/apiClient.js`
- **Base URL Logic**: `const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';`
- **Environment Fallback**: No `.env` file exists in `frontend/`, so the application explicitly falls back to `http://localhost:8000`.

## Request Behavior
- The React application is running on port `5173`.
- Axios instances and `api.get()` calls attempt to reach `http://localhost:8000/api/...`.
- **Finding**: The frontend is correctly attempting to connect to the configured backend port (`8000`).

## CORS / Client Diagnostics
- CORS is configured in `Main.py` to allow `http://localhost:5173` and `http://127.0.0.1:5173`.
- The error observed is `net::ERR_CONNECTION_REFUSED`, which is a TCP rejection, NOT a CORS violation (`net::ERR_FAILED`).
- This confirms that the requests are leaving the browser but finding no active listener at the target IP/Port.
