"""
=============================================================================
run.py — Sterling AI Platform Unified Enterprise Launcher
=============================================================================
Architect: Aditya Singh (@adityasingh1786)

Features:
  - Robust process tree cleanup on exit (zero zombie node.exe / Vite processes)
  - Automatic .env loading with sensible fallbacks
  - Graceful port-conflict detection before server bind
  - Background daemon thread for delayed auto-browser launch
  - Frontend dependency pre-flight check (auto-detects missing node_modules)
  - Full-stack unified orchestration with clean signal traps

Usage:
  python run.py               # Starts Full-Stack (FastAPI backend + Vite frontend)
  python run.py --backend     # Starts FastAPI backend only
  python run.py --no-browser  # Starts servers without auto-launching browser
=============================================================================
"""

import os
import sys
import time
import socket
import signal
import atexit
import threading
import subprocess
import webbrowser

# ── 1. Automatic .env Configuration ──────────────────────────────────────────
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# Global process reference for cleanup
frontend_proc: subprocess.Popen | None = None


# ── 2. Process Tree Management (Zero Zombies) ────────────────────────────────
def kill_proc_tree(pid: int) -> None:
    """Terminates an entire process tree cleanly across Windows and POSIX."""
    if sys.platform == "win32":
        try:
            subprocess.run(
                ["taskkill", "/F", "/T", "/PID", str(pid)],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                check=False,
            )
        except Exception:
            pass
    else:
        try:
            os.kill(pid, signal.SIGTERM)
        except Exception:
            pass


def cleanup() -> None:
    """Invoked on exit to ensure child processes are never orphaned."""
    global frontend_proc
    if frontend_proc and frontend_proc.poll() is None:
        print("\n[Sterling AI] Shutting down UI engine and child processes...")
        kill_proc_tree(frontend_proc.pid)
        frontend_proc = None


# Register cleanup with exit hooks
atexit.register(cleanup)


def handle_exit_signal(signum, frame):
    cleanup()
    sys.exit(0)


signal.signal(signal.SIGINT, handle_exit_signal)
if hasattr(signal, "SIGTERM"):
    signal.signal(signal.SIGTERM, handle_exit_signal)


# ── 3. Port Conflict Detection ───────────────────────────────────────────────
def is_port_in_use(port: int, host: str = "127.0.0.1") -> bool:
    """Checks whether a local TCP port is already bound by another process."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex((host, port)) == 0


# ── 4. Delayed Browser Launcher ──────────────────────────────────────────────
def launch_browser_delayed(url: str, delay: float = 2.5) -> None:
    """Launches the user's default browser after servers have had time to bind."""
    def _open():
        time.sleep(delay)
        try:
            webbrowser.open(url)
        except Exception:
            pass

    threading.Thread(target=_open, daemon=True).start()


# ── 5. Main Unified Orchestrator ─────────────────────────────────────────────
def main():
    global frontend_proc

    backend_only = "--backend" in sys.argv or "--backend-only" in sys.argv
    no_browser = "--no-browser" in sys.argv

    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")

    base_dir = os.path.dirname(os.path.abspath(__file__))
    frontend_dir = os.path.join(base_dir, "frontend")
    node_modules_dir = os.path.join(frontend_dir, "node_modules")

    launch_ui = not backend_only and os.path.exists(os.path.join(frontend_dir, "package.json"))

    print("=" * 70)
    print("  🎙️  STERLING AI — AUTONOMOUS VIRTUAL INTERVIEW PLATFORM")
    print("  Architect: Aditya Singh (@adityasingh1786)")
    print("=" * 70)
    print(f"  ⚡ Backend Core:      http://localhost:{port}")
    print(f"  📖 API Documentation: http://localhost:{port}/docs")
    if launch_ui:
        print("  🖥️  Frontend UI:       http://localhost:5173")
    print("=" * 70)

    # Pre-flight check: Backend port availability
    if is_port_in_use(port):
        print(f"\n❌ Error: Port {port} is already in use by another application.")
        print(f"   Please stop the existing process or set PORT=<new_port> in .env\n")
        sys.exit(1)

    # Launch Frontend Engine (if full-stack mode)
    if launch_ui:
        if not os.path.exists(node_modules_dir):
            print("\n⚠️  [Pre-Flight] frontend/node_modules not found!")
            print("   Installing dependencies: running 'npm install' in frontend/...")
            try:
                subprocess.run(["npm", "install"], cwd=frontend_dir, shell=True, check=True)
                print("   Dependencies installed successfully.\n")
            except Exception as e:
                print(f"❌ Failed to run npm install: {e}")
                print("   Please run 'cd frontend && npm install' manually.\n")

        print("[1/2] Starting React Vite UI Engine (Port 5173)...")
        try:
            frontend_proc = subprocess.Popen(
                ["npm", "run", "dev"],
                cwd=frontend_dir,
                shell=True,
            )
        except Exception as e:
            print(f"⚠️  Could not start frontend: {e}")

    # Auto-open browser in a non-blocking background thread
    if not no_browser:
        target_url = "http://localhost:5173" if launch_ui else f"http://localhost:{port}/docs"
        launch_browser_delayed(target_url, delay=2.5)

    # Launch Backend Core via Uvicorn
    step_num = "[2/2]" if launch_ui else "[1/1]"
    print(f"{step_num} Starting FastAPI Uvicorn Core (Port {port})...\n")

    try:
        import uvicorn
        uvicorn.run("Main:app", host=host, port=port, reload=True)
    except KeyboardInterrupt:
        pass
    except ImportError:
        print("\n❌ Uvicorn not found. Please install backend dependencies:")
        print("   pip install -r requirements.txt\n")
    except Exception as e:
        print(f"\n❌ Server error: {e}\n")
    finally:
        cleanup()


if __name__ == "__main__":
    main()
