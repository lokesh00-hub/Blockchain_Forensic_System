from datetime import datetime
from .user import db

class Investigation(db.Model):
    __tablename__ = 'investigations'

    id = db.Column(db.Integer, primary_key=True)
    case_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=False)
    severity = db.Column(db.String(30), nullable=False, default='Critical')  # Critical, High, Medium, Low
    status = db.Column(db.String(30), nullable=False, default='Active')       # Active, Under Review, Closed
    incident_date = db.Column(db.String(50), default=lambda: datetime.utcnow().strftime('%Y-%m-%d'))
    investigator_name = db.Column(db.String(120), default='Mr. Narra Lokesh Vardhan')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    evidence_items = db.relationship('Evidence', backref='investigation', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'caseId': self.case_id,
            'case_id': self.case_id,
            'title': self.title,
            'description': self.description,
            'severity': self.severity,
            'status': self.status,
            'date': self.incident_date,
            'investigator': self.investigator_name,
            'evidenceCount': len(self.evidence_items) if self.evidence_items else 0,
            'createdAt': self.created_at.isoformat() if self.created_at else None
        }
