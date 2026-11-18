# Blockchain-Based Chain-of-Custody Verification System
### For Ransomware Incident Post-Attack Investigation
**Final-Year B.Tech Cybersecurity & Digital Forensics Capstone Project**  
**Lead Investigator / System Architect:** Mr. Narra Lokesh Vardhan

[![Theme](https://img.shields.io/badge/UI-Cyber%20Forensics%20Dark-08A9F5.svg)](#)
[![Stack](https://img.shields.io/badge/Backend-Flask%20%7C%20SQLite%20%7C%20Web3.py-17C98B.svg)](#)
[![Blockchain](https://img.shields.io/badge/Smart%20Contract-Solidity%200.8.20-blueviolet.svg)](#)
[![Verification](https://img.shields.io/badge/Code%20Accuracy-100%25%20Verified-brightgreen.svg)](#)

---

## 📌 Executive Project Summary

Ransomware attacks frequently attempt to obscure their forensic trail by encrypting files, wiping shadow copies, and tampering with audit logs. This system establishes a mathematically sound, court-admissible digital forensic platform by combining **proactive file monitoring**, **64KB chunked binary SHA-256 streaming hashing**, and **decentralized smart-contract blockchain anchoring** (`ChainOfCustody.sol`).

---

## 🛡️ Completed Project Phases (100% Accuracy Verified)

| Phase | Module Name | Technology / Artifacts | Verification Status |
|---|---|---|---|
| **Phase 1** | **Cyber Forensic UI/UX** | HTML5, CSS3, Vanilla JS, Bootstrap 5, Chart.js (All 9 pages) | ✅ 1:1 Match with Reference Design |
| **Phase 2** | **Backend REST API** | Flask Application Factory, SQLAlchemy ORM, SQLite DB | ✅ Verified & Persistent |
| **Phase 3** | **SHA-256 Hashing Engine** | 64KB Chunk Binary Stream, Hex Character Diff, 5 Forensic Rules | ✅ 100% Accuracy (`test_hashing.py`) |
| **Phase 4** | **Blockchain Smart Contract** | Solidity 0.8.20 (`ChainOfCustody.sol`), Canonical ABI, Web3.py Service | ✅ 100% Accuracy (`test_blockchain.py`) |
| **Phase 5** | **Monitoring & Attack Simulator** | Watchdog Event Observer, Integrity Checker Daemon, Interactive Attack CLI | ✅ 100% Accuracy (`test_monitoring.py`) |
| **Phase 6** | **Forensic Reports & PDF Engine** | ReportLab PDF Generator, Merkle Proof, Digital Signature Attestation | ✅ 100% Accuracy (`test_reports.py`) |
| **Phase 7** | **Mobile Architecture** | Flutter / Dart Cross-Platform Mobile Dashboard (`mobile/`) | ✅ Dark Cyber UI Structure |
| **Phase 8** | **E2E Integration & Viva Suite** | End-to-End REST API Test Suite (`test_e2e_api.py`), Master Bat Runner | ✅ 100% Accuracy (`test_phases.bat`) |

---

## ⚡ 1-Click Execution Guide (Windows)

All components feature automated Windows batch runners:

### 1. Start Web Platform & REST API Server
Double-click `start.bat` in the root folder, or run:
```cmd
start.bat
```
*Automatically installs dependencies (`flask`, `flask-cors`, `flask-sqlalchemy`, `werkzeug`, `watchdog`, `reportlab`), initializes the SQLite database, starts the server on port `5000`, and opens the dashboard in your default browser.*

### 2. Run Comprehensive Code Accuracy Verification Suite
Double-click `test_phases.bat` in the root folder, or run:
```cmd
test_phases.bat
```
*Executes all 5 automated unit and end-to-end integration test suites with verbose output across Phases 3, 4, 5, 6, and 8.*

### 3. Run Live Ransomware Attack Simulation Demo
Double-click `run_attack_demo.bat` in the root folder, or run:
```cmd
run_attack_demo.bat
```
*Interactive terminal offering 4 realistic scenarios:*
- `[1]` LockBit 3.0 Ransomware Encryption (triggers **TAMPERED** status).
- `[2]` Anti-Forensic File Deletion (triggers **MISSING** status).
- `[3]` Unbaselined Staging Drop (triggers **UNKNOWN BASELINE** protection).
- `[4]` Incident Remediation (reverts all files to pristine trusted baseline).

---

## 🔬 The 5 Critical Forensic Integrity Rules

Conforming strictly to NIST SP 800-86 and ISO/IEC 27037 standards:

1. **Rule 1: VERIFIED / UNCHANGED** — Current SHA-256 matches baseline hash and on-chain record with 100% bit-level fidelity.
2. **Rule 2: TAMPERED / MODIFIED** — Cryptographic digest mismatch detected; visual hex diff indicates affected characters.
3. **Rule 3: MISSING** — File was deleted from filesystem post-attack (e.g. shadow copy purge).
4. **Rule 4: UNKNOWN BASELINE** — No pre-attack baseline exists. **Forensic Principle:** The system can never prove earlier tampering without a baseline; it must **NEVER** falsely label unbaselined evidence as Tampered.
5. **Rule 5: VERIFICATION_INCOMPLETE** — Baseline exists locally, but blockchain ledger connection was interrupted or unconfirmed.

---

## 🌐 Web Application Interface Pages

All 9 pages are accessible at `http://127.0.0.1:5000`:
- `/dashboard.html`: 5 KPI cards, interactive Chart.js donut chart (`87.5% Verified`), live alert feed, activity timeline, blockchain transactions table.
- `/evidence.html`: Drag-and-drop evidence registration with client/server streaming SHA-256 computation and blockchain anchoring.
- `/monitoring.html`: Real-time monitored filesystem targets, frequency controls, status tags, manual integrity check trigger.
- `/verification.html`: Comparative dual-stream cryptographic verification with visual hash mismatch highlighting.
- `/investigations.html`: Case organizer (e.g., CASE-017 LockBit incident, CASE-018 Akira campaign).
- `/reports.html`: Dynamic court-admissible forensic PDF report preview and instant export.
- `/alerts.html`: Filterable security notification audit trail with acknowledgment logging.
- `/settings.html`: Lead investigator profile, RPC node connectivity status, tamper-proof system audit logs.
- `/login.html`: Cyber defense authentication with role-based routing (Investigator / Administrator).

---

## 📁 System Architecture & Directory Tree

```
Blockchain_Forensic_System/
│
├── start.bat                         # 1-Click Platform Launcher
├── test_phases.bat                   # 1-Click Master Test & Accuracy Runner
├── run_attack_demo.bat               # 1-Click Interactive Attack Simulator
├── simulate_attack.py                # Ransomware simulation CLI engine
├── run.py                            # Unified application server entry point
├── README.md                         # Project documentation
│
├── backend/                          # Flask REST API Engine
│   ├── run.py                        # Backend runner & SQLite auto-seeder
│   ├── requirements.txt              # Production Python package manifest
│   ├── app/
│   │   ├── __init__.py               # Application factory & static routing
│   │   ├── config.py                 # Environment configurations
│   │   ├── models/                   # SQLAlchemy ORM Models
│   │   │   ├── user.py               # User authentication model
│   │   │   ├── case.py               # Forensic investigation cases
│   │   │   ├── evidence.py           # Digital evidence artifacts
│   │   │   ├── monitoring.py         # Monitored target endpoints
│   │   │   ├── alert.py              # Security alerts & acknowledgments
│   │   │   └── custody.py            # On-chain transactions & custody logs
│   │   ├── routes/                   # Modular REST Blueprints
│   │   │   ├── auth_routes.py        # Authentication & sessions
│   │   │   ├── dashboard_routes.py   # Metrics & KPI summaries
│   │   │   ├── evidence_routes.py    # Evidence registration & querying
│   │   │   ├── verification_routes.py# Comparative hash verification
│   │   │   ├── monitoring_routes.py  # Monitored file endpoints
│   │   │   ├── case_routes.py        # Investigation management
│   │   │   ├── alert_routes.py       # Alert dispatch & acknowledgment
│   │   │   └── report_routes.py      # PDF report generation & download
│   │   └── services/                 # Core Cryptographic & Web3 Services
│   │       ├── hashing_service.py    # 64KB chunk SHA-256 & 5 forensic rules
│   │       ├── blockchain_service.py # Web3.py client with dual-mode fallback
│   │       └── report_service.py     # Defensible ReportLab PDF generator
│   └── tests/                        # Accuracy & Unit Verification Test Suites
│       ├── test_hashing.py           # Phase 3 Tests (Hashing & 5 rules)
│       ├── test_blockchain.py        # Phase 4 Tests (Smart contract & ABI)
│       ├── test_monitoring.py        # Phase 5 Tests (Observer & baseline)
│       ├── test_reports.py           # Phase 6 Tests (PDF engine & formatting)
│       └── test_e2e_api.py           # Phase 8 Tests (Acceptance criteria 1-15)
│
├── blockchain/                       # Solidity Smart Contract Layer
│   ├── contracts/
│   │   ├── ChainOfCustody.sol        # Smart contract source code
│   │   └── ChainOfCustody.json       # Compiled canonical ABI
│   ├── hardhat.config.js             # Hardhat network configuration
│   └── scripts/
│       └── deploy.js                 # Contract deployment script
│
├── monitoring_agent/                 # Continuous Integrity Agent
│   ├── agent.py                      # Watchdog real-time file observer
│   └── integrity_checker.py          # Proactive cryptographic evaluation engine
│
├── frontend/                         # Cyber Dark Forensics Web Client
│   ├── index.html                    # Root landing router
│   ├── login.html                    # Role authentication
│   ├── dashboard.html                # Main command dashboard
│   ├── evidence.html                 # Evidence registration & drag-and-drop
│   ├── monitoring.html               # File monitoring & baseline management
│   ├── verification.html             # Comparative verification interface
│   ├── investigations.html           # Case management
│   ├── reports.html                  # Forensic reports & export
│   ├── alerts.html                   # Alert audit trail
│   ├── settings.html                 # Investigator profile & RPC settings
│   ├── css/                          # Modular styling (style, components, responsive)
│   └── js/                           # Controller scripts for each module
│
├── mobile/                           # Cross-Platform Flutter Mobile Application
│   ├── pubspec.yaml                  # Flutter package definition
│   ├── lib/
│   │   ├── main.dart                 # Dark Material 3 dashboard interface
│   │   └── constants/
│   │       └── api_endpoints.dart    # Mobile REST API mappings
│   └── README.md                     # Mobile setup instructions
│
├── storage/                          # Persistent Forensic Vaults
│   ├── monitored_targets/            # Baseline target files for attack demo
│   ├── evidence_vault/               # Uploaded evidence file storage
│   └── generated_reports/            # Output court-defensible PDF reports
│
└── documentation/                    # Formal Engineering Specifications
    ├── PRD.md                        # Product Requirements Document
    ├── TRD.md                        # Technical Requirements Document
    ├── API_DOCUMENTATION.md          # REST API Specification
    └── VIVA_PRESENTATION_GUIDE.md    # College Viva Defense & Demo Guide
```

---

## 🎓 College Viva & Examiner Highlights

- **Lead Investigator:** Mr. Narra Lokesh Vardhan
- **Why Blockchain?** Unlike centralized database logs that an adversary with administrative privileges can alter, blockchain transaction hashes are cryptographically sealed across sequential blocks, providing an immutable mathematical audit trail.
- **Why Streaming Hashing?** Standard in-memory hashing (`f.read()`) crashes when analyzing multi-gigabyte forensic disk images (e.g., memory dumps or Active Directory `.dit` databases). Processing in **64KB binary chunks** maintains low memory overhead regardless of evidence size.
- **Why Unknown Baseline Rule?** In digital jurisprudence, claiming evidence is "tampered" when no reference baseline was ever captured is inadmissible. The system properly isolates unbaselined files under `UNKNOWN BASELINE`.
