"""
POST /v1/cv/analyze   — upload PDF/text CV, get AI analysis + ATS score (2 credits)
GET  /v1/cv/list      — list user's CV analyses
GET  /v1/cv/<id>      — get full analysis detail
POST /v1/cv/visibility — opt-in/out of recruiter candidate pool
"""
import hashlib
import io
import json
import os
import uuid
from flask import Blueprint, jsonify, request

import pdfplumber

from ..utils.auth import require_auth
from ..db.store import (
    upsert_user, get_balance, add_credits, write_audit,
    save_cv_analysis, list_cv_analyses, get_cv_analysis,
    set_candidate_visibility,
)
from ..services.ai_core import analyze_cv
from ..services.attestation import build_ai_attestation_payload, build_ai_attestation_tx
from ..services.chain_client import submit_tx

bp = Blueprint('cv', __name__, url_prefix='/v1/cv')

_COST_ANALYZE = int(os.getenv('COST_CV_ANALYZE', '2'))
_MAX_PDF_BYTES = 8 * 1024 * 1024  # 8 MB


def _extract_pdf_text(file_bytes: bytes) -> str:
    """Extract plain text from a PDF using pdfplumber."""
    text_parts = []
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            t = page.extract_text()
            if t:
                text_parts.append(t)
    return '\n'.join(text_parts)


def _extract_text(file_bytes: bytes, filename: str) -> str:
    """Dispatch to the right extractor based on file extension."""
    fname = (filename or '').lower()
    if fname.endswith('.pdf'):
        return _extract_pdf_text(file_bytes)
    # Plain text / other — decode directly
    try:
        return file_bytes.decode('utf-8', errors='replace')
    except Exception:
        return ''


@bp.post('/analyze')
@require_auth(['careerforge:write'])
def analyze():
    """Accept a PDF upload or raw CV text, analyse it, burn 2 credits, attest on-chain."""
    u = request.thronos_user
    upsert_user(u['sub'], u.get('email'), u.get('tenant_id'), u.get('verifyid_verified', False))

    cv_text = ''
    filename = 'cv.txt'

    # Accept multipart file upload OR JSON with cv_text field
    if request.files and 'file' in request.files:
        f = request.files['file']
        filename = f.filename or 'cv.pdf'
        raw_bytes = f.read(_MAX_PDF_BYTES + 1)
        if len(raw_bytes) > _MAX_PDF_BYTES:
            return jsonify({'error': {'code': 'file_too_large', 'message': 'Max 8 MB'}}), 413
        cv_text = _extract_text(raw_bytes, filename)
    else:
        body = request.get_json(force=True) or {}
        cv_text = body.get('cv_text', '').strip()
        filename = body.get('filename', 'cv.txt')

    if len(cv_text) < 50:
        return jsonify({'error': {'code': 'invalid_request',
                                  'message': 'CV text is too short (min 50 characters)'}}), 400

    bal = get_balance(u['sub'])
    if bal < _COST_ANALYZE:
        return jsonify({'error': {'code': 'insufficient_credits',
                                  'balance': bal, 'required': _COST_ANALYZE}}), 402

    # Run analysis
    options = {}
    analysis = analyze_cv(cv_text, options)
    ats_score_val = int(analysis.get('ats_score', 0))

    # Hash for attestation
    payload_str = json.dumps(analysis, ensure_ascii=False, sort_keys=True)
    artifact_sha = hashlib.sha256(payload_str.encode('utf-8')).hexdigest()

    # On-chain attestation
    attest_txid = None
    chain_res = {}
    attest_enabled = bool(os.getenv('ATTESTOR_PRIVKEY_HEX', '').strip())
    if attest_enabled:
        try:
            attest_payload = build_ai_attestation_payload(
                artifact_type='cv_analysis',
                artifact_sha256_hex=artifact_sha,
                artifact_version='v1.0',
                model_id=os.getenv('DEFAULT_MODEL_ID', 'thronos-ai:careerforge'),
                tenant_id=u.get('tenant_id') or 'default',
                verifyid_verified=bool(u.get('verifyid_verified', False)),
                job_fingerprint_sha256_hex=None,
            )
            tx = build_ai_attestation_tx(attest_payload)
            attest_txid = tx['txid']
            chain_res = submit_tx(tx)
        except Exception as exc:
            chain_res = {'error': str(exc)}

    # Burn credits & persist
    add_credits(u['sub'], -_COST_ANALYZE, reason='cv_analyze', ref_type='cv', ref_id=artifact_sha[:16])
    analysis_id = 'cva_' + uuid.uuid4().hex[:20]
    save_cv_analysis(
        analysis_id=analysis_id,
        sub=u['sub'],
        filename=filename,
        raw_text=cv_text[:50_000],  # cap stored text at 50 k chars
        analysis=analysis,
        ats_score_val=ats_score_val,
        artifact_sha256=artifact_sha,
        attestation_txid=attest_txid,
        credits_charged=_COST_ANALYZE,
    )

    write_audit(
        tenant_id=u.get('tenant_id') or 'default',
        actor_sub=u['sub'],
        action='CV_ANALYZE',
        target_type='cv_analysis',
        target_id=analysis_id,
        details={'credits_charged': _COST_ANALYZE, 'ats_score': ats_score_val},
    )

    return jsonify({
        'analysis_id': analysis_id,
        'credits_charged': _COST_ANALYZE,
        'balance_after': get_balance(u['sub']),
        'analysis': analysis,
        'attestation': {
            'enabled': attest_enabled,
            'tx_type': 'AI_ATTESTATION',
            'txid': attest_txid,
            'artifact_sha256': artifact_sha,
        },
    }), 200


@bp.get('/list')
@require_auth(['careerforge:read'])
def list_analyses():
    u = request.thronos_user
    return jsonify({'analyses': list_cv_analyses(u['sub'])}), 200


@bp.get('/<analysis_id>')
@require_auth(['careerforge:read'])
def get_analysis(analysis_id: str):
    u = request.thronos_user
    rec = get_cv_analysis(analysis_id, u['sub'])
    if not rec:
        return jsonify({'error': {'code': 'not_found', 'message': 'Analysis not found'}}), 404
    # Never return raw_text in GET (PII reduction)
    rec.pop('raw_text', None)
    return jsonify(rec), 200


@bp.post('/visibility')
@require_auth(['careerforge:write'])
def visibility():
    """Opt-in or opt-out of the recruiter candidate pool."""
    u = request.thronos_user
    body = request.get_json(force=True) or {}
    visible = bool(body.get('visible', False))
    desired_roles = body.get('desired_roles', [])
    desired_locations = body.get('desired_locations', [])
    keywords = body.get('keywords', [])

    set_candidate_visibility(
        sub=u['sub'],
        visible=visible,
        desired_roles=desired_roles,
        desired_locations=desired_locations,
        keywords=keywords,
    )

    write_audit(
        tenant_id=u.get('tenant_id') or 'default',
        actor_sub=u['sub'],
        action='CANDIDATE_VISIBILITY_SET',
        details={'visible': visible},
    )

    return jsonify({'ok': True, 'visible': visible}), 200
