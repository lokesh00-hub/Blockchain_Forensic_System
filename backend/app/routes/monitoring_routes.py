import re
import os
import random
from datetime import datetime
from pathlib import Path
from werkzeug.utils import secure_filename
from flask import Blueprint, request, jsonify, current_app
from ..models.user import db
from ..models.monitoring import MonitoredFile, MonitoringEvent
from ..models.alert import Alert
from ..services.hashing_service import HashingService

monitoring_bp = Blueprint('monitoring_bp', __name__)

def _resolve_file_path(raw_path: str) -> Path:
    """Resolve a raw path to a filesystem Path object safely."""
    if not raw_path:
        return Path("__non_existent__")
    clean = raw_path.strip().strip('"').strip("'")
    p = Path(clean)
    if not p.is_absolute():
        p = current_app.config['BASE_DIR'] / p
    if not p.exists():
        # Check in storage/monitored_targets by original filename
        alt = current_app.config['BASE_DIR'] / "storage" / "monitored_targets" / p.name
        if alt.exists():
            return alt
    return p

def _generate_file_id() -> str:
    """Generate safe sequential file ID like MON-001, MON-002, etc."""
    existing = MonitoredFile.query.all()
    max_num = 0
    for item in existing:
        m = re.search(r'MON-(\d+)', item.file_id)
        if m:
            num = int(m.group(1))
            if num > max_num:
                max_num = num
    return f"MON-{max_num + 1:03d}"

def _evaluate_monitored_file(f: MonitoredFile, now: datetime):
    """
    Forensic integrity evaluation conforming to PRD/TRD Section 8.
    Detects missing files (renamed, moved, or deleted), modified files (tampered),
    and verified baselines.
    """
    target_path = _resolve_file_path(f.filepath)
    f.last_checked_at = now
    previous_hash = f.current_hash or f.baseline_hash

    # Case 1: Target file not found on disk (Renamed, moved, or deleted)
    if not target_path.exists() or not target_path.is_file():
        old_status = f.monitoring_status
        f.monitoring_status = 'Missing'
        f.current_hash = 'FILE_NOT_FOUND'

        # Log alert if not already logged recently
        try:
            existing_alt = Alert.query.filter_by(evidence_id=f.evidence_id, alert_type='DELETION', acknowledged=False).first()
            if not existing_alt:
                alt_suffix = f"{int(now.timestamp()) % 100000}-{random.randint(100, 999)}"
                alt = Alert(
                    alert_id=f"ALT-DEL-{alt_suffix}-{f.file_id}",
                    alert_type='DELETION',
                    severity='critical',
                    text=f"CRITICAL: Monitored file cannot be located on disk (Renamed or Deleted): {f.filename} at {f.filepath}",
                    evidence_id=f.evidence_id,
                    case_id='MONITORING'
                )
                db.session.add(alt)
        except Exception:
            pass

        # Log event into audit trail
        try:
            event = MonitoringEvent(
                monitored_file_id=f.id,
                event_type='DELETION' if old_status != 'Missing' else 'INTEGRITY_CHECK',
                previous_hash=previous_hash,
                current_hash='FILE_NOT_FOUND',
                event_status='Missing',
                timestamp=now,
                details=f"Target file missing at path '{f.filepath}'. The file may have been renamed, moved, or deleted."
            )
            db.session.add(event)
        except Exception:
            pass
        return

    # Case 2: Target file exists on disk -> Compute real SHA-256 hash
    try:
        current_hash = HashingService.calculate_file_sha256(str(target_path))
        f.current_hash = current_hash
        b_clean = (f.baseline_hash or '').strip().lower()

        if not b_clean or b_clean in ['no_baseline', 'unknown', 'none']:
            f.monitoring_status = 'Unknown Baseline'
            event = MonitoringEvent(
                monitored_file_id=f.id,
                event_type='INTEGRITY_CHECK',
                previous_hash=previous_hash,
                current_hash=current_hash,
                event_status='Unknown Baseline',
                timestamp=now,
                details=f"Integrity check executed. Current SHA-256: {current_hash[:16]}... No trusted baseline exists."
            )
            db.session.add(event)

        elif current_hash.lower() == b_clean:
            f.monitoring_status = 'Unchanged'
            event = MonitoringEvent(
                monitored_file_id=f.id,
                event_type='INTEGRITY_CHECK',
                previous_hash=previous_hash,
                current_hash=current_hash,
                event_status='Unchanged',
                timestamp=now,
                details=f"Integrity check passed. SHA-256 verified against trusted baseline ({current_hash[:16]}...)."
            )
            db.session.add(event)

        else:
            old_status = f.monitoring_status
            f.monitoring_status = 'Modified'
            try:
                existing_alt = Alert.query.filter_by(evidence_id=f.evidence_id, alert_type='MODIFICATION', acknowledged=False).first()
                if not existing_alt:
                    alt_suffix = f"{int(now.timestamp()) % 100000}-{random.randint(100, 999)}"
                    alt = Alert(
                        alert_id=f"ALT-MOD-{alt_suffix}-{f.file_id}",
                        alert_type='MODIFICATION',
                        severity='critical',
                        text=f"CRITICAL: Monitored file modified: {f.filename} (Hash mismatch detected)",
                        evidence_id=f.evidence_id,
                        case_id='MONITORING'
                    )
                    db.session.add(alt)
            except Exception:
                pass

            event = MonitoringEvent(
                monitored_file_id=f.id,
                event_type='MODIFICATION' if old_status != 'Modified' else 'INTEGRITY_CHECK',
                previous_hash=previous_hash,
                current_hash=current_hash,
                event_status='Modified',
                timestamp=now,
                details=f"TAMPERING DETECTED! Current SHA-256 ({current_hash[:16]}...) differs from baseline ({f.baseline_hash[:16]}...)."
            )
            db.session.add(event)

    except Exception as e:
        f.monitoring_status = 'Error'
        event = MonitoringEvent(
            monitored_file_id=f.id,
            event_type='ERROR',
            previous_hash=previous_hash,
            current_hash=None,
            event_status='Error',
            timestamp=now,
            details=f"Error evaluating target integrity: {str(e)}"
        )
        db.session.add(event)

@monitoring_bp.route('/files', methods=['GET'], strict_slashes=False)
def list_monitored_files():
    """List all registered monitored target files."""
    files = MonitoredFile.query.order_by(MonitoredFile.id.asc()).all()
    return jsonify({
        'status': 'success',
        'count': len(files),
        'files': [f.to_dict() for f in files]
    }), 200

@monitoring_bp.route('/add', methods=['POST'], strict_slashes=False)
def add_monitored_file():
    """Register a new file path in pre-attack monitoring daemon."""
    data = request.get_json(silent=True) or request.form.to_dict() or {}
    filename = (data.get('filename') or '').strip()
    raw_path = (data.get('path') or '').strip()
    freq = (data.get('frequency') or '60s').strip()
    register_baseline = data.get('registerBaseline', True)
    if isinstance(register_baseline, str):
        register_baseline = register_baseline.lower() in ['true', '1', 'yes']
    custom_baseline = data.get('baselineHash')

    if not filename or not raw_path:
        return jsonify({'status': 'error', 'message': 'Target filename and path are required.'}), 400

    target_path = _resolve_file_path(raw_path)
    now = datetime.utcnow()
    file_id = _generate_file_id()
    evidence_id = f"EV-MON-{int(now.timestamp()) % 10000}"

    if target_path.exists() and target_path.is_file():
        try:
            real_hash = HashingService.calculate_file_sha256(str(target_path))
        except Exception as e:
            return jsonify({'status': 'error', 'message': f'Failed to compute SHA-256: {str(e)}'}), 500

        if custom_baseline and custom_baseline not in ['NO_BASELINE', '']:
            baseline_hash = custom_baseline.strip()
            status = 'Unchanged' if real_hash.lower() == baseline_hash.lower() else 'Modified'
        elif register_baseline:
            baseline_hash = real_hash
            status = 'Unchanged'
        else:
            baseline_hash = 'NO_BASELINE'
            status = 'Unknown Baseline'
        current_hash = real_hash
    else:
        # File does not exist on disk at provided path
        baseline_hash = custom_baseline if custom_baseline else 'NO_BASELINE'
        current_hash = 'FILE_NOT_FOUND'
        status = 'Missing'

    mon = MonitoredFile(
        file_id=file_id,
        filename=filename,
        filepath=str(raw_path),
        baseline_hash=baseline_hash,
        current_hash=current_hash,
        monitoring_status=status,
        check_frequency=freq,
        evidence_id=evidence_id,
        last_checked_at=now
    )
    db.session.add(mon)
    db.session.flush()

    init_event = MonitoringEvent(
        monitored_file_id=mon.id,
        event_type='BASELINE_REGISTERED',
        previous_hash=None,
        current_hash=current_hash,
        event_status=status,
        timestamp=now,
        details=f"Target registered with baseline: {baseline_hash[:16]}... Path: {raw_path}" if baseline_hash != 'NO_BASELINE' else f"Target registered without baseline. Path: {raw_path}"
    )
    db.session.add(init_event)
    db.session.commit()

    return jsonify({
        'status': 'success',
        'message': f'File {filename} successfully registered in monitoring system.',
        'file': mon.to_dict()
    }), 201

@monitoring_bp.route('/upload', methods=['POST'], strict_slashes=False)
def upload_monitored_file():
    """Upload a file directly to storage/monitored_targets/ and register baseline."""
    if 'file' not in request.files:
        return jsonify({'status': 'error', 'message': 'No file uploaded.'}), 400

    file = request.files['file']
    if not file or not file.filename:
        return jsonify({'status': 'error', 'message': 'Empty file selected.'}), 400

    raw_name = file.filename
    clean_name = secure_filename(raw_name) or 'target_file.bin'
    freq = request.form.get('frequency', '60s')
    register_baseline = request.form.get('registerBaseline', 'true').lower() == 'true'

    save_dir = current_app.config['MONITORING_DIR']
    save_dir.mkdir(parents=True, exist_ok=True)
    save_path = save_dir / clean_name

    file.save(str(save_path))
    real_hash = HashingService.calculate_file_sha256(str(save_path))

    now = datetime.utcnow()
    file_id = _generate_file_id()
    evidence_id = f"EV-MON-{int(now.timestamp()) % 10000}"

    baseline_hash = real_hash if register_baseline else 'NO_BASELINE'
    status = 'Unchanged' if register_baseline else 'Unknown Baseline'
    rel_path = f"storage/monitored_targets/{clean_name}"

    mon = MonitoredFile(
        file_id=file_id,
        filename=clean_name,
        filepath=rel_path,
        baseline_hash=baseline_hash,
        current_hash=real_hash,
        monitoring_status=status,
        check_frequency=freq,
        evidence_id=evidence_id,
        last_checked_at=now
    )
    db.session.add(mon)
    db.session.flush()

    init_event = MonitoringEvent(
        monitored_file_id=mon.id,
        event_type='BASELINE_REGISTERED',
        previous_hash=None,
        current_hash=real_hash,
        event_status=status,
        timestamp=now,
        details=f"File uploaded to target vault and baseline registered: {baseline_hash[:16]}..."
    )
    db.session.add(init_event)
    db.session.commit()

    return jsonify({
        'status': 'success',
        'message': f'File {clean_name} uploaded and baseline established.',
        'file': mon.to_dict()
    }), 201

@monitoring_bp.route('/<file_id>/check', methods=['GET', 'POST'], strict_slashes=False)
def check_single_file(file_id):
    """Proactively verify SHA-256 integrity of a single monitored endpoint."""
    file_id = str(file_id).strip()
    if not re.match(r'^[A-Za-z0-9_-]+$', file_id):
        return jsonify({'status': 'error', 'message': 'Invalid file ID format'}), 400

    f = MonitoredFile.query.filter_by(file_id=file_id).first()
    if not f:
        return jsonify({'status': 'error', 'message': f'Monitored target {file_id} not found'}), 404

    now = datetime.utcnow()
    _evaluate_monitored_file(f, now)
    db.session.commit()

    return jsonify({
        'status': 'success',
        'file': f.to_dict()
    }), 200

@monitoring_bp.route('/check-now', methods=['GET', 'POST'], strict_slashes=False)
def check_all_files():
    """Trigger global SHA-256 integrity scan across all active monitored endpoints."""
    files = MonitoredFile.query.all()
    now = datetime.utcnow()
    for f in files:
        if f.monitoring_status != 'Disabled':
            _evaluate_monitored_file(f, now)
        else:
            f.last_checked_at = now
    db.session.commit()

    return jsonify({
        'status': 'success',
        'message': f'Completed proactive SHA-256 integrity scan across {len(files)} monitored endpoints.',
        'checkedCount': len(files),
        'files': [f.to_dict() for f in files]
    }), 200

@monitoring_bp.route('/<file_id>/toggle', methods=['GET', 'POST'], strict_slashes=False)
def toggle_monitoring(file_id):
    """Enable or disable monitoring for a specific target."""
    file_id = str(file_id).strip()
    f = MonitoredFile.query.filter_by(file_id=file_id).first()
    if not f:
        return jsonify({'status': 'error', 'message': 'Target not found'}), 404

    if f.monitoring_status == 'Disabled':
        now = datetime.utcnow()
        _evaluate_monitored_file(f, now)
    else:
        f.monitoring_status = 'Disabled'
    db.session.commit()

    return jsonify({
        'status': 'success',
        'file': f.to_dict()
    }), 200

def _perform_update(file_id: str):
    """Internal update implementation supporting upsert for legacy client entries."""
    file_id = str(file_id).strip()
    data = request.get_json(silent=True) or request.form.to_dict() or {}

    filename = (data.get('filename') or '').strip()
    path = (data.get('path') or '').strip()
    freq = (data.get('frequency') or '60s').strip()

    now = datetime.utcnow()
    f = MonitoredFile.query.filter_by(file_id=file_id).first()

    if not f:
        # Upsert target into database so it becomes fully tracked
        target_path = _resolve_file_path(path)
        if target_path.exists() and target_path.is_file():
            try:
                real_hash = HashingService.calculate_file_sha256(str(target_path))
            except Exception:
                real_hash = 'NO_BASELINE'
            status = 'Unchanged'
            baseline = real_hash
            current = real_hash
        else:
            status = 'Missing'
            baseline = 'NO_BASELINE'
            current = 'FILE_NOT_FOUND'

        f = MonitoredFile(
            file_id=file_id,
            filename=filename or file_id,
            filepath=path or 'storage/monitored_targets/' + (filename or 'target.bin'),
            baseline_hash=baseline,
            current_hash=current,
            monitoring_status=status,
            check_frequency=freq,
            evidence_id=f"EV-MON-{int(now.timestamp()) % 10000}",
            last_checked_at=now
        )
        db.session.add(f)
        db.session.flush()

        event = MonitoringEvent(
            monitored_file_id=f.id,
            event_type='BASELINE_REGISTERED',
            previous_hash=None,
            current_hash=current,
            event_status=status,
            timestamp=now,
            details=f"Target registered during update: {filename} at {path}"
        )
        db.session.add(event)
    else:
        # Update existing target
        if filename:
            f.filename = filename
        if path:
            f.filepath = path
        if freq:
            f.check_frequency = freq

        _evaluate_monitored_file(f, now)

    db.session.commit()

    return jsonify({
        'status': 'success',
        'message': f'Target {file_id} updated and re-evaluated successfully.',
        'file': f.to_dict()
    }), 200

def _perform_delete(file_id: str):
    """
    Idempotent delete implementation.
    If target is found in database, removes it and its alerts.
    If target is already absent or only in client cache, returns success cleanly.
    """
    file_id = str(file_id).strip()
    f = MonitoredFile.query.filter_by(file_id=file_id).first()
    if f:
        if f.evidence_id:
            try:
                Alert.query.filter_by(evidence_id=f.evidence_id).delete()
            except Exception:
                pass

        db.session.delete(f)
        db.session.commit()

    return jsonify({
        'status': 'success',
        'message': f'Monitored target {file_id} removed successfully.'
    }), 200

# Explicit dedicated endpoints for update & delete (prevents Werkzeug method collisions)
@monitoring_bp.route('/<file_id>/update', methods=['GET', 'POST', 'PUT'], strict_slashes=False)
def update_target_endpoint(file_id):
    return _perform_update(file_id)

@monitoring_bp.route('/<file_id>/delete', methods=['GET', 'POST', 'DELETE'], strict_slashes=False)
@monitoring_bp.route('/delete/<file_id>', methods=['GET', 'POST', 'DELETE'], strict_slashes=False)
def delete_target_endpoint(file_id):
    return _perform_delete(file_id)

@monitoring_bp.route('/delete', methods=['POST', 'DELETE'], strict_slashes=False)
def delete_target_body():
    data = request.get_json(silent=True) or request.form.to_dict() or {}
    file_id = data.get('file_id') or data.get('id') or ''
    return _perform_delete(file_id)

# Unified REST endpoint on /<file_id> delegating based on HTTP method
@monitoring_bp.route('/<file_id>', methods=['GET', 'PUT', 'POST', 'DELETE'], strict_slashes=False)
def unified_target_endpoint(file_id):
    if request.method == 'DELETE':
        return _perform_delete(file_id)
    elif request.method in ['PUT', 'POST']:
        data = request.get_json(silent=True) or request.form.to_dict() or {}
        if data.get('action') == 'delete':
            return _perform_delete(file_id)
        return _perform_update(file_id)
    else:
        f = MonitoredFile.query.filter_by(file_id=str(file_id).strip()).first()
        if not f:
            return jsonify({'status': 'error', 'message': 'Target not found'}), 404
        return jsonify({
            'status': 'success',
            'file': f.to_dict()
        }), 200

@monitoring_bp.route('/<file_id>/history', methods=['GET'], strict_slashes=False)
def get_file_history(file_id):
    """Retrieve audit event timeline for a monitored target."""
    file_id = str(file_id).strip()
    f = MonitoredFile.query.filter_by(file_id=file_id).first()
    if not f:
        return jsonify({
            'status': 'success',
            'file': {'id': file_id, 'filename': file_id, 'status': 'Unknown'},
            'events': []
        }), 200

    events = MonitoringEvent.query.filter_by(monitored_file_id=f.id).order_by(MonitoringEvent.timestamp.desc()).all()
    return jsonify({
        'status': 'success',
        'file': f.to_dict(),
        'events': [e.to_dict() for e in events]
    }), 200
