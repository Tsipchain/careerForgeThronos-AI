"""CareerForge native auth — email/password login, HS256 JWT."""
import os
from datetime import datetime, timedelta, timezone
from flask import Blueprint, request, jsonify
import jwt

from ..db.store import create_account, verify_account, get_account_by_sub
from ..utils.auth import require_auth

bp = Blueprint('auth', __name__, url_prefix='/v1/auth')

_SECRET = os.getenv('JWT_SECRET_KEY', '')
_EXPIRE_MINUTES = int(os.getenv('JWT_EXPIRE_MINUTES', '1440'))  # 24 h default
_ISSUER = os.getenv('JWT_ISSUER', 'careerforge')
_AUDIENCE = os.getenv('JWT_AUDIENCE', 'careerforge')


def _make_token(sub: str, email: str, full_name: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        'sub': sub,
        'email': email,
        'full_name': full_name,
        'scopes': ['careerforge:read', 'careerforge:write'],
        'iss': _ISSUER,
        'aud': _AUDIENCE,
        'iat': now,
        'exp': now + timedelta(minutes=_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, _SECRET, algorithm='HS256')


@bp.post('/register')
def register():
    if not _SECRET:
        return jsonify({'error': 'auth_not_configured'}), 500
    body = request.get_json(force=True) or {}
    email = (body.get('email') or '').strip()
    password = (body.get('password') or '').strip()
    full_name = (body.get('full_name') or '').strip()
    if not email or not password:
        return jsonify({'error': 'email and password required'}), 400
    if len(password) < 8:
        return jsonify({'error': 'password must be at least 8 characters'}), 400
    account = create_account(email, password, full_name)
    if account is None:
        return jsonify({'error': 'email_already_registered'}), 409
    token = _make_token(account['sub'], account['email'], account['full_name'])
    return jsonify({'token': token, 'sub': account['sub'], 'email': account['email']}), 201


@bp.post('/login')
def login():
    if not _SECRET:
        return jsonify({'error': 'auth_not_configured'}), 500
    body = request.get_json(force=True) or {}
    email = (body.get('email') or '').strip()
    password = (body.get('password') or '').strip()
    account = verify_account(email, password)
    if not account:
        return jsonify({'error': 'invalid_credentials'}), 401
    token = _make_token(account['sub'], account['email'], account['full_name'])
    return jsonify({'token': token, 'sub': account['sub'], 'email': account['email']})


@bp.get('/me')
@require_auth(['careerforge:read'])
def me():
    u = request.thronos_user
    account = get_account_by_sub(u['sub'])
    return jsonify({
        'sub': u['sub'],
        'email': u.get('email'),
        'full_name': (account or {}).get('full_name', ''),
        'verifyid_verified': u.get('verifyid_verified', False),
        'scopes': u.get('scopes', []),
    })
