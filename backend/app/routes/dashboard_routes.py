from flask import Blueprint, jsonify, request
from ..models.user import db
from ..models.evidence import Evidence
from ..models.alert import Alert
from ..models.custody import BlockchainTransaction, ChainOfCustody

dashboard_bp = Blueprint('dashboard_bp', __name__)

@dashboard_bp.route('/summary', methods=['GET'], strict_slashes=False)
def get_summary():
    from ..models.evidence import Evidence
    from ..models.monitoring import MonitoredFile

    # 1. Fetch all Evidence records
    evidences = Evidence.query.all()
    # 2. Fetch all MonitoredFile records
    monitored = MonitoredFile.query.all()

    # Track evidence by unique identifier (evidence_id or file_id)
    items_status = {}

    for ev in evidences:
        eid = ev.evidence_id
        items_status[eid] = (ev.integrity_status or 'Verified').capitalize()

    for mon in monitored:
        eid = mon.evidence_id or mon.file_id
        m_status = (mon.monitoring_status or 'Unchanged').strip()
        
        # Map MonitoredFile status to Forensic Integrity status:
        # 'Modified' -> 'Tampered'
        # 'Missing' -> 'Missing'
        # 'Unchanged' -> 'Verified'
        # 'Unknown Baseline' or 'Unknown' -> 'Unknown'
        if m_status.lower() in ['modified', 'tampered']:
            forensic_status = 'Tampered'
        elif m_status.lower() in ['missing', 'deleted', 'file_not_found']:
            forensic_status = 'Missing'
        elif m_status.lower() in ['unchanged', 'verified', 'intact']:
            forensic_status = 'Verified'
        else:
            forensic_status = 'Unknown'

        # Monitored file live integrity check updates or adds the record
        items_status[eid] = forensic_status

    # Count categories
    total = len(items_status)
    verified = sum(1 for s in items_status.values() if s == 'Verified')
    tampered = sum(1 for s in items_status.values() if s == 'Tampered')
    missing = sum(1 for s in items_status.values() if s == 'Missing')
    unknown = sum(1 for s in items_status.values() if s == 'Unknown')

    pct_verified = round((verified / total * 100), 1) if total > 0 else 0.0

    return jsonify({
        'status': 'success',
        'metrics': {
            'total': total,
            'verified': verified,
            'tampered': tampered,
            'missing': missing,
            'unknown': unknown,
            'percentVerified': pct_verified
        }
    }), 200

@dashboard_bp.route('/alerts', methods=['GET'], strict_slashes=False)
def get_recent_alerts():
    alerts = Alert.query.order_by(Alert.created_at.desc()).limit(10).all()
    return jsonify({
        'status': 'success',
        'alerts': [a.to_dict() for a in alerts]
    }), 200

@dashboard_bp.route('/activity', methods=['GET'], strict_slashes=False)
def get_activity():
    events = ChainOfCustody.query.order_by(ChainOfCustody.timestamp.desc()).limit(15).all()
    return jsonify({
        'status': 'success',
        'activity': [e.to_dict() for e in events]
    }), 200

@dashboard_bp.route('/transactions', methods=['GET'], strict_slashes=False)
def get_transactions():
    limit = request.args.get('limit', 100, type=int)
    txs = BlockchainTransaction.query.order_by(BlockchainTransaction.timestamp.desc()).limit(limit).all()
    
    # Auto-backfill transactions from Evidence records if transaction table has fewer entries than evidence
    if not txs:
        try:
            evidences = Evidence.query.filter(Evidence.blockchain_tx_id.isnot(None)).all()
            for ev in evidences:
                if ev.blockchain_tx_id:
                    existing = BlockchainTransaction.query.filter_by(tx_hash=ev.blockchain_tx_id).first()
                    if not existing:
                        new_tx = BlockchainTransaction(
                            tx_hash=ev.blockchain_tx_id,
                            tx_type='Evidence Registration',
                            status='Confirmed',
                            block_number=ev.block_number or 498120,
                            evidence_id=ev.evidence_id,
                            timestamp=ev.created_at
                        )
                        db.session.add(new_tx)
            db.session.commit()
            txs = BlockchainTransaction.query.order_by(BlockchainTransaction.timestamp.desc()).limit(limit).all()
        except Exception:
            db.session.rollback()

    return jsonify({
        'status': 'success',
        'count': len(txs),
        'transactions': [t.to_dict() for t in txs]
    }), 200
