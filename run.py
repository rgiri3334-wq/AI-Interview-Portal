"""
run.py — Sterling AI Platform Unified Launcher
Architect: Aditya Singh
Usage:
    python run.py            # Starts FastAPI backend via Uvicorn
    python run.py --full     # Starts both Backend and Frontend dev servers
"""

import sys
import os
import subprocess
import webbrowser
import time

def main():
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")

    print("=" * 65)
    print("  🎙️  STERLING AI — AUTONOMOUS VIRTUAL INTERVIEW PLATFORM")
    print("  Architect: Aditya Singh (@adityasingh1786)")
    print(f"  Backend: http://localhost:{port}")
    print(f"  API Docs: http://localhost:{port}/docs")
    print("=" * 65)

    if "--full" in sys.argv:
        print("[1/2] Starting React Vite frontend...")
        frontend_proc = subprocess.Popen(
            ["npm", "run", "dev"],
            cwd=os.path.join(os.path.dirname(__file__), "frontend"),
            shell=True,
        )
        print("[2/2] Starting FastAPI Uvicorn backend...")

    try:
        import uvicorn
        uvicorn.run("Main:app", host=host, port=port, reload=True)
    except KeyboardInterrupt:
        print("\nShutting down servers...")
    except ImportError:
        print("Uvicorn not found. Please install dependencies: pip install -r requirements.txt")

if __name__ == "__main__":
    main()
