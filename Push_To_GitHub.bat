@echo off
REM ============================================================================
REM  Push_To_GitHub.bat
REM  Safely commits and pushes the Interview Portal to GitHub (origin/main).
REM  Sensitive files (.env, database.db, recordings/) are git-ignored and are
REM  NEVER pushed. Run this from a double-click any time you want to sync.
REM ============================================================================

cd /d "%~dp0"

echo.
echo === Repository: %CD% ===
echo.

REM Clear any stale lock left by a crashed git process
if exist ".git\index.lock" (
    echo Removing stale .git\index.lock ...
    del /f /q ".git\index.lock"
)

echo === Confirming sensitive files are ignored ===
git check-ignore .env database.db
echo.

echo === Staging all changes (ignored files are skipped automatically) ===
git add -A
echo.

echo === Safety check: scanning staged files for anything sensitive ===
git diff --cached --name-only > "%TEMP%\_staged.txt"
findstr /I /R "\.env$ database\.db node_modules" "%TEMP%\_staged.txt"
if %ERRORLEVEL%==0 (
    echo.
    echo *** WARNING: a sensitive file appears to be staged. Aborting. ***
    echo *** Review the list above and remove it before pushing.       ***
    del /q "%TEMP%\_staged.txt"
    pause
    exit /b 1
)
del /q "%TEMP%\_staged.txt"
echo No sensitive files staged. Good.
echo.

REM Ask for a commit message (press Enter to use the default)
set "MSG="
set /p MSG=Enter commit message (Enter for default):
if "%MSG%"=="" set "MSG=Update: security & architecture audit fixes"

echo.
echo === Committing: "%MSG%" ===
git commit -m "%MSG%"
echo.

echo === Pushing to origin/main ===
git push origin main

echo.
echo === Done. ===
pause
