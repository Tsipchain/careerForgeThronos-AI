import os
from functools import wraps
from typing import Callable, Any, Dict

import jwt
from flask import request, jsonify


def _decode_token(token: str) -> Dict[str, Any]:
    """Try HS256 (native CareerForge login) first, fall back to RS256 (Thronos SSO)."""
    aud = os.getenv('JWT_AUDIENCE') or None
    iss = os.getenv('JWT_ISSUER') or None
    opts = {'require': ['exp', 'sub']}

    secret = os.getenv('JWT_SECRET_KEY', '')
    if secret:
        try:
            return jwt.decode(token, secret, algorithms=['HS256'],
                              audience=aud, issuer=iss, options=opts)
        except jwt.InvalidTokenError:
            pass  # Not a native token, try RS256

    # RS256 fallback (external Thronos SSO)
    pem = os.getenv('JWT_PUBLIC_KEY_PEM', '').strip()
    if not pem:
        path = os.getenv('JWT_PUBLIC_KEY_PATH', '')
        if path:
            with open(path, 'r', encoding='utf-8') as f:
                pem = f.read()
    if not pem:
        raise RuntimeError('No JWT secret or public key configured')

    return jwt.decode(token, pem, algorithms=['RS256'],
                      audience=aud, issuer=iss, options=opts)


def require_auth(scopes_required=None):
    scopes_required = scopes_required or []

    def decorator(fn: Callable[..., Any]):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            auth = request.headers.get('Authorization', '')
            if not auth.startswith('Bearer '):
                return jsonify({'error': 'missing_bearer_token'}), 401
            token = auth.split(' ', 1)[1].strip()

            try:
                payload: Dict[str, Any] = _decode_token(token)
            except Exception as e:
                return jsonify({'error': 'invalid_token', 'detail': str(e)}), 401

            token_scopes = set(payload.get('scopes', []) or payload.get('scope', '').split())
            for s in scopes_required:
                if s not in token_scopes:
                    return jsonify({'error': 'insufficient_scope', 'missing': s}), 403

            request.thronos_user = {
                'sub': payload.get('sub'),
                'email': payload.get('email'),
                'full_name': payload.get('full_name', ''),
                'tenant_id': payload.get('tenant_id'),
                'verifyid_verified': bool(payload.get('verifyid_verified', False)),
                'scopes': list(token_scopes),
            }

            return fn(*args, **kwargs)
        return wrapper
    return decorator
