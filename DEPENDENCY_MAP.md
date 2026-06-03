# STERLING AI PLATFORM - DEPENDENCY MAP

## Frontend Layer (React/Vite)
- **Directory**: `frontend/`
- **Port**: 5173
- **Key Modules**: 
  - `src/App.jsx` (Routing)
  - `src/pages/AdminPanel.jsx` (Admin Dashboard)
  - `src/pages/Dashboard.jsx` (HR Dashboard)
  - `src/pages/LiveInterview.jsx` (Interview execution)

## API Layer (FastAPI)
- **File**: `Main.py`
- **Port**: 8000
- **Key Routes**:
  - `/api/dashboard` (Dashboard statistics)
  - `/api/leaderboard` (Candidate rankings)
  - `/api/admin/questions` (Question bank CRUD)
  - `/api/admin/config/global/company_context` (Admin configuration)
  - `/api/admin/pipeline` (HR pipeline data)

## Backend Services Layer
- **Directory**: `services/`
- **Key Modules**:
  - `ai_orchestrator.py`
  - `resume_engine.py`
  - `ranking_engine.py`
  - `gemini_service.py`

## Database Layer (SQLite WAL)
- **Directory**: `database/`
- **File**: `database.db`
- **Schema**: 13/15 normalized tables (managed via SQLAlchemy `database.py` and `models.py`)

## Boot Orchestrator
- **File**: `run.py`
- **Role**: Spawns concurrent `uvicorn` and `npm run dev` processes.
