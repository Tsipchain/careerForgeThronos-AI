"""KYC proxy routes — submit docs to VerifyID and poll status."""
import os
import requests
from flask import Blueprint, request, jsonify

from ..utils.auth import require_auth
from ..db.store import get_balance, has_free_pack, upsert_user

bp = Blueprint('kyc', __name__, url_prefix='/v1/kyc')

_VERIFYID_API = os.getenv('VERIFYID_API_URL', 'https://verifyid-api.thronoschain.org')


@bp.post('/submit')
@require_auth(['careerforge:write'])
def submit():
    """Proxy document upload to VerifyID, injecting the user's sub as external_user_id."""
    u = request.thronos_user
    body = request.get_json(force=True) or {}

    required = ['full_name', 'document_number', 'date_of_birth', 'nationality', 'front_image']
    missing = [f for f in required if not body.get(f)]
    if missing:
        return jsonify({'error': f'Missing fields: {missing}'}), 400

    payload = {
        'document_type': body.get('document_type', 'passport'),
        'full_name': body['full_name'],
        'document_number': body['document_number'],
        'date_of_birth': body['date_of_birth'],
        'nationality': body['nationality'],
        'front_image': body['front_image'],
        'back_image': body.get('back_image'),
        'external_user_id': u['sub'],  # links verification back to CareerForge user
    }

    try:
        resp = requests.post(
            f'{_VERIFYID_API}/api/v1/client/verifications/upload',
            json=payload,
            timeout=30,
        )
        data = resp.json()
        if not resp.ok:
            return jsonify({'error': data.get('detail', 'VerifyID error'), 'code': resp.status_code}), 502
        return jsonify({
            'verification_id': data.get('verification_id'),
            'status': data.get('status', 'pending'),
        })
    except requests.Timeout:
        return jsonify({'error': 'VerifyID timeout'}), 504
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.get('/status')
@require_auth(['careerforge:read'])
def status():
    """Return KYC + bonus status for the current user."""
    u = request.thronos_user
    upsert_user(u['sub'], u.get('email'), u.get('tenant_id'), u.get('verifyid_verified', False))
    verified = u.get('verifyid_verified', False)
    bonus_received = has_free_pack(u['sub'])
    balance = get_balance(u['sub'])
    return jsonify({
        'verified': verified,
        'bonus_received': bonus_received,
        'balance': balance,
    })


@bp.get('/poll/<int:verification_id>')
@require_auth(['careerforge:read'])
def poll(verification_id: int):
    """Poll VerifyID for a specific verification status."""
    try:
        resp = requests.get(
            f'{_VERIFYID_API}/api/v1/client/verifications/{verification_id}/status',
            timeout=10,
        )
        data = resp.json()
        if not resp.ok:
            return jsonify({'error': data.get('detail', 'error')}), 502
        return jsonify({
            'verification_id': data.get('verification_id'),
            'status': data.get('status'),
            'ai_score': data.get('ai_score'),
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
