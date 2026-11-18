import re
from flask import Blueprint, request, jsonify
from ..models.user import db
from ..models.evidence import Evidence
from ..models.custody import BlockchainTransaction, ChainOfCustody
from ..services.hashing_service import HashingService
from ..services.blockchain_service import BlockchainService

verification_bp = Blueprint('verification_bp', __name__)
blockchain_service = BlockchainService()

@verification_bp.route('/verify', methods=['POST'], strict_slashes=False)
def verify_evidence():
    req_json = request.get_json(silent=True) or {}
    evidence_id = request.form.get('evidence_id') or req_json.get('evidence_id')
    file = request.files.get('file')

    if not evidence_id:
        return jsonify({'status': 'error', 'message': 'Evidence ID is required'}), 400

    evidence_id = str(evidence_id).strip()
    if not re.match(r'^[A-Za-z0-9_-]+$', evidence_id):
        return jsonify({'status': 'error', 'message': 'Invalid evidence ID format'}), 400

    ev = Evidence.query.filter_by(evidence_id=evidence_id).first()
    if not ev:
        # Check if matching monitored file or if baseline supplied from local store
        from ..models.monitoring import MonitoredFile
        from ..models.case import Investigation

        mon = MonitoredFile.query.filter((MonitoredFile.evidence_id == evidence_id) | (MonitoredFile.file_id == evidence_id)).first()
        b_hash = None
        ev_name = None
        ev_path = None

        if mon:
            b_hash = mon.baseline_hash
            ev_name = mon.filename
            ev_path = mon.filepath
        elif req_json.get('baseline_hash'):
            b_hash = req_json.get('baseline_hash')
            ev_name = req_json.get('name') or f"evidence_{evidence_id}"

        if b_hash:
            case_id = req_json.get('case_id') or 'CASE-001'
            inv = Investigation.query.filter_by(case_id=case_id).first()
            if not inv:
                inv = Investigation(
                    case_id=case_id,
                    title='Primary Digital Forensic Investigation',
                    description='Active investigation case for verified evidence.',
                    severity='Critical',
                    investigator_name='Mr. Narra Lokesh Vardhan'
                )
                db.session.add(inv)
                db.session.commit()

            ev = Evidence(
                evidence_id=evidence_id,
                case_id=case_id,
                filename=ev_name or f"artifact_{evidence_id}",
                category='Digital Artifact',
                file_storage_path=ev_path,
                sha256_hash=b_hash,
                integrity_status='Verified',
                custodian='Mr. Narra Lokesh Vardhan',
                description='Registered evidence artifact'
            )
            db.session.add(ev)
            db.session.commit()
        else:
            return jsonify({'status': 'error', 'message': f'Evidence record {evidence_id} not found'}), 404

    baseline_hash = ev.sha256_hash

    # Calculate current hash from uploaded suspect file or provided parameter
    if file:
        current_hash, _ = HashingService.calculate_stream_sha256(file.stream)
    else:
        current_hash = request.form.get('current_hash') or req_json.get('current_hash')

    if not current_hash:
        return jsonify({
            'status': 'error',
            'message': 'Suspect evidence file or current_hash parameter is required for comparative verification'
        }), 400

    current_hash = current_hash.strip().lower()
    if not re.match(r'^[a-f0-9]{64}$', current_hash):
        return jsonify({
            'status': 'error',
            'message': 'Invalid current_hash digest format (must be 64 hexadecimal characters)'
        }), 400

    # Comparative evaluation rule
    comparison = HashingService.compare_hashes(baseline_hash, current_hash)
    verdict_status = comparison['status']

    # Update evidence status
    ev.integrity_status = verdict_status
    
    # Query on-chain proof (Phase 4 Smart Contract Verification)
    proof = blockchain_service.verify_evidence_on_chain(evidence_id, current_hash)

    # Log in Chain of Custody
    custody_event = ChainOfCustody(
        evidence_id=evidence_id,
        action=f"VERIFICATION_ANALYSIS_{verdict_status}",
        actor='Mr. Narra Lokesh Vardhan',
        tx_hash=ev.blockchain_tx_id,
        details=f"Verification executed. Baseline: {baseline_hash[:10]}... Current: {current_hash[:10]}... Outcome: {verdict_status}"
    )
    db.session.add(custody_event)
    db.session.commit()

    return jsonify({
        'status': 'success',
        'verdict': verdict_status,
        'isMatch': comparison['is_match'],
        'baselineHash': baseline_hash,
        'currentHash': current_hash,
        'description': comparison['verdict'],
        'blockchainProof': proof,
        'evidence': ev.to_dict()
    }), 200
