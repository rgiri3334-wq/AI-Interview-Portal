"""
=============================================================================
AI Virtual Interview Platform - Enterprise System Orchestrator
=============================================================================
Author: Aditya Singh (Principal Architect)
Description: Manages the simultaneous boot sequence of the FastAPI Backend 
and React/Vite Frontend. Includes pre-flight environment checks and 
graceful cross-platform process termination.
=============================================================================
"""

import subprocess
import webbrowser
import time
import os
import sys

def check_environment(base_dir, frontend_dir):
    """Run pre-flight checks to ensure the system is ready to boot."""
    print("[*] Running pre-flight system checks...")
    
    # 1. Check for .env file
    if not os.path.exists(os.path.join(base_dir, ".env")):
        print("  [!] WARNING: .env file missing in root directory.")
        print("      Gemini AI will default to MOCK mode.")
    
    # 2. Check for Frontend directory
    if not os.path.exists(frontend_dir):
        print("  [X] FATAL ERROR: 'frontend' directory not found.")
        sys.exit(1)
        
    # 3. Check for node_modules
    if not os.path.exists(os.path.join(frontend_dir, "node_modules")):
        print("  [X] FATAL ERROR: 'node_modules' missing in frontend.")
        print("      Please cd into 'frontend' and run 'npm install' first.")
        sys.exit(1)
        
    print("  [+] All system checks passed.\n")

def run_servers():
    print("\n" + "=" * 65)
    print(" >>> BOOTING STERLING AI INTERVIEW PLATFORM")
    print("    Architect: Aditya Singh | System Status: INITIALIZING")
    print("=" * 65 + "\n")

    base_dir = os.path.dirname(os.path.abspath(__file__))
    frontend_dir = os.path.join(base_dir, "frontend")

    # Run Pre-flight Checks
    check_environment(base_dir, frontend_dir)

    # 1. Start FastAPI Backend
    print("[*] IGNITION: Starting FastAPI Backend (Port 8000)...")
    backend = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "Main:app", "--reload"],
        cwd=base_dir
    )

    # 2. Start Vite/React Frontend
    print("[*] IGNITION: Starting React UI Engine (Port 5173)...")
    # shell=True is required for Windows 'npm' commands
    frontend = subprocess.Popen(
        "npm run dev",
        cwd=frontend_dir,
        shell=True 
    )

    # 3. Wait for servers to initialize
    print("\n[*] Waiting for subsystems to stabilize (4 seconds)...")
    time.sleep(4)

    # 4. Open Default Web Browser
    url = "http://localhost:5173"
    print(f"[*] Launching Sterling UI at {url}\n")
    # webbrowser.open(url)

    print("=" * 65)
    print(" [+] SYSTEM IS LIVE. PRESS [CTRL+C] TO SHUT DOWN GRACEFULLY.")
    print("=" * 65 + "\n")

    # Keep script alive and handle shutdown
    try:
        backend.wait()
        frontend.wait()
    except KeyboardInterrupt:
        print("\n\n[-] Shutdown signal received. Terminating processes...")
        
        try:
            # Terminate child processes gracefully
            backend.terminate()
            frontend.terminate()
            
            # Wait a moment for them to close
            backend.wait(timeout=3)
            frontend.wait(timeout=3)
        except Exception as e:
            print(f"[!] Error during shutdown: {e}")
            # Force kill if they hang
            backend.kill()
            frontend.kill()
            
        print("[*] All subsystems powered down. Goodbye, Aditya!")

if __name__ == "__main__":
    run_servers()