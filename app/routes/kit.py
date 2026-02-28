"""
GET  /v1/kit/list     — list user's kits
POST /v1/kit/generate — full Application Kit generation with credit burn + chain attestation
"""
import os
import json
import uuid
import hashlib
from flask import Blueprint, jsonify, request

from ..utils.auth import require_auth
from ..db.store import (
    upsert_user, get_balance, add_credits, save_kit, list_kits,
    get_job, get_profile, get_kit_by_idempotency, write_audit,
)
from ..services.attestation import build_ai_attestation_payload, build_ai_attestation_tx
from ..services.chain_client import submit_tx
from ..services.ai_core import generate_kit

bp = Blueprint('kit', __name__, url_prefix='/v1/kit')

# Credit costs per kit kind (override via env vars)
_COSTS = {
    'full': int(os.getenv('COST_FULL_KIT', '7')),
    'cv_only': int(os.getenv('COST_CV_ONLY', '3')),
    'ats_only': int(os.getenv('COST_ATS_ONLY', '1')),
    'cover_only': int(os.getenv('COST_COVER_ONLY', '2')),
}


@bp.get('/list')
@require_auth(['careerforge:read'])
def kits_list():
    u = request.thronos_user
    return jsonify({'kits': list_kits(u['sub'])})


@bp.post('/generate')
@require_auth(['careerforge:write'])
def generate():
    """Full Application Kit generation:
    1. Validate request + check credits
    2. Idempotency check (Idempotency-Key header or body field)
    3. Call AI core (or stub) for kit content
    4. Burn credits + write ledger
    5. Hash artifacts + submit AI_ATTESTATION to chain
    6. Persist kit + return response
    """
    u = request.thronos_user
    upsert_user(u['sub'], u.get('email'), u.get('tenant_id'), u.get('verifyid_verified', False))

    body = request.get_json(force=True) or {}

    # Idempotency key: header takes precedence over body
    idem_key = (
        request.headers.get('Idempotency-Key')
        or body.get('idempotency_key')
    )

    # Check idempotency — return cached response for duplicate keys
    if idem_key:
        existing = get_kit_by_idempotency(u['sub'], idem_key)
        if existing:
            artifacts = json.loads(existing['artifacts_json'])
            return jsonify({
                'kit_id': existing['id'],
                'idempotent_replay': True,
                'credits_charged': existing['credits_charged'],
                'attestation': {
                    'enabled': bool(existing.get('attestation_txid')),
                    'tx_type': 'AI_ATTESTATION',
                    'txid': existing.get('attestation_txid'),
                    'artifact_sha256': existing.get('artifact_sha256'),
                },
                'artifacts': artifacts,
            }), 200

    job_id = body.get('job_id', '')
    profile_id = body.get('profile_id', '')
    kind = body.get('kit_kind', 'full')
    outputs = body.get('outputs', {})
    constraints = body.get('constraints', {'no_metric_invention': True, 'ats_format': 'single_column'})

    if kind not in _COSTS:
        return jsonify({'error': {'code': 'invalid_request', 'message': f"kit_kind must be one of {list(_COSTS)}"}}), 400

    cost = _COSTS[kind]
    bal = get_balance(u['sub'])
    if bal < cost:
        return jsonify({'error': {'code': 'insufficient_credits', 'balance': bal, 'required': cost}}), 402

    # Load job + profile
    job = get_job(job_id, u['sub']) if job_id else {}
    profile_rec = get_profile(u['sub'])
    profile_data = profile_rec['data'] if profile_rec else {}

    # Generate kit via AI core (or stub)
    kit_content = generate_kit(profile_data, job or {}, outputs, constraints)

    artifacts_json = json.dumps(kit_content, ensure_ascii=False, sort_keys=True)
    artifact_sha = hashlib.sha256(artifacts_json.encode('utf-8')).hexdigest()
    job_fp = job.get('job_fingerprint_sha256') if job else None

    # Build and submit chain attestation
    attest_payload = build_ai_attestation_payload(
        artifact_type=kind,
        artifact_sha256_hex=artifact_sha,
        artifact_version='v1.0',
        model_id=body.get('model_id', os.getenv('DEFAULT_MODEL_ID', 'thronos-ai:careerforge')),
        tenant_id=u.get('tenant_id') or 'default',
        verifyid_verified=bool(u.get('verifyid_verified', False)),
        job_fingerprint_sha256_hex=job_fp,
    )

    chain_res = {}
    attest_txid = None
    attest_enabled = bool(os.getenv('ATTESTOR_PRIVKEY_HEX', '').strip())

    if attest_enabled:
        try:
            tx = build_ai_attestation_tx(attest_payload)
            attest_txid = tx['txid']
            chain_res = submit_tx(tx)
        except Exception as exc:
            chain_res = {'error': str(exc)}

    # Burn credits
    add_credits(u['sub'], -cost, reason='kit_generate', ref_type='kit', ref_id=job_id or kind)

    # Persist kit
    kit_id = 'kit_' + uuid.uuid4().hex[:20]
    save_kit(
        kit_id=kit_id,
        sub=u['sub'],
        tenant_id=u.get('tenant_id') or 'default',
        job_id=job_id or None,
        profile_id=profile_id or (profile_rec['profile_id'] if profile_rec else None),
        kind=kind,
        credits_charged=cost,
        idempotency_key=idem_key,
        artifacts_json=artifacts_json,
        attestation_txid=attest_txid,
        artifact_sha256=artifact_sha,
    )

    write_audit(
        tenant_id=u.get('tenant_id') or 'default',
        actor_sub=u['sub'],
        action='KIT_GENERATE',
        target_type='kit',
        target_id=kit_id,
        details={'kind': kind, 'credits_charged': cost, 'job_id': job_id},
    )

    return jsonify({
        'kit_id': kit_id,
        'credits_charged': cost,
        'balance_after': get_balance(u['sub']),
        'artifacts': kit_content,
        'attestation': {
            'enabled': attest_enabled,
            'tx_type': 'AI_ATTESTATION',
            'txid': attest_txid,
            'artifact_sha256': artifact_sha,
            'job_fingerprint_sha256': job_fp,
        },
        'chain_response': chain_res,
    }), 200
