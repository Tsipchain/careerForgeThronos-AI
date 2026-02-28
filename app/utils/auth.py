import os
from functools import wraps
from typing import Callable, Any, Dict

import jwt
from flask import request, jsonify


def _load_public_key_pem() -> str:
    pem = os.getenv('JWT_PUBLIC_KEY_PEM', '')
    if pem.strip():
        return pem
    path = os.getenv('JWT_PUBLIC_KEY_PATH', '')
    if path:
        with open(path, 'r', encoding='utf-8') as f:
            return f.read()
    raise RuntimeError('JWT public key not configured (JWT_PUBLIC_KEY_PEM or JWT_PUBLIC_KEY_PATH)')


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
                public_key = _load_public_key_pem()
                payload: Dict[str, Any] = jwt.decode(
                    token,
                    public_key,
                    algorithms=['RS256'],
                    audience=os.getenv('JWT_AUDIENCE', None),
                    issuer=os.getenv('JWT_ISSUER', None),
                    options={'require': ['exp', 'sub']}
                )
            except Exception as e:
                return jsonify({'error': 'invalid_token', 'detail': str(e)}), 401

            token_scopes = set(payload.get('scopes', []) or payload.get('scope', '').split())
            for s in scopes_required:
                if s not in token_scopes:
                    return jsonify({'error': 'insufficient_scope', 'missing': s}), 403

            request.thronos_user = {
                'sub': payload.get('sub'),
                'email': payload.get('email'),
                'tenant_id': payload.get('tenant_id'),
                'verifyid_verified': bool(payload.get('verifyid_verified', False)),
                'scopes': list(token_scopes),
            }

            return fn(*args, **kwargs)
        return wrapper
    return decorator
