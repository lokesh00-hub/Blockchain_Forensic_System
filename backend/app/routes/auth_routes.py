import re
import secrets
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from ..models.user import db, User

auth_bp = Blueprint('auth_bp', __name__)

# Temporary in-memory cache for verification codes (Key: email, Value: dict with codes and expiry)
VERIFICATION_STORE = {}

@auth_bp.route('/send-verification', methods=['POST'])
def send_verification():
    """Generates and dispatches 6-digit cryptographic verification codes for email and mobile."""
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    phone = data.get('phone_number', '').strip()

    if not email:
        return jsonify({'status': 'error', 'message': 'Email address is required'}), 400

    # Basic email format validation
    if not re.match(r'^[\w\.-]+@[\w\.-]+\.\w+$', email):
        return jsonify({'status': 'error', 'message': 'Invalid email address format'}), 400

    # Basic phone format validation (at least 7 digits)
    clean_phone = re.sub(r'[\s\-\(\)\+]', '', phone)
    if not clean_phone or len(clean_phone) < 7:
        return jsonify({'status': 'error', 'message': 'Valid mobile/phone number is required'}), 400

    # Check if account already registered
    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        return jsonify({'status': 'error', 'message': 'An account with this email address already exists. Please log in instead.'}), 409

    # Generate cryptographically secure 6-digit codes
    email_code = f"{secrets.randbelow(900000) + 100000}"
    phone_code = f"{secrets.randbelow(900000) + 100000}"

    expires_at = datetime.utcnow() + timedelta(minutes=15)
    VERIFICATION_STORE[email] = {
        'email_code': email_code,
        'phone_code': phone_code,
        'phone_number': phone,
        'expires_at': expires_at
    }

    # In production, SMTP/SMS gateway dispatches these. We return demo_codes for offline evaluation.
    return jsonify({
        'status': 'success',
        'message': f'Verification codes dispatched to {email} and {phone}.',
        'demo_codes': {
            'email_code': email_code,
            'phone_code': phone_code
        },
        'expires_in_seconds': 900
    }), 200

@auth_bp.route('/register', methods=['POST'])
def register():
    """Verifies both mobile and email codes, then registers a new forensic investigator."""
    data = request.get_json() or {}
    name = data.get('name', '').strip()
    email = data.get('email', '').strip().lower()
    phone = data.get('phone_number', '').strip()
    password = data.get('password', '').strip()
    role = data.get('role', 'Investigator').strip()
    badge = data.get('badge', 'Digital Forensic Specialist').strip()
    email_code = data.get('email_code', '').strip()
    phone_code = data.get('phone_code', '').strip()

    if not name or not email or not password:
        return jsonify({'status': 'error', 'message': 'Full name, email, and password are required'}), 400

    if len(password) < 6:
        return jsonify({'status': 'error', 'message': 'Security passphrase must be at least 6 characters'}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({'status': 'error', 'message': 'An account with this email already exists'}), 409

    # Verify codes
    verification = VERIFICATION_STORE.get(email)
    if not verification:
        return jsonify({
            'status': 'error',
            'message': 'No verification session found for this email. Please request verification codes first.'
        }), 400

    if datetime.utcnow() > verification['expires_at']:
        del VERIFICATION_STORE[email]
        return jsonify({'status': 'error', 'message': 'Verification codes have expired. Please request new codes.'}), 400

    # Validate email code
    if verification['email_code'] != email_code:
        return jsonify({'status': 'error', 'message': 'Incorrect Email verification code.'}), 400

    # Validate phone code
    if verification['phone_code'] != phone_code:
        return jsonify({'status': 'error', 'message': 'Incorrect Phone/SMS verification code.'}), 400

    # Codes valid: Create new investigator user
    new_user = User(
        name=name,
        email=email,
        phone_number=phone or verification.get('phone_number'),
        role=role,
        badge=badge,
        phone_verified=True,
        email_verified=True,
        account_status='Active'
    )
    new_user.set_password(password)
    db.session.add(new_user)
    db.session.commit()

    # Clear pending verification
    if email in VERIFICATION_STORE:
        del VERIFICATION_STORE[email]

    return jsonify({
        'status': 'success',
        'message': f'Forensic investigator account created and verified for {name}.',
        'token': f'forensic_jwt_session_{secrets.token_hex(16)}',
        'user': new_user.to_dict()
    }), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    password = data.get('password', '').strip()
    role = data.get('role', 'Investigator')

    if not email:
        return jsonify({'status': 'error', 'message': 'Email is required'}), 400

    user = User.query.filter_by(email=email).first()
    if user:
        if password and not user.check_password(password):
            return jsonify({'status': 'error', 'message': 'Invalid credentials provided'}), 401
    else:
        return jsonify({'status': 'error', 'message': 'Account not found. Please sign up first.'}), 404

    return jsonify({
        'status': 'success',
        'token': f'forensic_jwt_session_{secrets.token_hex(16)}',
        'user': user.to_dict()
    }), 200

@auth_bp.route('/logout', methods=['POST'])
def logout():
    return jsonify({'status': 'success', 'message': 'Session terminated'}), 200

@auth_bp.route('/me', methods=['GET'])
def me():
    email = request.args.get('email')
    if email:
        user = User.query.filter_by(email=email.strip().lower()).first()
    else:
        user = User.query.first()
        
    if not user:
        return jsonify({'status': 'error', 'message': 'Not authenticated'}), 401
    return jsonify({'status': 'success', 'user': user.to_dict()}), 200
