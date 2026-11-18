from datetime import datetime
from .user import db

class Alert(db.Model):
    __tablename__ = 'alerts'

    id = db.Column(db.Integer, primary_key=True)
    alert_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    alert_type = db.Column(db.String(80), nullable=False)  # MODIFICATION, DELETION, MISMATCH, SUSPICIOUS
    severity = db.Column(db.String(30), nullable=False, default='critical')  # critical, warning, info, low
    text = db.Column(db.String(500), nullable=False)
    evidence_id = db.Column(db.String(50), nullable=True)
    case_id = db.Column(db.String(50), nullable=True)
    acknowledged = db.Column(db.Boolean, default=False)
    acknowledged_by = db.Column(db.String(120), nullable=True)
    acknowledged_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.alert_id,
            'type': self.alert_type,
            'severity': self.severity,
            'text': self.text,
            'evidenceId': self.evidence_id,
            'caseId': self.case_id,
            'acknowledged': self.acknowledged,
            'acknowledgedBy': self.acknowledged_by,
            'time': self.created_at.strftime('%Y-%m-%d %H:%M:%S') if self.created_at else None
        }
