# Final-Year BTech Cybersecurity Defense & Viva Presentation Guide

**Project Title:** Blockchain-Based Chain-of-Custody Verification for Ransomware Incident Post-Attack Investigation  
**Lead Investigator & Author:** Mr. Narra Lokesh Vardhan  
**Academic Degree:** Bachelor of Technology in Cybersecurity  

---

## 1. Executive Project Pitch (The 60-Second Elevator Pitch)

> *"Good morning/afternoon, respected examiners. My project addresses a critical flaw in post-incident ransomware forensics: **evidence tampering and broken chain of custody**.*
>
> *During ransomware detonations, attackers don't just encrypt files; they actively tamper with audit logs, delete shadow copies, and alter timestamps to evade attribution. Traditional database logs can be wiped or edited by attackers with root/administrator access.*
>
> *Our solution creates a dual-tier forensic architecture: First, **pre-attack file monitoring** creates cryptographic SHA-256 baselines of mission-critical assets. Second, our system anchors evidence identifiers, SHA-256 digests, and custody transfer events into an **immutable Ethereum smart contract ledger**.*
>
> *By combining chunk-streamed SHA-256 hashing with blockchain consensus, our platform provides a tamper-evident audit trail that strictly adheres to Federal Digital Evidence Admissibility Guidelines and ISO/IEC 27037."*

---

## 2. Core Forensic Design Principles (What Evaluators Look For)

### The 5 Critical Forensic Integrity Rules:
1. **Rule 1 (`VERIFIED`):** Current file hash strictly matches the trusted pre-attack baseline and on-chain ledger with 100% mathematical fidelity.
2. **Rule 2 (`TAMPERED`):** Current file hash differs from the trusted baseline $\rightarrow$ Flagged as compromised with a character-by-character mismatch diff.
3. **Rule 3 (`MISSING`):** File disappeared from storage (e.g., volume shadow copy deletion or anti-forensic purge) $\rightarrow$ Dispatches a Critical Deletion Alert.
4. **Rule 4 (`UNKNOWN BASELINE`):** No trusted baseline was registered prior to the incident.
   > **Crucial Examiner Point:** *"Our system adheres to strict forensic ethics: It **never falsely claims tampering** when no original trusted hash is available. An unbaselined file cannot prove pre-attack integrity."*
5. **Rule 5 (`VERIFICATION INCOMPLETE`):** On-chain record could not be queried or confirmed $\rightarrow$ Flagged so investigators know the ledger consensus is pending.

---

## 3. Step-by-Step Live Demonstration Script

Follow these exact steps when demonstrating your project to evaluators:

### Step 1: Terminal Login & Investigator Dashboard
1. Open [`frontend/login.html`](file:///d:/solo%20project%20college/Blockchain_Forensic_System/frontend/login.html) and click **"Investigator Demo"**.
2. **Explain to Examiner:** Point to the top header showing **Mr. Narra Lokesh Vardhan**, the live ticking clock (`System Online`), and the **5 KPI metric cards** (Total 128, Verified 112, Tampered 9, Missing 5, Unknown 2).
3. Point to the **Evidence Integrity Donut Chart** showing `87.5% Verified`.

### Step 2: Live Client-Side & Server-Side SHA-256 Hashing
1. Navigate to **Evidence Registration** in the sidebar.
2. Drag any file into the dropzone.
3. **Explain to Examiner:** *"Notice how the 64-character SHA-256 digest is calculated client-side in real time using the browser's WebCrypto API. When submitted, our Flask backend streams the binary in 64KB chunks to process multi-gigabyte disk images without memory exhaustion."*
4. Click **"Register & Anchor on Blockchain"** $\rightarrow$ Show the **Blockchain Chain-of-Custody Certificate Modal** with the unique Evidence ID (`EV-129`) and on-chain transaction hash.

### Step 3: Real-Time Ransomware Attack Simulation
1. Double-click `run_attack_demo.bat` (or run `python simulate_attack.py`).
2. Choose **Option 1 (Simulate Ransomware Encryption)** $\rightarrow$ It alters `database_backup.sql`.
3. Switch to **File Monitoring** on the web dashboard:
   - Click **"Check All Now"** (or observe the Watchdog agent).
   - Status instantly flips to **`MODIFIED`** with a **Critical Security Alert**!
4. In the attack simulator, choose **Option 2 (Simulate File Deletion)** $\rightarrow$ Deletes `user_logs.txt`.
   - Status instantly flips to **`MISSING`** with a **Critical Deletion Alert**!
5. In the simulator, choose **Option 4 (Remediation)** $\rightarrow$ Restores clean baseline files $\rightarrow$ Status returns to **`UNCHANGED`**!

### Step 4: Evidence Verification Workbench
1. Navigate to **Evidence Verification** in the sidebar.
2. Select `EV-128` (clean baseline) $\rightarrow$ Displays green **`EVIDENCE VERIFIED & INTACT`** banner with on-chain Merkle proof.
3. Select `EV-042` (tampered SQL dump) $\rightarrow$ Displays red **`TAMPERING DETECTED`** banner with character mismatch diffing.

### Step 5: Court-Defensible Forensic PDF Report
1. Navigate to **Forensic Reports** in the sidebar.
2. Select `CASE-017` and click **"Print / Download PDF"**.
3. **Explain to Examiner:** Show the formal court-admissible layout with the Confidential watermark, Case metadata, Evidence inventory table, Blockchain transaction hashes, and digital signature attested by **Mr. Narra Lokesh Vardhan**.

---

## 4. Top 7 Examiner Questions & Defensible Answers

### Q1: "Why use Blockchain? Why not a standard PostgreSQL or MySQL database?"
> **Answer:** *"A standard database has a single point of administrative failure. If a ransomware actor or malicious insider gains database administrator (DBA) or root privileges, they can execute `UPDATE` or `DELETE` statements on audit logs without leaving a trace. A blockchain smart contract provides **write-once, append-only immutability** governed by consensus, ensuring that once a forensic hash is anchored, it is cryptographically impossible to alter or backdate."*

### Q2: "Do you store the actual evidence files on the blockchain?"
> **Answer:** *"No, sir/ma'am. Storing full files on a public or consortium blockchain violates forensic privacy, exceeds gas block limits, and leaks sensitive enterprise data. We store strictly **off-chain evidence files in private encrypted storage**, and record only the **64-character SHA-256 hash, Evidence ID, case ID, custodian identity, and block timestamp** on-chain."*

### Q3: "What happens if a file was already infected with ransomware BEFORE you registered the baseline?"
> **Answer:** *"That directly touches Rule 4 of our forensic integrity protocol. If a file was already infected before initial baseline creation, our system anchors that state. However, the system **never claims to prove pre-attack integrity without an earlier trusted reference**. Cryptographic hashing proves that a file has not changed since the baseline was taken, not that the baseline itself was uninfected at the beginning of time."*

### Q4: "What is SHA-256 chunk streaming and why is it necessary for digital forensics?"
> **Answer:** *"Forensic evidence files such as raw disk images (`.E01`, `.raw`, `.dd`) or memory dumps are often 16 GB to 500 GB in size. Reading an entire 50 GB disk image into RAM at once causes `MemoryError` and system crashes. Our service processes data in **64 KB binary chunks** (`read(65536)`), updating the SHA-256 digest iteratively with zero memory exhaustion."*

### Q5: "Can SHA-256 suffer from hash collisions?"
> **Answer:** *"Unlike MD5 and SHA-1, which are cryptographically broken due to collision vulnerabilities, SHA-256 has a keyspace of $2^{256}$ possibilities. Finding two different files that produce the exact same SHA-256 digest is computationally infeasible with modern computing power, making it the industry standard for forensic admissibility."*

### Q6: "How does the monitoring agent detect changes so quickly?"
> **Answer:** *"Our agent uses Python's `watchdog` library, which hooks directly into operating system kernel event APIs (ReadDirectoryChangesW on Windows and inotify on Linux). Instead of sluggish polling, the OS notifies the agent immediately when a byte alteration or deletion occurs, triggering instant hash recalculation."*

### Q7: "How is this project prepared for mobile devices?"
> **Answer:** *"We designed our backend with a decoupled REST API architecture. We developed the **Flutter mobile architecture** in `mobile/` configured to communicate with the exact same `/api/` endpoints as our web interface, ensuring that investigators have real-time mobile push alert notifications without maintaining separate databases."*
