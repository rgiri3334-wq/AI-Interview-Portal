# Sterling E-Mobility AI Interview Portal

An enterprise-grade, fully autonomous AI interviewing platform designed for Sterling E-Mobility. This platform acts as an AI Recruiter that dynamically interviews candidates based on their role, experience, and real-time responses.

## Features

- **Dynamic AI Interviewer:** Uses advanced multi-LLM orchestration to assess technical logic, architecture, problem-solving, and emotional intelligence.
- **Adaptive Questioning Engine:** Follows a 5-stage interview flow that scales in difficulty based on the candidate's real-time performance.
- **Proctoring Engine:** Enforces window boundaries, disables right-clicks/shortcuts, and tracks tab focus.
- **Behavioral Telemetry:** Tracks words-per-minute (WPM), speech filler words, and sentiment analysis.
- **7-Dimensional Scoring:** Evaluates candidates across Technical Mastery, Problem Solving, Communication, Confidence, Role Alignment, Professionalism, and Learning Potential.
- **Recruiter Dashboard:** Visualizes candidate performance using radar charts and exports detailed executive dossiers.

## Tech Stack

**Backend**
- Python 3.10+
- FastAPI
- SQLite (WAL Mode enabled)
- SQLAlchemy ORM
- JWT Authentication

**Frontend**
- React 18
- Vite
- Framer Motion (Animations)
- Tailwind CSS

## Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd interview-portal
   ```

2. **Backend Setup:**
   ```bash
   python -m venv venv
   source venv/Scripts/activate  # On Windows
   pip install -r requirements.txt
   ```

3. **Frontend Setup:**
   ```bash
   cd frontend
   npm install
   cd ..
   ```

4. **Environment Variables:**
   Rename `.env.example` to `.env` and fill in your API keys (Groq, OpenAI, etc.).

5. **Run the Platform:**
   ```bash
   python run.py
   ```
   This script will automatically boot up both the FastAPI backend and the React frontend simultaneously.

## License
Proprietary & Confidential - Sterling E-Mobility
