@echo off
title Forensic System - Master Code Accuracy & E2E Verification Suite
color 0A
cls

echo =====================================================================
echo    MASTER CODE ACCURACY & E2E VERIFICATION SUITE
echo    Blockchain Forensic System - Final-Year Cybersecurity Project
echo    Lead Investigator: Mr. Narra Lokesh Vardhan
echo =====================================================================
echo.

echo [*] STEP 1: Verifying Phase 3 (SHA-256 Hashing & 5 Forensic Rules)...
python backend/tests/test_hashing.py -v
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo [!] ERROR: Phase 3 tests failed!
    pause
    exit /b %ERRORLEVEL%
)
echo [OK] Phase 3 passed with 100%% accuracy!
echo.

echo [*] STEP 2: Verifying Phase 4 (Blockchain Smart Contract & Web3.py)...
python backend/tests/test_blockchain.py -v
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo [!] ERROR: Phase 4 tests failed!
    pause
    exit /b %ERRORLEVEL%
)
echo [OK] Phase 4 passed with 100%% accuracy!
echo.

echo [*] STEP 3: Verifying Phase 5 (Pre-Attack File Monitoring & Ransomware Alerting)...
python backend/tests/test_monitoring.py -v
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo [!] ERROR: Phase 5 tests failed!
    pause
    exit /b %ERRORLEVEL%
)
echo [OK] Phase 5 passed with 100%% accuracy!
echo.

echo [*] STEP 4: Verifying Phase 6 (Forensic Reports & PDF Generation Engine)...
python backend/tests/test_reports.py -v
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo [!] ERROR: Phase 6 tests failed!
    pause
    exit /b %ERRORLEVEL%
)
echo [OK] Phase 6 passed with 100%% accuracy!
echo.

echo [*] STEP 5: Verifying Phase 8 (End-to-End REST API & Acceptance Criteria)...
python backend/tests/test_e2e_api.py -v
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo [!] ERROR: Phase 8 E2E tests failed!
    pause
    exit /b %ERRORLEVEL%
)
echo [OK] Phase 8 (End-to-End REST API Integration) passed with 100%% accuracy!
echo.

echo =====================================================================
echo    ALL PHASES (3, 4, 5, 6, 8) 100%% VERIFIED: COMPLETE SYSTEM ACCURACY CONFIRMED!
echo =====================================================================
echo.
pause
