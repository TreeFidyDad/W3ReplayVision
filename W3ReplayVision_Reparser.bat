@echo off
REM =============================================
REM  W3ReplayVision_Reparser.bat
REM  Universal launcher for Warcraft 3 Replay Analysis
REM  Always works from any folder; no hard-coded paths!
REM =============================================

cd /d "%~dp0"

echo.
echo [W3ReplayVision_Reparser] Launching replay parser and visualizer...
echo.

REM Optional: Check if Python is installed
where python >nul 2>nul
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH.
    echo Please install Python 3.9+ from https://python.org
    pause
    exit /b
)

python W3ReplayVision_Reparser.py

pause
