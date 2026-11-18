import os
import io
import sys
import tempfile
import unittest
from pathlib import Path

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services.hashing_service import HashingService

class TestForensicHashingService(unittest.TestCase):
    
    def setUp(self):
        self.sample_content = b"FORENSIC DIGITAL EVIDENCE SAMPLE - LOCKBIT 3.0 INCIDENT"
        # Known SHA-256 of the above string
        import hashlib
        self.expected_hash = hashlib.sha256(self.sample_content).hexdigest().lower()

    def test_chunked_stream_hashing(self):
        """Test stream hashing calculates accurate 64-char hex SHA-256"""
        stream = io.BytesIO(self.sample_content)
        digest, length = HashingService.calculate_stream_sha256(stream)
        
        self.assertEqual(len(digest), 64)
        self.assertEqual(digest, self.expected_hash)
        self.assertEqual(length, len(self.sample_content))
        # Ensure stream is rewound
        self.assertEqual(stream.tell(), 0)

    def test_chunked_file_hashing(self):
        """Test file on disk hashing in 64KB chunks"""
        with tempfile.NamedTemporaryFile(delete=False) as tf:
            tf.write(self.sample_content)
            temp_path = tf.name

        try:
            digest = HashingService.calculate_file_sha256(temp_path)
            self.assertEqual(digest, self.expected_hash)
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)

    def test_rule_1_verified_match(self):
        """Rule: Current hash equals trusted baseline -> VERIFIED"""
        res = HashingService.compare_hashes(self.expected_hash, self.expected_hash)
        self.assertEqual(res['status'], 'VERIFIED')
        self.assertTrue(res['is_match'])
        self.assertEqual(res['diff']['identical_characters'], 64)
        self.assertEqual(res['diff']['mismatched_characters'], 0)

    def test_rule_2_tampered_mismatch(self):
        """Rule: Current hash differs from trusted baseline -> TAMPERED"""
        altered_hash = "7d1a54127b222502f5b79b5fb0803061152a44f92b37e23c65dd004176b61826"
        res = HashingService.compare_hashes(self.expected_hash, altered_hash)
        self.assertEqual(res['status'], 'TAMPERED')
        self.assertFalse(res['is_match'])
        self.assertGreater(res['diff']['mismatched_characters'], 0)

    def test_rule_3_missing_file(self):
        """Rule: Monitored file cannot be found -> MISSING"""
        res = HashingService.compare_hashes(self.expected_hash, "FILE_NOT_FOUND", file_exists=False)
        self.assertEqual(res['status'], 'MISSING')
        self.assertFalse(res['is_match'])

    def test_rule_4_unknown_baseline(self):
        """Rule: No trusted baseline exists -> UNKNOWN (Must NEVER classify as Tampered)"""
        res = HashingService.compare_hashes("NO_BASELINE", self.expected_hash)
        self.assertEqual(res['status'], 'UNKNOWN')
        self.assertFalse(res['is_match'])
        self.assertNotIn("Tampered", res['verdict'])

    def test_rule_5_verification_incomplete(self):
        """Rule: Blockchain record cannot be checked -> VERIFICATION_INCOMPLETE"""
        res = HashingService.compare_hashes(self.expected_hash, self.expected_hash, blockchain_checked=False)
        self.assertEqual(res['status'], 'VERIFICATION_INCOMPLETE')
        self.assertFalse(res['is_match'])

if __name__ == '__main__':
    unittest.main()
