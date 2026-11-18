# Technical Requirements Document (TRD)

## Project Title
**Blockchain-Based Chain-of-Custody Verification for Ransomware Incident Post-Attack Investigation**

- **Document Version:** 1.0
- **Architecture Pattern:** Multi-Tiered Forensic Architecture (Frontend Web/Mobile -> Flask REST API -> SHA-256 Hashing / Blockchain / Watchdog)
- **Target OS:** Windows / Linux

---

## 1. Technology Stack

### Frontend Architecture
- **Markup & Layout:** HTML5, Semantic Elements.
- **Styling & Framework:** CSS3 (Custom Cyber Forensics Theme variables), Bootstrap 5.3.3.
- **Iconography:** Bootstrap Icons (v1.11.3) & Custom SVG accents.
- **Data Visualization:** Chart.js (v4.4.2) for donut integrity charts, timeline charts, and metric sparklines.
- **Client Cryptography:** Web Crypto API (`crypto.subtle.digest`) for immediate client-side hashing feedback before upload.
- **Scripting:** Pure Vanilla ES6+ JavaScript (Modular JS architecture; no heavy SPA frameworks like React/Angular as strictly required).

### Backend Architecture
- **Language & Runtime:** Python 3.10+.
- **Web Framework:** Flask with Flask-CORS.
- **Database ORM:** Flask-SQLAlchemy with SQLite (initial development) and PostgreSQL compatibility for production.
- **Authentication:** Token-based authentication / secure session management with role-based authorization (Admin / Investigator).
- **Password Security:** Werkzeug / bcrypt cryptographic password hashing.

### Cryptographic Hashing Service
- **Algorithm:** SHA-256 (`hashlib.sha256()`).
- **File Processing:** Chunk-based buffered stream processing (`64KB` or `1MB` chunks) to handle multi-gigabyte forensic disk images without memory exhaustion.
- **Output:** 64-character lowercase hexadecimal hash digest.

### Blockchain & Smart Contracts
- **Smart Contract Language:** Solidity (v0.8.20+).
- **Development Tooling:** Hardhat / Foundry.
- **Python-Web3 Bridge:** Web3.py.
- **Chain Architecture:** Local Hardhat node / Ethereum Testnet (Sepolia/Polygon Amoy).
- **Data on Chain:** Only hashes, evidence identifiers, custodian addresses, action types, and block timestamps are stored on-chain. Sensitive files and personal data remain off-chain in private storage.

### File Monitoring Agent
- **File System Observer:** Python `watchdog` library for event-driven file changes (Modify, Delete, Move).
- **Integrity Daemon:** Background scheduler (`threading` / `schedule`) conducting periodic proactive hash checks against the registered baseline.

### Forensic Report Generation
- **Engine:** ReportLab (Python) for defensible forensic PDF documents with watermarks, cryptographic hashes, and chain-of-custody tables.

---

## 2. Directory Structure

```
Blockchain_Forensic_System/
│
├── frontend/
│   ├── index.html                   # Redirect / landing
│   ├── login.html                   # Authentication terminal
│   ├── dashboard.html               # Main forensic dashboard (Matching reference UI)
│   ├── evidence.html                # Evidence registration & catalog
│   ├── monitoring.html              # Pre-attack file monitoring dashboard
│   ├── verification.html            # Evidence verification workbench
│   ├── investigations.html          # Ransomware case management
│   ├── reports.html                 # Forensic report generator & viewer
│   ├── alerts.html                  # Alert & incident center
│   ├── settings.html                # System configuration & audit logs
│   │
│   ├── css/
│   │   ├── style.css                # Global cyber forensics design system
│   │   ├── components.css           # Cards, tables, badges, donut, modals
│   │   └── responsive.css           # Media queries for tablet and mobile
│   │
│   ├── js/
│   │   ├── app.js                   # Common utilities, nav, clocks, toasts
│   │   ├── auth.js                  # Login, session, role authorization
│   │   ├── dashboard.js             # Metric cards, Chart.js donut, feeds
│   │   ├── evidence.js              # File upload, client hash, register
│   │   ├── monitoring.js            # Baseline tracking, check triggers
│   │   ├── verification.js          # Dual hash comparison, on-chain check
│   │   ├── investigations.js        # Case creation, evidence association
│   │   ├── reports.js               # Report builder, PDF preview/export
│   │   ├── alerts.js                # Severity filters, acknowledgment
│   │   └── settings.js              # Profile, blockchain config, logs
│   │
│   └── assets/                      # Icons, logos, badges, hacker silhouette
│
├── backend/
│   ├── app/
│   │   ├── __init__.py              # Application factory
│   │   ├── config.py                # Environment configurations
│   │   ├── models/                  # SQLAlchemy schema definitions
│   │   │   ├── user.py
│   │   │   ├── evidence.py
│   │   │   ├── case.py
│   │   │   ├── monitoring.py
│   │   │   ├── alert.py
│   │   │   └── audit.py
│   │   ├── routes/                  # REST API blueprints
│   │   │   ├── auth_routes.py
│   │   │   ├── dashboard_routes.py
│   │   │   ├── evidence_routes.py
│   │   │   ├── monitoring_routes.py
│   │   │   ├── verification_routes.py
│   │   │   ├── case_routes.py
│   │   │   ├── alert_routes.py
│   │   │   └── report_routes.py
│   │   ├── services/                # Core business logic
│   │   │   ├── hashing_service.py   # SHA-256 chunk streaming
│   │   │   ├── blockchain_service.py# Web3.py contract client
│   │   │   └── report_service.py    # ReportLab PDF synthesis
│   │   └── utils/
│   ├── requirements.txt
│   └── run.py
│
├── blockchain/
│   ├── contracts/
│   │   └── ChainOfCustody.sol       # Solidity smart contract
│   ├── scripts/
│   │   └── deploy.js
│   ├── test/
│   └── hardhat.config.js
│
├── monitoring_agent/
│   ├── agent.py                     # Watchdog observer & scheduler
│   ├── integrity_checker.py
│   └── config.py
│
├── storage/                         # Private evidence storage (outside web root)
├── documentation/
│   ├── PRD.md
│   ├── TRD.md
│   └── API_DOCUMENTATION.md
├── .env.example
├── .gitignore
└── README.md
```

---

## 3. UI/UX Design System Specification (From Reference Image)

| Token / Element | Value | Purpose |
| :--- | :--- | :--- |
| **Main Background** | `#070B14` | Deep black/navy space |
| **Sidebar Background** | `#0A1220` | Subtle contrast left navigation |
| **Card Background** | `#101C2E` | Primary glass container |
| **Card Border** | `#203650` | Thin sleek border outline |
| **Card Hover Border** | `#08A9F5` (or status glow) | Active glowing accent |
| **Primary Blue** | `#08A9F5` | Neon cyan/blue brand accent |
| **Secondary Blue** | `#1769D2` | Supporting buttons and indicators |
| **Verified Green** | `#17C98B` | Positive verification status |
| **Tampered Red** | `#F04452` | Critical alert & hash mismatch |
| **Warning Amber** | `#F5A623` | Missing files & warnings |
| **Unknown Purple** | `#9B7AFB` | Unknown baseline & info |
| **Main Text** | `#F4F7FC` | Crisp high-contrast typography |
| **Secondary Text** | `#94A3B8` | Subtitles, labels, timestamps |

---

## 4. Smart Contract Architecture

The `ChainOfCustody.sol` smart contract records:
- `registerEvidence(string evidenceId, string sha256Hash, string caseId, string metadataUri)`
- `recordCustodyEvent(string evidenceId, string actionType, string actorId, string remarks)`
- `verifyEvidence(string evidenceId, string currentHash) returns (bool isAuthentic, uint256 registeredTimestamp)`
- `getEvidenceRecord(string evidenceId)`
- `getEventHistory(string evidenceId)`
