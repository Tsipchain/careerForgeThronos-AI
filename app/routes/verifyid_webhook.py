"""Internal webhook: called by thronos-verifyid after a user's KYC is finalized.

Grants one free CareerForge pack (30 credits) to the verified user.
Idempotent – a second call for the same user returns ok=True, granted=False.

Security: requires X-Internal-Key header matching VERIFYID_INTERNAL_KEY env var.
"""
import os

from flask import Blueprint, request, jsonify

from ..db.store import add_credits, upsert_user, has_free_pack

bp = Blueprint('verifyid_webhook', __name__, url_prefix='/v1/verifyid')

_FREE_PACK_CREDITS = 30
_INTERNAL_KEY = os.getenv('VERIFYID_INTERNAL_KEY', '')


@bp.post('/callback')
def verifyid_callback():
    """Called by VerifyID when a user's KYC is finalized (COMPLETED status).

    Expected JSON body:
        user_id        str   – VerifyID user_id (maps to CareerForge sub)
        verification_id int  – VerifyID DocumentVerification PK (for audit trail)
        email          str   – optional user email
        tenant_id      str   – optional tenant

    Returns:
        200  { ok, granted, credits, sub }
        401  unauthorized (wrong internal key)
        400  missing user_id
    """
    key = request.headers.get('X-Internal-Key', '')
    if _INTERNAL_KEY and key != _INTERNAL_KEY:
        return jsonify({'error': 'unauthorized'}), 401

    body = request.get_json(force=True) or {}
    sub = (body.get('sub') or body.get('user_id') or '').strip()
    if not sub:
        return jsonify({'error': 'missing sub or user_id'}), 400

    verification_id = body.get('verification_id')
    email = body.get('email')
    tenant_id = body.get('tenant_id')

    # Ensure user record exists and mark as KYC-verified
    upsert_user(sub, email, tenant_id, verifyid_verified=True)

    # Idempotent: grant only once per user
    if has_free_pack(sub):
        return jsonify({
            'ok': True,
            'granted': False,
            'reason': 'already_granted',
            'sub': sub,
        })

    add_credits(
        sub,
        _FREE_PACK_CREDITS,
        reason='verifyid_free_pack',
        ref_type='verifyid_verification',
        ref_id=str(verification_id) if verification_id is not None else None,
    )

    return jsonify({
        'ok': True,
        'granted': True,
        'credits': _FREE_PACK_CREDITS,
        'sub': sub,
    })
