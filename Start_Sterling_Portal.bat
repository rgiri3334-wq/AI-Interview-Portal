@echo off
title Sterling AI Interview Portal
color 0C
echo ========================================================
echo   STERLING E-MOBILITY - AI INTERVIEW ENGINE
echo   Architect: Aditya Singh
echo ========================================================
echo.
echo [1/3] Activating Virtual Environment...
call venv\Scripts\activate

echo [2/3] Checking Dependencies...
pip install -r requirements.txt -q

echo [3/3] Launching AI Core and UI Engine...
echo (A browser window will open automatically when ready)
echo.

python run.py

pause
 