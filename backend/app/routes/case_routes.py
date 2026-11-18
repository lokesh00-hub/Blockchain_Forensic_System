import re
from flask import Blueprint, request, jsonify
from ..models.user import db
from ..models.case import Investigation

case_bp = Blueprint('case_bp', __name__)

@case_bp.route('', methods=['GET'])
def list_cases():
    cases = Investigation.query.order_by(Investigation.created_at.desc()).all()
    return jsonify({
        'status': 'success',
        'count': len(cases),
        'cases': [c.to_dict() for c in cases]
    }), 200

@case_bp.route('/<case_id>', methods=['GET'])
def get_case(case_id):
    case_id = str(case_id).strip()
    if not re.match(r'^[A-Za-z0-9_-]+$', case_id):
        return jsonify({'status': 'error', 'message': 'Invalid case ID format'}), 400

    c = Investigation.query.filter_by(case_id=case_id).first()
    if not c:
        return jsonify({'status': 'error', 'message': 'Case not found'}), 404
    return jsonify({'status': 'success', 'case': c.to_dict()}), 200

@case_bp.route('', methods=['POST'])
def create_case():
    data = request.get_json() or {}
    title = data.get('title')
    desc = data.get('description')
    severity = data.get('severity', 'Critical')
    incident_date = data.get('date')

    if not title or not desc:
        return jsonify({'status': 'error', 'message': 'Title and description are required'}), 400

    count = Investigation.query.count()
    case_id = f"CASE-{count + 1:03d}"

    new_case = Investigation(
        case_id=case_id,
        title=title,
        description=desc,
        severity=severity,
        incident_date=incident_date,
        investigator_name='Mr. Narra Lokesh Vardhan'
    )
    db.session.add(new_case)
    db.session.commit()

    return jsonify({
        'status': 'success',
        'message': f'Case {case_id} initialized',
        'case': new_case.to_dict()
    }), 201
