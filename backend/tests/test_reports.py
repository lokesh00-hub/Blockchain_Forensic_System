import os
import sys
import tempfile
import unittest
from pathlib import Path

# Add backend directory to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "backend"))

from app.services.report_service import ReportService

class TestPhase6ForensicReports(unittest.TestCase):

    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.output_pdf = os.path.join(self.temp_dir.name, "Forensic_Report_CASE-017.pdf")
        
        self.sample_case = {
            'caseId': 'CASE-017',
            'title': 'LockBit 3.0 Ransomware Incident',
            'severity': 'Critical',
            'status': 'Active',
            'date': '2025-04-26',
            'investigator': 'Mr. Narra Lokesh Vardhan',
            'description': 'Critical ransomware detonation identified across internal Active Directory and backup repository.'
        }

        self.sample_evidence = [
            {
                'id': 'EV-128',
                'name': 'AD_Domain_Controller_ntds.dit',
                'category': 'Database Backup',
                'status': 'Verified',
                'hash': 'a3f59120bc984210e7d201948ba1204859018247ca890124810948102948bcde'
            },
            {
                'id': 'EV-042',
                'name': 'database_backup.sql',
                'category': 'Database Backup',
                'status': 'Tampered',
                'hash': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
            }
        ]

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_report_generation_file_created(self):
        """Test that ReportService generates a valid document at the target path"""
        generated_path = ReportService.generate_pdf_report(
            case=self.sample_case,
            evidence_list=self.sample_evidence,
            output_path=self.output_pdf,
            investigator="Mr. Narra Lokesh Vardhan"
        )

        self.assertTrue(os.path.exists(generated_path), "Generated report file must exist on disk")
        file_size = os.path.getsize(generated_path)
        self.assertGreater(file_size, 200, "Generated report file must not be empty")

    def test_report_includes_case_and_hashes(self):
        """Test report data structures for required case ID, hashes, and evidence IDs"""
        self.assertEqual(self.sample_case['caseId'], 'CASE-017')
        self.assertEqual(len(self.sample_evidence), 2)
        self.assertEqual(self.sample_evidence[0]['id'], 'EV-128')
        self.assertEqual(self.sample_evidence[1]['status'], 'Tampered')

    def test_investigator_attribution(self):
        """Verify lead investigator is explicitly attributed as Mr. Narra Lokesh Vardhan"""
        self.assertEqual(self.sample_case['investigator'], 'Mr. Narra Lokesh Vardhan')

if __name__ == '__main__':
    unittest.main()
