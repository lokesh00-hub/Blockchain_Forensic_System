# Product Requirements Document (PRD)

## Project Title
**Blockchain-Based Chain-of-Custody Verification for Ransomware Incident Post-Attack Investigation**

- **Project Type:** Final-Year BTech Cybersecurity Project
- **Document Version:** 1.0
- **Theme:** Premium Dark Cyber Forensics
- **Primary Target Users:** Forensic Investigators, Incident Response Analysts, Security Administrators

---

## 1. Project Overview & Executive Summary
The **Blockchain-Based Chain-of-Custody Verification System** is an enterprise-grade digital forensic web application specifically architected to assist cyber investigators and security analysts in preserving, monitoring, verifying, and tracking digital evidence during and after ransomware incidents.

### Key Capabilities:
- **Pre-Attack File Monitoring & Baseline Registration:** Create trusted SHA-256 cryptographic baselines for mission-critical files before an attack.
- **Continuous Integrity Tracking:** Monitor files for unauthorized alterations, ransomware encryption, or malicious deletion.
- **Post-Attack Evidence Verification:** Verify collected evidence against registered cryptographic hashes and on-chain records.
- **Immutable Chain-of-Custody on Blockchain:** Log all evidence registration, verification, and handling actions on a smart contract ledger.
- **Case & Investigation Management:** Group evidence, files, and alerts by incident/case (e.g., LockBit 3.0, Akira, BlackCat).
- **Forensic Report Generation:** Generate defensible PDF investigation reports with cryptographic proof, timestamps, and audit trails.

---

## 2. Fundamental Forensic Design Principle
> **Rule of Evidence Baselines:**
> The application **must distinguish** between:
> 1. A file matching a trusted pre-attack baseline (`Verified`).
> 2. A file differing from a trusted baseline (`Tampered`).
> 3. A monitored file that has disappeared (`Missing`).
> 4. A file for which **no trusted baseline exists** (`Unknown Baseline`).
> 
> The system **must never claim to prove tampering** when no original trusted hash is available. Uploading or hashing a file alone does not make it verified; verification requires matching against a prior trusted reference.

---

## 3. User Roles & Access Control

### 1. Administrator
- Configure system parameters, file monitoring intervals, and RPC endpoints.
- Manage user accounts, role assignments, and authentication policies.
- Access global system audit logs and blockchain transaction histories.
- View all active investigation cases and monitoring alerts.

### 2. Forensic Investigator
- Register new digital evidence files and compute SHA-256 hashes.
- Upload collected post-incident evidence for comparative verification.
- Create and manage ransomware investigation cases.
- View and acknowledge monitoring alerts.
- Generate and download comprehensive forensic reports.

---

## 4. Application Modules

### Module 1: Authentication & Access Control
- Secure login with role selection (Administrator / Investigator).
- Password validation and session handling.
- Demo login quick-actions for university defense and evaluator walkthrough.
- Protection of all forensic views from unauthenticated access.

### Module 2: Forensic Command Dashboard (Matching Reference Design)
- **Top Header:** Global search, system status indicator (Live date/time, "System Online"), investigator profile card, and notification center.
- **Hero Welcome Banner:** Personalized investigator greeting with cyber-soc visual backdrop.
- **5 Core KPI Metric Cards:**
  1. *Total Evidence* (Count, trend, sparkline)
  2. *Verified Evidence* (Green, trend, sparkline)
  3. *Tampered Evidence* (Red, trend, sparkline)
  4. *Missing Evidence* (Amber, trend, sparkline)
  5. *Unknown Evidence* (Purple, trend, sparkline)
- **Evidence Integrity Overview:** Interactive Chart.js donut chart with percentage readout and color-coded status breakdowns.
- **Recent Alerts:** High-priority incident feed categorized by severity (Critical, Warning, Info, Low).
- **Recent Activity:** Real-time timeline of investigator actions, hash records, and report creations.
- **Blockchain Transactions:** Immutable ledger transaction log displaying Tx hashes, action types, timestamps, and confirmation status.

### Module 3: Evidence Registration
- Drag-and-drop file upload with immediate client-side and server-side SHA-256 calculation.
- Metadata fields: Evidence Name, Case ID, Category (Disk Image, Memory Dump, System Log, Encrypted Sample, Registry Hive, Database Backup), Description, Custodian.
- Automated generation of unique Evidence ID (e.g., `EV-128`).
- Submission to the smart contract ledger to anchor the initial hash.
- Receipt generation displaying Evidence ID, SHA-256, Tx Hash, Block Number, and Timestamp.

### Module 4: Pre-Attack File Monitoring
- File registration for continuous monitoring with user-defined check intervals (e.g., 30s, 60s, 300s).
- Pre-attack baseline hash establishment.
- Live status indicators: `Unchanged` (Green), `Modified` (Red), `Missing` (Amber), `Monitoring Disabled` (Grey), `Unknown Baseline` (Purple).
- Actions: "Add File", "Check Now" (manual trigger), "Start/Stop Monitoring", "View Event History".
- Tamper detection logs: Records previous hash, new hash, detection timestamp, and trigger cause.

### Module 5: Evidence Verification
- Dual-mode verification:
  1. Verify by Evidence ID against on-chain baseline.
  2. Upload collected suspect file to compare directly against an existing baseline.
- Hash comparison display: Registered Hash vs. Current Hash (highlighting character mismatches).
- Verification outcome badges: `VERIFIED`, `TAMPERED`, `MISSING`, `UNKNOWN BASELINE`.
- Cryptographic proof details: Blockchain transaction verification, block confirmations, and gas used.

### Module 6: Investigation Management
- Case listing and creation (e.g., `CASE-017: LockBit 3.0 Ransomware Attack`).
- Metadata: Incident Title, Severity (Critical, High, Medium, Low), Incident Date, Lead Investigator, Status (Active, Under Review, Closed).
- Associated evidence linking and chain-of-custody tracking per case.

### Module 7: Forensic Reports
- Formal forensic report generation compliant with digital forensics best practices.
- Inclusion of case overview, executive summary, evidence itemization, SHA-256 hash tables, chain-of-custody transfer logs, and blockchain transaction receipts.
- Direct on-screen preview and printable/exportable PDF generation.

### Module 8: Alert & Incident Center
- Centralized security event inbox with filtering by severity (`Critical`, `High`, `Medium`, `Low`, `Informational`) and category.
- Alert acknowledgment workflow with audit logging.
- Direct navigation links to associated evidence and investigation cases.

### Module 9: System Settings
- Investigator profile and security settings.
- Blockchain network settings (RPC URL, Contract Address, Network ID).
- File monitoring agent configuration.
- Comprehensive audit log viewer.
