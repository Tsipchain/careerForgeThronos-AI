import os
import json
import uuid
import hashlib
from flask import Blueprint, jsonify, request

from ..utils.auth import require_auth
from ..db.store import upsert_user, get_balance, add_credits, save_kit, list_kits
from ..services.attestation import build_ai_attestation_payload, build_ai_attestation_tx
from ..services.chain_client import submit_tx

bp = Blueprint('kit', __name__, url_prefix='/v1/kit')


def _cost(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, str(default)))
    except Exception:
        return default


@bp.get('/list')
@require_auth(['careerforge:read'])
def kits_list():
    u = request.thronos_user
    return jsonify({'kits': list_kits(u['sub'])})


@bp.post('/generate')
@require_auth(['careerforge:write'])
def generate():
    """MVP stub:
    - consumes credits (COST_FULL_KIT)
    - creates a minimal 'kit' JSON output
    - writes AI_ATTESTATION on-chain (hash only)

    Replace the stub generator with your real LLM pipeline / n8n orchestration.
    """

    u = request.thronos_user
    upsert_user(u['sub'], u.get('email'), u.get('tenant_id'), u.get('verifyid_verified', False))

    body = request.get_json(force=True) or {}
    job_title = body.get('job_title', 'Untitled Role')
    jd_text = body.get('job_description', '')

    cost = _cost('COST_FULL_KIT', 7)
    bal = get_balance(u['sub'])
    if bal < cost:
        return jsonify({'error': 'insufficient_credits', 'balance': bal, 'required': cost}), 402

    # burn credits
    add_credits(u['sub'], -cost, reason='kit_generate', ref_type='job', ref_id=job_title)

    # --- STUB OUTPUT (replace with real LLM output) ---
    kit = {
        'summary': f"Tailored kit for: {job_title}",
        'ats_notes': [
            'Use 1-column layout, no tables.',
            'Mirror key terms from the JD naturally.',
            'Quantify impact (latency, cost, revenue, users).'
        ],
        'cv_bullets_example': [
            'Designed and shipped REST APIs, improving response latency by 30%.',
            'Implemented CI/CD pipelines reducing deployment time by 60%.'
        ],
        'cover_letter_snippet': 'I am applying for the role and bring proven impact in scalable systems...'
    }

    artifacts_json = json.dumps(kit, ensure_ascii=False)

    # Hash of the artifact
    artifact_sha = hashlib.sha256(artifacts_json.encode('utf-8')).hexdigest()

    # Job fingerprint hash (normalized light)
    job_fp = hashlib.sha256(jd_text.strip().encode('utf-8')).hexdigest() if jd_text else None

    # On-chain attestation
    payload = build_ai_attestation_payload(
        artifact_type='full_kit',
        artifact_sha256_hex=artifact_sha,
        artifact_version='v1.0',
        model_id=body.get('model_id', 'thronos-ai:careerforge'),
        tenant_id=u.get('tenant_id') or 'default',
        verifyid_verified=bool(u.get('verifyid_verified', False)),
        job_fingerprint_sha256_hex=job_fp,
    )
    tx = build_ai_attestation_tx(payload)
    chain_res = submit_tx(tx)

    kit_id = str(uuid.uuid4())
    save_kit(kit_id, u['sub'], u.get('tenant_id') or 'default', job_title, artifacts_json, attestation_txid=tx['txid'])

    return jsonify({
        'kit_id': kit_id,
        'balance_after': get_balance(u['sub']),
        'artifacts': kit,
        'attestation': {'txid': tx['txid'], 'artifact_sha256': artifact_sha, 'job_fingerprint_sha256': job_fp},
        'chain_response': chain_res,
    })
