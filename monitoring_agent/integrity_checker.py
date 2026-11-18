import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.append(str(PROJECT_ROOT / "backend"))

from app.services.hashing_service import HashingService

class IntegrityChecker:
    """
    Forensic Integrity Checker Daemon Engine.
    Conforms to Module 4 & Module 8 of PRD.
    """

    @staticmethod
    def check_target(
        file_path: str,
        baseline_hash: Optional[str] = None,
        file_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Executes a cryptographic verification check against a monitored target file.
        Strictly enforces the 5 Forensic Integrity Rules:
        1. File not found on disk -> MISSING
        2. No pre-attack baseline -> UNKNOWN BASELINE (Cannot prove tampering)
        3. Hashes match -> UNCHANGED
        4. Hashes differ -> MODIFIED
        """
        filename = os.path.basename(file_path)
        now_iso = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')

        # Rule 1: File Deletion / Missing
        if not os.path.exists(file_path):
            alert = {
                'alert_id': f"ALT-DEL-{int(datetime.utcnow().timestamp()) % 10000}",
                'alert_type': 'DELETION',
                'severity': 'critical',
                'text': f"CRITICAL: Monitored file deleted: {filename}",
                'details': f"File missing at path: {file_path}. Possible ransomware volume purge or anti-forensic cleanup.",
                'file_id': file_id,
                'filename': filename,
                'timestamp': now_iso
            }
            return {
                'file_id': file_id,
                'filename': filename,
                'path': file_path,
                'status': 'Missing',
                'baseline_hash': baseline_hash or 'NO_BASELINE',
                'current_hash': 'FILE_NOT_FOUND',
                'is_authentic': False,
                'alert': alert,
                'timestamp': now_iso,
                'message': f"Target file '{filename}' cannot be located on disk."
            }

        # Calculate current binary SHA-256
        try:
            current_hash = HashingService.calculate_file_sha256(file_path)
        except Exception as e:
            return {
                'file_id': file_id,
                'filename': filename,
                'path': file_path,
                'status': 'Error',
                'baseline_hash': baseline_hash or 'NO_BASELINE',
                'current_hash': 'READ_ERROR',
                'is_authentic': False,
                'alert': None,
                'timestamp': now_iso,
                'message': f"Filesystem I/O error reading target: {str(e)}"
            }

        # Rule 2: Unknown Baseline (Never claim tampering without original baseline reference)
        if not baseline_hash or baseline_hash.upper() in ['NO_BASELINE', 'UNKNOWN', 'NONE']:
            return {
                'file_id': file_id,
                'filename': filename,
                'path': file_path,
                'status': 'Unknown Baseline',
                'baseline_hash': 'NO_BASELINE',
                'current_hash': current_hash,
                'is_authentic': False,
                'alert': None,
                'timestamp': now_iso,
                'message': f"No pre-attack baseline registered for '{filename}'. System cannot prove tampering or authenticity."
            }

        # Rule 3 & 4: Hash Comparison
        is_match = (current_hash.lower() == baseline_hash.lower())

        if is_match:
            return {
                'file_id': file_id,
                'filename': filename,
                'path': file_path,
                'status': 'Unchanged',
                'baseline_hash': baseline_hash,
                'current_hash': current_hash,
                'is_authentic': True,
                'alert': None,
                'timestamp': now_iso,
                'message': f"Target '{filename}' matches trusted pre-attack baseline with 100% integrity."
            }
        else:
            # Rule 4: Modification / Ransomware Encryption Alert
            alert = {
                'alert_id': f"ALT-MOD-{int(datetime.utcnow().timestamp()) % 10000}",
                'alert_type': 'MODIFICATION',
                'severity': 'critical',
                'text': f"CRITICAL: Monitored file modified: {filename}",
                'details': f"SHA-256 digest changed! Baseline: {baseline_hash[:10]}... Current: {current_hash[:10]}... Unauthorized modification or ransomware encryption detected.",
                'file_id': file_id,
                'filename': filename,
                'timestamp': now_iso
            }
            return {
                'file_id': file_id,
                'filename': filename,
                'path': file_path,
                'status': 'Modified',
                'baseline_hash': baseline_hash,
                'current_hash': current_hash,
                'is_authentic': False,
                'alert': alert,
                'timestamp': now_iso,
                'message': f"Hash mismatch on '{filename}'. File modified or encrypted."
            }
