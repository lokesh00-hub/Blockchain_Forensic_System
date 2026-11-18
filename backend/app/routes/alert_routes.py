import re
from datetime import datetime
from flask import Blueprint, request, jsonify
from ..models.user import db
from ..models.alert import Alert

alert_bp = Blueprint('alert_bp', __name__)

@alert_bp.route('', methods=['GET'])
def list_alerts():
    severity = request.args.get('severity')
    query = Alert.query
    if severity and severity.lower() != 'all':
        query = query.filter_by(severity=severity.lower())

    alerts = query.order_by(Alert.created_at.desc()).all()
    return jsonify({
        'status': 'success',
        'count': len(alerts),
        'alerts': [a.to_dict() for a in alerts]
    }), 200

@alert_bp.route('', methods=['POST'])
def create_alert():
    data = request.get_json() or {}
    text = data.get('text') or data.get('message')
    if not text:
        return jsonify({'status': 'error', 'message': 'Alert text is required'}), 400

    count = Alert.query.count()
    alert_id = data.get('alert_id') or f"ALT-{count + 1:03d}"
    alert_type = data.get('alert_type') or data.get('type') or 'MODIFICATION'
    severity = data.get('severity', 'critical').lower()
    evidence_id = data.get('evidence_id') or data.get('evidenceId') or data.get('file_id')
    case_id = data.get('case_id') or data.get('caseId') or 'GENERAL'

    # Check if duplicate alert ID exists
    existing = Alert.query.filter_by(alert_id=alert_id).first()
    if existing:
        alert_id = f"{alert_id}-{int(datetime.utcnow().timestamp()) % 1000}"

    new_alert = Alert(
        alert_id=alert_id,
        alert_type=alert_type,
        severity=severity,
        text=text,
        evidence_id=evidence_id,
        case_id=case_id
    )
    db.session.add(new_alert)
    db.session.commit()

    return jsonify({
        'status': 'success',
        'message': f'Alert {alert_id} dispatched and recorded in forensic ledger',
        'alert': new_alert.to_dict()
    }), 201

@alert_bp.route('/<alert_id>/acknowledge', methods=['POST'])
def acknowledge_alert(alert_id):
    alert_id = str(alert_id).strip()
    if not re.match(r'^[A-Za-z0-9_-]+$', alert_id):
        return jsonify({'status': 'error', 'message': 'Invalid alert ID format'}), 400

    a = Alert.query.filter_by(alert_id=alert_id).first()
    if not a:
        return jsonify({'status': 'error', 'message': 'Alert not found'}), 404

    a.acknowledged = True
    a.acknowledged_by = 'Mr. Narra Lokesh Vardhan'
    a.acknowledged_at = datetime.utcnow()
    db.session.commit()

    return jsonify({
        'status': 'success',
        'message': f'Alert {alert_id} acknowledged and recorded in chain of custody',
        'alert': a.to_dict()
    }), 200
