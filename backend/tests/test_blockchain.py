import os
import sys
import json
import unittest
from pathlib import Path

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services.blockchain_service import BlockchainService

class TestPhase4BlockchainIntegration(unittest.TestCase):

    def setUp(self):
        self.blockchain_service = BlockchainService()
        self.sample_evidence_id = "EV-128"
        self.sample_sha256 = "a3f59120bc984210e7d201948ba1204859018247ca890124810948102948bcde"
        self.sample_case_id = "CASE-017"

    def test_abi_loaded_successfully(self):
        """Test that ChainOfCustody ABI is loaded and exposes all required functions"""
        abi = self.blockchain_service.abi
        self.assertIsInstance(abi, list)
        self.assertGreater(len(abi), 5, "ABI must contain functions and events")

        function_names = [item.get("name") for item in abi if item.get("type") == "function"]
        self.assertIn("registerEvidence", function_names)
        self.assertIn("verifyEvidence", function_names)
        self.assertIn("recordCustodyEvent", function_names)
        self.assertIn("getEvidenceRecord", function_names)
        self.assertIn("evidenceExists", function_names)

    def test_evidence_registration_transaction(self):
        """Test on-chain evidence registration transaction generation and receipt"""
        res = self.blockchain_service.register_evidence_on_chain(
            self.sample_evidence_id,
            self.sample_sha256,
            self.sample_case_id
        )

        self.assertIsInstance(res, dict)
        self.assertTrue(res['tx_hash'].startswith("0x"), "Tx hash must start with 0x")
        self.assertEqual(len(res['tx_hash']), 66, "Standard Ethereum Tx hash must be 66 characters")
        self.assertEqual(res['status'], "Confirmed", "Status must be Confirmed")
        self.assertGreater(res['block_number'], 0, "Block number must be positive")
        self.assertGreater(res['gas_used'], 0, "Gas used must be positive")
        self.assertEqual(res['contract_address'], "0x5FbDB2315678afecb367f032d93F642f64180aa3")

    def test_evidence_verification_on_chain(self):
        """Test on-chain verification call against registered baseline"""
        res = self.blockchain_service.verify_evidence_on_chain(
            self.sample_evidence_id,
            self.sample_sha256
        )

        self.assertIsInstance(res, dict)
        self.assertEqual(res['evidence_id'], self.sample_evidence_id)
        self.assertTrue(res['exists_on_chain'])
        self.assertTrue(res['merkle_root_verified'])
        self.assertEqual(res['contract_address'], "0x5FbDB2315678afecb367f032d93F642f64180aa3")

    def test_custody_transfer_logging(self):
        """Test recording custody transfer events onto the ledger"""
        res = self.blockchain_service.record_custody_transfer_on_chain(
            self.sample_evidence_id,
            "CUSTODY_TRANSFER",
            "Transferred from Acquisition Unit to Forensic Lab"
        )

        self.assertIsInstance(res, dict)
        self.assertTrue(res['tx_hash'].startswith("0x"))
        self.assertEqual(res['status'], "Confirmed")

    def test_solidity_contract_rules(self):
        """Verify Solidity smart contract code adheres strictly to TRD Section 6 rules"""
        contract_path = Path(__file__).resolve().parent.parent.parent / "blockchain" / "contracts" / "ChainOfCustody.sol"
        self.assertTrue(contract_path.exists(), "ChainOfCustody.sol must exist")

        with open(contract_path, 'r', encoding='utf-8') as f:
            code = f.read()

        # Rule check: Never store full files or passwords on-chain
        self.assertNotIn("password", code.lower(), "Passwords must never appear in smart contract")
        self.assertIn("registerEvidence", code)
        self.assertIn("verifyEvidence", code)
        self.assertIn("recordCustodyEvent", code)

if __name__ == '__main__':
    unittest.main()
