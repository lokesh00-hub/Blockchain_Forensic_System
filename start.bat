@echo off
title Blockchain Forensic System Launcher
color 0B
cls

echo =====================================================================
echo    BLOCKCHAIN FORENSIC SYSTEM - CYBER FORENSICS PLATFORM
echo    Investigate - Verify - Prove
echo =====================================================================
echo.
echo [*] Checking Python environment and dependencies...

REM Install required Flask & Forensic dependencies
pip install flask flask-cors flask-sqlalchemy werkzeug watchdog reportlab

echo.
echo [*] Starting Flask Backend & Web Interface Server...
echo [*] Your default web browser will launch automatically in a moment...
echo.

python run.py

pause
