import os
import re
from datetime import datetime
from werkzeug.utils import secure_filename
from flask import Blueprint, request, jsonify, current_app
from ..models.user import db
from ..models.evidence import Evidence
from ..models.case import Investigation
from ..models.custody import BlockchainTransaction, ChainOfCustody
from ..services.hashing_service import HashingService
from ..services.blockchain_service import BlockchainService

evidence_bp = Blueprint('evidence_bp', __name__)
blockchain_service = BlockchainService()

@evidence_bp.route('', methods=['GET'], strict_slashes=False)
@evidence_bp.route('/', methods=['GET'], strict_slashes=False)
def list_evidence():
    case_id = request.args.get('case_id')
    status = request.args.get('status')
    category = request.args.get('category')

    query = Evidence.query
    if case_id:
        query = query.filter_by(case_id=case_id)
    if status and status.lower() != 'all':
        query = query.filter(Evidence.integrity_status.ilike(status))
    if category and category.lower() != 'all':
        query = query.filter(Evidence.category.ilike(category))

    items = query.order_by(Evidence.registration_timestamp.desc()).all()
    return jsonify({
        'status': 'success',
        'count': len(items),
        'evidence': [ev.to_dict() for ev in items]
    }), 200

@evidence_bp.route('/compute-hash', methods=['POST'])
def compute_hash_api():
    """Compute cryptographic SHA-256 hash for an uploaded file or raw payload."""
    file = request.files.get('file')
    if file:
        sha256_hash, file_size = HashingService.calculate_stream_sha256(file.stream)
        clean_name = secure_filename(file.filename) or 'artifact.bin'
        return jsonify({
            'status': 'success',
            'filename': clean_name,
            'sha256_hash': sha256_hash,
            'file_size': file_size
        }), 200

    req_json = request.get_json(silent=True) or {}
    text_content = req_json.get('content') or request.form.get('content')
    if text_content is not None:
        import hashlib
        data_bytes = text_content.encode('utf-8')
        h = hashlib.sha256(data_bytes).hexdigest()
        return jsonify({
            'status': 'success',
            'sha256_hash': h,
            'file_size': len(data_bytes)
        }), 200

    return jsonify({'status': 'error', 'message': 'No file or content supplied for SHA-256 calculation'}), 400

@evidence_bp.route('/register', methods=['POST'], strict_slashes=False)
def register_evidence():
    # Can accept multipart form or JSON
    req_json = request.get_json(silent=True) or {}
    file = request.files.get('file')
    name = request.form.get('name') or request.form.get('filename') or req_json.get('name') or req_json.get('filename')
    case_id = request.form.get('case_id') or req_json.get('case_id') or 'CASE-001'
    category = request.form.get('category') or req_json.get('category') or 'Database Backup'
    description = request.form.get('description') or req_json.get('description') or ''

    if not name and not file:
        return jsonify({'status': 'error', 'message': 'Evidence file or filename is required'}), 400

    # Ensure parent investigation exists to satisfy foreign key constraint
    inv = Investigation.query.filter_by(case_id=case_id).first()
    if not inv:
        inv = Investigation(
            case_id=case_id,
            title='Primary Digital Forensic Investigation',
            description='Active investigation case for anchored blockchain evidence artifacts.',
            severity='Critical',
            investigator_name='Mr. Narra Lokesh Vardhan'
        )
        db.session.add(inv)
        db.session.commit()

    # Generate unique ID
    count = Evidence.query.count()
    evidence_id = f"EV-{count + 1:03d}"

    # Process file & compute streaming SHA-256
    file_size = 0
    saved_path = None
    if file:
        clean_name = secure_filename(file.filename) or f"artifact_{int(datetime.utcnow().timestamp())}.bin"
        filename = clean_name
        upload_dir = current_app.config['UPLOAD_FOLDER']
        os.makedirs(upload_dir, exist_ok=True)
        saved_filename = f"{evidence_id}_{clean_name}"
        saved_path = os.path.join(upload_dir, saved_filename)
        
        # Calculate SHA-256 from stream
        sha256_hash, file_size = HashingService.calculate_stream_sha256(file.stream)
        file.save(saved_path)
    else:
        # Fallback if hash provided in form or json
        sha256_hash = request.form.get('sha256_hash') or req_json.get('sha256_hash') or 'a3f59120bc984210e7d201948ba1204859018247ca890124810948102948bcde'
        filename = name or f"manual_artifact_{evidence_id}"

        # Validate SHA-256 format
        if not re.match(r'^[a-fA-F0-9]{64}$', sha256_hash.strip()):
            return jsonify({'status': 'error', 'message': 'Invalid SHA-256 hash digest format (must be 64 hexadecimal characters)'}), 400

    # Anchor on Blockchain (Phase 4 Smart Contract Integration)
    tx_meta = blockchain_service.register_evidence_on_chain(evidence_id, sha256_hash, case_id, "Mr. Narra Lokesh Vardhan")

    # Save Evidence record
    new_evidence = Evidence(
        evidence_id=evidence_id,
        case_id=case_id,
        filename=filename,
        category=category,
        file_storage_path=saved_path,
        file_size_bytes=file_size,
        sha256_hash=sha256_hash,
        blockchain_tx_id=tx_meta['tx_hash'],
        block_number=tx_meta['block_number'],
        integrity_status='Verified',
        custodian='Mr. Narra Lokesh Vardhan',
        description=description
    )
    db.session.add(new_evidence)

    # Log Blockchain Transaction
    tx_record = BlockchainTransaction(
        tx_hash=tx_meta['tx_hash'],
        tx_type='Evidence Registration',
        status='Confirmed',
        block_number=tx_meta['block_number'],
        evidence_id=evidence_id
    )
    db.session.add(tx_record)

    # Log Chain of Custody Event
    custody_event = ChainOfCustody(
        evidence_id=evidence_id,
        action='EVIDENCE_REGISTERED_ON_CHAIN',
        actor='Mr. Narra Lokesh Vardhan',
        tx_hash=tx_meta['tx_hash'],
        details=f"Evidence {evidence_id} registered with initial baseline hash {sha256_hash}"
    )
    db.session.add(custody_event)
    db.session.commit()

    return jsonify({
        'status': 'success',
        'message': f'Evidence {evidence_id} successfully anchored onto blockchain ledger',
        'evidence': new_evidence.to_dict(),
        'blockchain': tx_meta
    }), 201

@evidence_bp.route('/<evidence_id>', methods=['GET'])
def get_evidence(evidence_id):
    evidence_id = str(evidence_id).strip()
    if not re.match(r'^[A-Za-z0-9_-]+$', evidence_id):
        return jsonify({'status': 'error', 'message': 'Invalid evidence ID format'}), 400

    ev = Evidence.query.filter_by(evidence_id=evidence_id).first()
    if not ev:
        return jsonify({'status': 'error', 'message': 'Evidence record not found'}), 404
    return jsonify({'status': 'success', 'evidence': ev.to_dict()}), 200
