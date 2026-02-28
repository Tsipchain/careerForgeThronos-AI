import os
from flask import Blueprint, jsonify, request

from ..utils.auth import require_auth
from ..services.attestation import (
    build_ai_attestation_payload,
    build_ai_attestation_tx,
    build_ai_service_register_payload,
    build_ai_service_register_tx,
)
from ..services.chain_client import submit_tx

bp = Blueprint('attestation', __name__, url_prefix='/v1/attestation')


@bp.post('/register-service')
@require_auth(['careerforge:write'])
def register_service():
    # Registers this service key in chain registry.
    body = request.get_json(force=True) or {}
    service_name = body.get('service_name', 'careerforge')
    pubkey = os.getenv('ATTESTOR_PUBKEY_HEX', '').strip().lower()
    if not pubkey:
        # computed during tx build anyway; require explicit for registry payload
        from ..utils.crypto_secp256k1 import pubkey_from_privkey_hex
        priv = os.getenv('ATTESTOR_PRIVKEY_HEX', '').strip()
        if not priv:
            return jsonify({'error': 'ATTESTOR_PRIVKEY_HEX not set'}), 500
        pubkey = pubkey_from_privkey_hex(priv)

    scopes = body.get('scopes') or ['ai:attest']

    payload = build_ai_service_register_payload(service_name=service_name, pubkey_hex=pubkey, scopes=scopes)
    tx = build_ai_service_register_tx(payload)
    res = submit_tx(tx)
    return jsonify({'submitted': True, 'txid': tx['txid'], 'chain_response': res})


@bp.post('/submit')
@require_auth(['careerforge:write'])
def submit_attestation():
    body = request.get_json(force=True) or {}

    payload = build_ai_attestation_payload(
        artifact_type=body['artifact_type'],
        artifact_sha256_hex=body['artifact_sha256'],
        artifact_version=body.get('artifact_version', 'v1.0'),
        model_id=body.get('model_id', 'thronos-ai:default'),
        tenant_id=body.get('tenant_id') or (request.thronos_user.get('tenant_id') or 'default'),
        verifyid_verified=bool(body.get('verifyid_verified', request.thronos_user.get('verifyid_verified', False))),
        job_fingerprint_sha256_hex=body.get('job_fingerprint_sha256'),
    )

    tx = build_ai_attestation_tx(payload)
    res = submit_tx(tx)
    return jsonify({'submitted': True, 'txid': tx['txid'], 'chain_response': res})
