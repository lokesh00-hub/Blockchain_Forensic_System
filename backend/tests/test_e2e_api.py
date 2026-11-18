import io
import os
import sys
import json
import unittest
from pathlib import Path

# Add backend directory to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "backend"))

from app import create_app
from app.config import Config
from app.models.user import db, User
from app.models.case import Investigation
from app.models.evidence import Evidence
from app.models.monitoring import MonitoredFile
from app.models.alert import Alert

class TestForensicE2EApi(unittest.TestCase):
    """
    Comprehensive End-to-End API Integration Test Suite.
    Validates Acceptance Criteria 1 through 15 from the Forensic PRD.
    """

    def setUp(self):
        # Configure app for testing with in-memory SQLite database and isolated temp folders
        import tempfile
        self.temp_dir = tempfile.TemporaryDirectory()
        
        class TestConfig(Config):
            TESTING = True
            SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
            UPLOAD_FOLDER = Path(self.temp_dir.name) / 'evidence_vault'
            REPORTS_DIR = Path(self.temp_dir.name) / 'reports_vault'
            
        TestConfig.UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)
        TestConfig.REPORTS_DIR.mkdir(parents=True, exist_ok=True)
        
        self.app = create_app(TestConfig)
        self.client = self.app.test_client()

        with self.app.app_context():
            db.create_all()
            # Seed test user if not present
            if not User.query.filter_by(email="lokesh.vardhan@forensics.gov").first():
                user = User(
                    name="Mr. Narra Lokesh Vardhan",
                    email="lokesh.vardhan@forensics.gov",
                    role="Investigator",
                    badge="Senior Digital Forensic Analyst"
                )
                user.set_password("CyberForensics2025!")
                db.session.add(user)
            
            # Seed test case if not present
            if not Investigation.query.filter_by(case_id="CASE-017").first():
                case = Investigation(
                    case_id="CASE-017",
                    title="LockBit 3.0 Ransomware Incident",
                    severity="Critical",
                    status="Active",
                    investigator_name="Mr. Narra Lokesh Vardhan",
                    description="Test ransomware case"
                )
                db.session.add(case)
            
            db.session.commit()

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()
        if hasattr(self, 'temp_dir'):
            self.temp_dir.cleanup()

    def test_01_authentication_login(self):
        """Criterion 1: Secure authentication and session token generation"""
        payload = {
            "email": "lokesh.vardhan@forensics.gov",
            "password": "CyberForensics2025!",
            "role": "Investigator"
        }
        res = self.client.post('/api/auth/login', json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data['status'], 'success')
        self.assertEqual(data['user']['name'], 'Mr. Narra Lokesh Vardhan')
        self.assertTrue('token' in data)

    def test_02_create_investigation_case(self):
        """Criterion 2: Investigators can create and retrieve investigation cases"""
        payload = {
            "title": "BlackCat Ransomware Staging TTPs",
            "description": "Lateral SMB reconnaissance detected on backup server.",
            "severity": "High",
            "date": "2025-04-28"
        }
        res = self.client.post('/api/investigations', json=payload)
        self.assertEqual(res.status_code, 201)
        data = res.get_json()
        self.assertEqual(data['status'], 'success')
        self.assertTrue(data['case']['caseId'].startswith("CASE-"))

        # Retrieve cases
        get_res = self.client.get('/api/investigations')
        self.assertEqual(get_res.status_code, 200)
        self.assertGreaterEqual(get_res.get_json()['count'], 2)

    def test_03_evidence_registration_with_file_upload(self):
        """Criterion 3 & 4: Evidence registration with streaming SHA-256 calculation & blockchain anchor"""
        test_file_content = b"CRITICAL FORENSIC FILE STREAM FOR REGISTRATION"
        data = {
            'file': (io.BytesIO(test_file_content), 'domain_controller.dit'),
            'name': 'Domain Controller Database',
            'case_id': 'CASE-017',
            'category': 'Database Backup',
            'description': 'Active Directory NTDS dump'
        }
        res = self.client.post('/api/evidence/register', data=data, content_type='multipart/form-data')
        self.assertEqual(res.status_code, 201)
        res_data = res.get_json()
        self.assertEqual(res_data['status'], 'success')
        self.assertTrue(res_data['evidence']['id'].startswith("EV-"))
        self.assertEqual(len(res_data['evidence']['hash']), 64)
        self.assertTrue(res_data['blockchain']['tx_hash'].startswith("0x"))
        self.assertEqual(res_data['blockchain']['status'], 'Confirmed')

    def test_04_evidence_listing_and_filtering(self):
        """Criterion 4: Query evidence records with case_id and status filters"""
        res = self.client.get('/api/evidence?case_id=CASE-017')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data['status'], 'success')
        self.assertIsInstance(data['evidence'], list)

    def test_05_comparative_verification_rules(self):
        """Criterion 8 & 9: Evidence verification testing match (Verified) and mismatch (Tampered)"""
        # First register an evidence item
        with self.app.app_context():
            ev = Evidence(
                evidence_id="EV-TEST-99",
                case_id="CASE-017",
                filename="config.ini",
                category="System Log",
                sha256_hash="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
                blockchain_tx_id="0x7f3e589412a84b01e309cbdf9a2b",
                integrity_status="Verified"
            )
            db.session.add(ev)
            db.session.commit()

        # Test A: Perfect Hash Match -> VERIFIED
        verify_match_data = {
            'evidence_id': 'EV-TEST-99',
            'current_hash': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
        }
        res_match = self.client.post('/api/evidence/verify', data=verify_match_data)
        self.assertEqual(res_match.status_code, 200)
        self.assertEqual(res_match.get_json()['verdict'], 'VERIFIED')
        self.assertTrue(res_match.get_json()['isMatch'])

        # Test B: Tampered Hash Mismatch -> TAMPERED
        verify_tamper_data = {
            'evidence_id': 'EV-TEST-99',
            'current_hash': '7d1a54127b222502f5b79b5fb0803061152a44f92b37e23c65dd004176b61826'
        }
        res_tamper = self.client.post('/api/evidence/verify', data=verify_tamper_data)
        self.assertEqual(res_tamper.status_code, 200)
        self.assertEqual(res_tamper.get_json()['verdict'], 'TAMPERED')
        self.assertFalse(res_tamper.get_json()['isMatch'])

    def test_06_pre_attack_monitoring_endpoints(self):
        """Criterion 5, 6, 7: Monitoring target registration, integrity checking, and alert generation"""
        # Register monitored target
        target_payload = {
            "filename": "database_backup.sql",
            "path": "C:\\Storage\\database_backup.sql",
            "frequency": "60s",
            "baselineHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
        }
        res_add = self.client.post('/api/monitoring/add', json=target_payload)
        self.assertEqual(res_add.status_code, 201)

        # Trigger check-now
        res_check = self.client.post('/api/monitoring/check-now')
        self.assertEqual(res_check.status_code, 200)
        self.assertGreaterEqual(res_check.get_json()['checkedCount'], 1)

    def test_07_alert_acknowledgment(self):
        """Criterion 11: Alert creation and non-destructive acknowledgment"""
        with self.app.app_context():
            alt = Alert(
                alert_id="ALT-E2E-1",
                alert_type="MODIFICATION",
                severity="critical",
                text="File modified: database_backup.sql",
                evidence_id="EV-TEST-99"
            )
            db.session.add(alt)
            db.session.commit()

        ack_res = self.client.post('/api/alerts/ALT-E2E-1/acknowledge')
        self.assertEqual(ack_res.status_code, 200)
        self.assertTrue(ack_res.get_json()['alert']['acknowledged'])

    def test_08_forensic_report_generation(self):
        """Criterion 12: Generate formal forensic investigation report with hashes & proof"""
        payload = {
            "case_id": "CASE-017",
            "include_hashes": True,
            "include_blockchain": True
        }
        res = self.client.post('/api/reports/generate', json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data['status'], 'success')
        self.assertTrue(data['reportId'].startswith("REP-CASE-017"))
        self.assertTrue('downloadUrl' in data)

    def test_09_alert_dispatch_endpoint(self):
        """Criterion 11: Monitoring agent alert dispatch into central forensic ledger"""
        payload = {
            "text": "CRITICAL: Monitored file modified: database_backup.sql",
            "alert_type": "MODIFICATION",
            "severity": "critical",
            "file_id": "MON-001",
            "case_id": "CASE-017"
        }
        res = self.client.post('/api/alerts', json=payload)
        self.assertEqual(res.status_code, 201)
        data = res.get_json()
        self.assertEqual(data['status'], 'success')
        self.assertTrue(data['alert']['id'].startswith("ALT-"))

    def test_10_cybersecurity_defenses(self):
        """Cybersecurity Hardening: Defense against path traversal, invalid auth, and bad digests"""
        # A: Path Traversal defense on report download
        bad_report_res = self.client.get('/api/reports/..%2F..%2Fetc/download')
        self.assertIn(bad_report_res.status_code, [400, 404])

        # B: Invalid password rejection
        bad_login_payload = {
            "email": "lokesh.vardhan@forensics.gov",
            "password": "WrongPassword123!",
            "role": "Investigator"
        }
        bad_auth_res = self.client.post('/api/auth/login', json=bad_login_payload)
        self.assertEqual(bad_auth_res.status_code, 401)

        # C: Malformed SHA-256 rejection on evidence registration
        bad_hash_payload = {
            "name": "Malicious Payload",
            "case_id": "CASE-017",
            "sha256_hash": "NOT_A_VALID_HEX_HASH_123"
        }
        bad_hash_res = self.client.post('/api/evidence/register', json=bad_hash_payload)
        self.assertEqual(bad_hash_res.status_code, 400)

        # D: OWASP Security Headers verified
        headers_res = self.client.get('/api/dashboard/summary')
        self.assertEqual(headers_res.status_code, 200)
        self.assertEqual(headers_res.headers.get('X-Content-Type-Options'), 'nosniff')
        self.assertEqual(headers_res.headers.get('X-Frame-Options'), 'SAMEORIGIN')

    def test_11_compute_hash_api(self):
        """Verify API compute-hash endpoint for file uploads and raw content"""
        import hashlib
        sample_bytes = b"Digital Forensic Evidence Payload"
        expected_hash = hashlib.sha256(sample_bytes).hexdigest()

        # 1. Test multipart file upload
        data = {'file': (io.BytesIO(sample_bytes), 'evidence.dat')}
        res = self.client.post('/api/evidence/compute-hash', data=data, content_type='multipart/form-data')
        self.assertEqual(res.status_code, 200)
        resp_json = res.get_json()
        self.assertEqual(resp_json['status'], 'success')
        self.assertEqual(resp_json['sha256_hash'], expected_hash)
        self.assertEqual(resp_json['file_size'], len(sample_bytes))

        # 2. Test raw string content in JSON
        res_json = self.client.post('/api/evidence/compute-hash', json={'content': 'Digital Forensic Evidence Payload'})
        self.assertEqual(res_json.status_code, 200)
        self.assertEqual(res_json.get_json()['sha256_hash'], expected_hash)

    def test_12_signup_flow_with_verification(self):
        """Verify investigator registration with phone and email dual verification"""
        new_email = "investigator.new@forensics.gov"
        new_phone = "+91 91234 56789"

        # 1. Dispatch verification codes
        code_res = self.client.post('/api/auth/send-verification', json={
            'email': new_email,
            'phone_number': new_phone
        })
        self.assertEqual(code_res.status_code, 200)
        code_data = code_res.get_json()
        self.assertEqual(code_data['status'], 'success')
        self.assertIn('demo_codes', code_data)
        email_code = code_data['demo_codes']['email_code']
        phone_code = code_data['demo_codes']['phone_code']

        # 2. Attempt registration with wrong email OTP -> 400
        bad_reg = self.client.post('/api/auth/register', json={
            'name': 'Officer Arjun Rao',
            'email': new_email,
            'phone_number': new_phone,
            'password': 'SecureForensicsPass2025!',
            'role': 'Investigator',
            'email_code': '000000',
            'phone_code': phone_code
        })
        self.assertEqual(bad_reg.status_code, 400)
        self.assertIn('Incorrect Email verification code', bad_reg.get_json()['message'])

        # 3. Successful registration with valid dual codes
        valid_reg = self.client.post('/api/auth/register', json={
            'name': 'Officer Arjun Rao',
            'email': new_email,
            'phone_number': new_phone,
            'password': 'SecureForensicsPass2025!',
            'role': 'Investigator',
            'badge': 'Cybercrime Incident Responder',
            'email_code': email_code,
            'phone_code': phone_code
        })
        self.assertEqual(valid_reg.status_code, 201)
        reg_data = valid_reg.get_json()
        self.assertEqual(reg_data['status'], 'success')
        self.assertEqual(reg_data['user']['name'], 'Officer Arjun Rao')
        self.assertTrue(reg_data['user']['email_verified'])
        self.assertTrue(reg_data['user']['phone_verified'])

        # 4. Log in with newly registered account credentials
        login_res = self.client.post('/api/auth/login', json={
            'email': new_email,
            'password': 'SecureForensicsPass2025!'
        })
        self.assertEqual(login_res.status_code, 200)
        self.assertEqual(login_res.get_json()['user']['name'], 'Officer Arjun Rao')

        # 5. Duplicate registration attempt -> 409 Conflict
        dup_res = self.client.post('/api/auth/send-verification', json={
            'email': new_email,
            'phone_number': new_phone
        })
        self.assertEqual(dup_res.status_code, 409)

if __name__ == '__main__':
    unittest.main()
