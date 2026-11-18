import os
import sys
import tempfile
import unittest
from pathlib import Path

# Add project root and backend to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "backend"))
sys.path.insert(0, str(PROJECT_ROOT / "monitoring_agent"))

from app.services.hashing_service import HashingService
from integrity_checker import IntegrityChecker

class TestPhase5MonitoringAgent(unittest.TestCase):

    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.test_file_path = os.path.join(self.temp_dir.name, "critical_backup.sql")
        self.initial_content = b"ORIGINAL CLEAN DATABASE BACKUP FOR MONITORING"

        # Create pristine test file
        with open(self.test_file_path, "wb") as f:
            f.write(self.initial_content)

        # Compute initial baseline hash
        self.baseline_hash = HashingService.calculate_file_sha256(self.test_file_path)

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_baseline_matching(self):
        """Test that an unaltered file is accurately identified as UNCHANGED"""
        result = IntegrityChecker.check_target(
            self.test_file_path,
            baseline_hash=self.baseline_hash,
            file_id="MON-TEST-01"
        )

        self.assertEqual(result['status'], 'Unchanged')
        self.assertTrue(result['is_authentic'])
        self.assertEqual(result['current_hash'], self.baseline_hash)
        self.assertIsNone(result['alert'], "No alert should be fired for unchanged file")

    def test_ransomware_modification_detection(self):
        """Test that altering a file immediately triggers MODIFIED status and a Critical Alert"""
        # Simulate ransomware encrypting/altering the file
        with open(self.test_file_path, "ab") as f:
            f.write(b"\n[ENCRYPTED_BY_LOCKBIT]")

        result = IntegrityChecker.check_target(
            self.test_file_path,
            baseline_hash=self.baseline_hash,
            file_id="MON-TEST-01"
        )

        self.assertEqual(result['status'], 'Modified')
        self.assertFalse(result['is_authentic'])
        self.assertNotEqual(result['current_hash'], self.baseline_hash)
        self.assertIsNotNone(result['alert'], "Alert must be generated on modification")
        self.assertEqual(result['alert']['alert_type'], 'MODIFICATION')
        self.assertEqual(result['alert']['severity'], 'critical')

    def test_file_deletion_detection(self):
        """Test that removing a monitored file immediately triggers MISSING status and a Critical Alert"""
        # Delete file
        if os.path.exists(self.test_file_path):
            os.remove(self.test_file_path)

        result = IntegrityChecker.check_target(
            self.test_file_path,
            baseline_hash=self.baseline_hash,
            file_id="MON-TEST-01"
        )

        self.assertEqual(result['status'], 'Missing')
        self.assertFalse(result['is_authentic'])
        self.assertEqual(result['current_hash'], 'FILE_NOT_FOUND')
        self.assertIsNotNone(result['alert'], "Alert must be generated on deletion")
        self.assertEqual(result['alert']['alert_type'], 'DELETION')
        self.assertEqual(result['alert']['severity'], 'critical')

    def test_unknown_baseline_protection(self):
        """Test Rule 4: An unbaselined file must be classified as 'Unknown Baseline' and NEVER falsely as Tampered"""
        result = IntegrityChecker.check_target(
            self.test_file_path,
            baseline_hash="NO_BASELINE",
            file_id="MON-TEST-02"
        )

        self.assertEqual(result['status'], 'Unknown Baseline')
        self.assertFalse(result['is_authentic'])
        self.assertNotIn("Tampered", result['message'], "System must not falsely claim tampering without baseline")
        self.assertIsNone(result['alert'])

    def test_alert_payload_structure(self):
        """Test that generated alert payload strictly contains required forensic metadata fields"""
        # Trigger modification
        with open(self.test_file_path, "wb") as f:
            f.write(b"CORRUPTED")

        result = IntegrityChecker.check_target(self.test_file_path, self.baseline_hash, "MON-01")
        alert = result['alert']

        self.assertIn('alert_id', alert)
        self.assertIn('alert_type', alert)
        self.assertIn('severity', alert)
        self.assertIn('text', alert)
        self.assertIn('timestamp', alert)

if __name__ == '__main__':
    unittest.main()
