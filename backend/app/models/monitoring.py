from datetime import datetime
from .user import db

class MonitoredFile(db.Model):
    __tablename__ = 'monitored_files'

    id = db.Column(db.Integer, primary_key=True)
    file_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    filename = db.Column(db.String(255), nullable=False)
    filepath = db.Column(db.String(500), nullable=False)
    baseline_hash = db.Column(db.String(64), nullable=False)  # 'NO_BASELINE' if unbaselined
    current_hash = db.Column(db.String(64), nullable=True)
    monitoring_status = db.Column(db.String(50), default='Unchanged')  # Unchanged, Modified, Missing, Disabled, Unknown Baseline
    check_frequency = db.Column(db.String(20), default='60s')
    evidence_id = db.Column(db.String(50), nullable=True)
    last_checked_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Historical event log
    events = db.relationship('MonitoringEvent', backref='target_file', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.file_id,
            'filename': self.filename,
            'path': self.filepath,
            'baselineHash': self.baseline_hash,
            'currentHash': self.current_hash or self.baseline_hash,
            'status': self.monitoring_status,
            'frequency': self.check_frequency,
            'evidenceId': self.evidence_id,
            'lastChecked': self.last_checked_at.strftime('%Y-%m-%d %H:%M:%S') if self.last_checked_at else 'Never'
        }

class MonitoringEvent(db.Model):
    __tablename__ = 'monitoring_events'

    id = db.Column(db.Integer, primary_key=True)
    monitored_file_id = db.Column(db.Integer, db.ForeignKey('monitored_files.id'), nullable=False)
    event_type = db.Column(db.String(50), nullable=False)  # INTEGRITY_CHECK, MODIFICATION, DELETION, BASELINE_REGISTERED
    previous_hash = db.Column(db.String(64), nullable=True)
    current_hash = db.Column(db.String(64), nullable=True)
    event_status = db.Column(db.String(50), nullable=False)  # Unchanged, Modified, Missing
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    details = db.Column(db.Text, nullable=True)

    def to_dict(self):
        return {
            'id': self.id,
            'eventType': self.event_type,
            'previousHash': self.previous_hash,
            'currentHash': self.current_hash,
            'status': self.event_status,
            'time': self.timestamp.strftime('%Y-%m-%d %H:%M:%S') if self.timestamp else None,
            'details': self.details
        }
