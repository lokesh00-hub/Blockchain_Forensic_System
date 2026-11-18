from datetime import datetime
from .user import db

class BlockchainTransaction(db.Model):
    __tablename__ = 'blockchain_transactions'

    id = db.Column(db.Integer, primary_key=True)
    tx_hash = db.Column(db.String(100), unique=True, nullable=False, index=True)
    tx_type = db.Column(db.String(80), nullable=False)  # Evidence Registration, Verification Record, Case Update
    status = db.Column(db.String(30), default='Confirmed')
    block_number = db.Column(db.Integer, default=498120)
    contract_address = db.Column(db.String(60), default='0x5FbDB2315678afecb367f032d93F642f64180aa3')
    evidence_id = db.Column(db.String(50), nullable=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'hash': self.tx_hash[:30] + '...' if len(self.tx_hash) > 30 else self.tx_hash,
            'fullHash': self.tx_hash,
            'type': self.tx_type,
            'status': self.status,
            'block': self.block_number,
            'time': self.timestamp.strftime('%b %d, %H:%M') if self.timestamp else None,
            'evidenceId': self.evidence_id
        }

class ChainOfCustody(db.Model):
    __tablename__ = 'chain_of_custody'

    id = db.Column(db.Integer, primary_key=True)
    evidence_id = db.Column(db.String(50), nullable=False, index=True)
    action = db.Column(db.String(100), nullable=False)  # ACQUIRED, HASHED, ANCHORED, TRANSFERRED, VERIFIED
    actor = db.Column(db.String(120), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    tx_hash = db.Column(db.String(100), nullable=True)
    details = db.Column(db.Text, nullable=True)

    def to_dict(self):
        return {
            'id': self.id,
            'evidenceId': self.evidence_id,
            'action': self.action,
            'actor': self.actor,
            'time': self.timestamp.strftime('%Y-%m-%d %H:%M:%S') if self.timestamp else None,
            'txHash': self.tx_hash,
            'details': self.details
        }
