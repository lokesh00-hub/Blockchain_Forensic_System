# REST API Documentation

Base URL: `/api`

### 1. Authentication
- `POST /api/auth/login`
  - Body: `{ "email": "lokesh.vardhan@forensics.gov", "password": "...", "role": "Investigator" }`
  - Response: `{ "status": "success", "token": "...", "user": { "id": 1, "name": "Mr. Narra Lokesh Vardhan", "role": "Investigator" } }`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### 2. Dashboard
- `GET /api/dashboard/summary`
  - Response: Metrics (`total_evidence`, `verified`, `tampered`, `missing`, `unknown`), breakdown percentages.
- `GET /api/dashboard/alerts`
  - Response: List of top recent alerts with severity tags.
- `GET /api/dashboard/activity`
  - Response: Timeline logs of forensic actions.
- `GET /api/dashboard/transactions`
  - Response: Blockchain transaction log with hashes and confirmation status.

### 3. Evidence Management
- `POST /api/evidence/register`
  - Multipart form data: `file`, `name`, `case_id`, `category`, `description`
  - Returns: `{ "evidence_id": "EV-128", "sha256": "...", "tx_hash": "0x7f3e...9a2b", "status": "Registered" }`
- `GET /api/evidence`
  - Filterable by `case_id`, `category`, `status`.
- `GET /api/evidence/<evidence_id>`

### 4. Verification
- `POST /api/evidence/verify`
  - Payload/Form: `evidence_id`, `file`
  - Returns: `{ "status": "VERIFIED" | "TAMPERED" | "MISSING" | "UNKNOWN", "baseline_hash": "...", "current_hash": "...", "blockchain_proof": { ... } }`

### 5. File Monitoring
- `GET /api/monitoring/files`
- `POST /api/monitoring/add`
- `POST /api/monitoring/check-now`
- `POST /api/monitoring/toggle-state`
- `GET /api/monitoring/history/<file_id>`

### 6. Investigations (Cases)
- `GET /api/investigations`
- `POST /api/investigations`
- `GET /api/investigations/<case_id>`
- `PUT /api/investigations/<case_id>`

### 7. Forensic Reports
- `POST /api/reports/generate`
  - Payload: `{ "case_id": "CASE-017", "include_hashes": true, "include_blockchain": true }`
- `GET /api/reports`
- `GET /api/reports/<report_id>/download`

### 8. Alerts
- `GET /api/alerts`
- `POST /api/alerts/<id>/acknowledge`
