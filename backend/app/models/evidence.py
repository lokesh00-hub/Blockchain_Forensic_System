from datetime import datetime
from .user import db

class Evidence(db.Model):
    __tablename__ = 'evidence'

    id = db.Column(db.Integer, primary_key=True)
    evidence_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    case_id = db.Column(db.String(50), db.ForeignKey('investigations.case_id'), nullable=False)
    filename = db.Column(db.String(255), nullable=False)
    category = db.Column(db.String(80), nullable=False, default='Disk Image')
    file_storage_path = db.Column(db.String(500), nullable=True)
    file_size_bytes = db.Column(db.BigInteger, default=0)
    sha256_hash = db.Column(db.String(64), nullable=False, index=True)
    blockchain_tx_id = db.Column(db.String(100), nullable=True)
    block_number = db.Column(db.Integer, default=498120)
    integrity_status = db.Column(db.String(50), default='Verified')  # Verified, Tampered, Missing, Unknown
    custodian = db.Column(db.String(120), default='Mr. Narra Lokesh Vardhan')
    description = db.Column(db.Text, nullable=True)
    registration_timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.evidence_id,
            'name': self.filename,
            'category': self.category,
            'caseId': self.case_id,
            'hash': self.sha256_hash,
            'txHash': self.blockchain_tx_id[:30] if self.blockchain_tx_id else '0x...',
            'fullTxHash': self.blockchain_tx_id,
            'blockNumber': self.block_number,
            'status': self.integrity_status,
            'timestamp': self.registration_timestamp.strftime('%Y-%m-%d %H:%M:%S') if self.registration_timestamp else None,
            'size': self._format_size(self.file_size_bytes),
            'custodian': self.custodian,
            'description': self.description
        }

    def _format_size(self, size_bytes):
        if not size_bytes:
            return 'N/A'
        for unit in ['Bytes', 'KB', 'MB', 'GB', 'TB']:
            if size_bytes < 1024.0:
                return f"{size_bytes:.2f} {unit}"
            size_bytes /= 1024.0
        return f"{size_bytes:.2f} PB"
