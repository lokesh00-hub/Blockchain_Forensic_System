import hashlib
import os
from typing import Tuple, Dict, Any, Optional

class HashingService:
    CHUNK_SIZE = 65536  # 64 KB chunks for memory-safe forensic stream processing

    @staticmethod
    def calculate_file_sha256(file_path: str) -> str:
        """
        Calculate SHA-256 hash of a file on disk in 64KB binary chunks.
        Complies with Part 4 Section 7 of Forensic TRD.
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        sha256 = hashlib.sha256()
        with open(file_path, 'rb') as f:
            while chunk := f.read(HashingService.CHUNK_SIZE):
                sha256.update(chunk)
        return sha256.hexdigest().lower()

    @staticmethod
    def calculate_stream_sha256(stream) -> Tuple[str, int]:
        """
        Calculate SHA-256 hash of an in-memory or upload stream and return (hash, byte_length).
        Rewinds stream to position 0 after hashing.
        """
        sha256 = hashlib.sha256()
        total_bytes = 0
        while True:
            chunk = stream.read(HashingService.CHUNK_SIZE)
            if not chunk:
                break
            total_bytes += len(chunk)
            sha256.update(chunk)
        stream.seek(0)  # Rewind stream for subsequent file persistence
        return sha256.hexdigest().lower(), total_bytes

    @staticmethod
    def compare_hashes(
        baseline_hash: Optional[str],
        current_hash: Optional[str],
        file_exists: bool = True,
        blockchain_checked: bool = True
    ) -> Dict[str, Any]:
        """
        Forensic Integrity Evaluation conforming strictly to PRD/TRD Section 8:
        
        1. Monitored file cannot be found -> MISSING
        2. No trusted baseline exists -> UNKNOWN
        3. Blockchain record cannot be checked -> VERIFICATION_INCOMPLETE
        4. Current hash equals trusted baseline -> VERIFIED / UNCHANGED
        5. Current hash differs from trusted baseline -> TAMPERED / MODIFIED

        Forensic Principle:
        If a file was modified before its first baseline registration, the system cannot prove
        earlier modification from the new hash alone; it must NEVER classify unbaselined files as Tampered.
        """
        # Condition 1: File Missing
        if not file_exists or current_hash == 'FILE_NOT_FOUND':
            return {
                'status': 'MISSING',
                'is_match': False,
                'verdict': 'Missing - Monitored file cannot be located on disk or filesystem storage.',
                'diff': None
            }

        # Condition 2: Unknown Baseline
        if not baseline_hash or baseline_hash.upper() in ['NO_BASELINE', 'UNKNOWN', 'NONE']:
            return {
                'status': 'UNKNOWN',
                'is_match': False,
                'verdict': 'Unknown Baseline - No trusted pre-attack baseline exists. Cannot prove or disprove tampering.',
                'diff': None
            }

        # Condition 3: Blockchain Record Cannot be Checked
        if not blockchain_checked:
            return {
                'status': 'VERIFICATION_INCOMPLETE',
                'is_match': False,
                'verdict': 'Verification Incomplete - Blockchain on-chain record could not be queried or confirmed.',
                'diff': None
            }

        # Condition 4 & 5: Hash Comparison
        b_clean = baseline_hash.strip().lower()
        c_clean = current_hash.strip().lower()
        is_match = (b_clean == c_clean)

        # Compute character diff positions
        diff_info = HashingService.compute_hash_diff(b_clean, c_clean)

        if is_match:
            return {
                'status': 'VERIFIED',
                'is_match': True,
                'verdict': 'Verified - Current cryptographic digest matches trusted baseline and on-chain record.',
                'diff': diff_info
            }
        else:
            return {
                'status': 'TAMPERED',
                'is_match': False,
                'verdict': 'Tampered - Cryptographic mismatch! Current hash differs from registered pre-attack baseline.',
                'diff': diff_info
            }

    @staticmethod
    def compute_hash_diff(hash_a: str, hash_b: str) -> Dict[str, Any]:
        """Generate positional character match and mismatch indices"""
        length = min(len(hash_a), len(hash_b))
        matches = []
        mismatches = []
        for i in range(length):
            if hash_a[i] == hash_b[i]:
                matches.append(i)
            else:
                mismatches.append(i)

        similarity_pct = round((len(matches) / 64) * 100, 2) if length >= 64 else 0.0
        return {
            'identical_characters': len(matches),
            'mismatched_characters': len(mismatches),
            'similarity_percentage': similarity_pct,
            'mismatch_indices': mismatches
        }
