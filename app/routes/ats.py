"""
POST /v1/ats/score  — ATS health check + keyword coverage (costs 1 credit)
"""
import os
from flask import Blueprint, jsonify, request

from ..utils.auth import require_auth
from ..db.store import upsert_user, get_job, get_balance, add_credits, write_audit
from ..services.ai_core import ats_score

bp = Blueprint('ats', __name__, url_prefix='/v1/ats')

_COST_ATS = int(os.getenv('COST_ATS_SCORE', '1'))


@bp.post('/score')
@require_auth(['careerforge:write'])
def score():
    u = request.thronos_user
    upsert_user(u['sub'], u.get('email'), u.get('tenant_id'), u.get('verifyid_verified', False))

    body = request.get_json(force=True) or {}
    job_id = body.get('job_id', '')
    cv_text = body.get('cv_text', '').strip()
    options = body.get('options', {})

    if not job_id:
        return jsonify({'error': {'code': 'invalid_request', 'message': 'job_id is required'}}), 400
    if not cv_text:
        return jsonify({'error': {'code': 'invalid_request', 'message': 'cv_text is required'}}), 400

    job = get_job(job_id, u['sub'])
    if not job:
        return jsonify({'error': {'code': 'not_found', 'message': 'job_id not found or does not belong to user'}}), 404

    bal = get_balance(u['sub'])
    if bal < _COST_ATS:
        return jsonify({'error': {'code': 'insufficient_credits', 'balance': bal, 'required': _COST_ATS}}), 402

    result = ats_score(cv_text, job.get('parsed') or {}, options)

    add_credits(u['sub'], -_COST_ATS, reason='ats_score', ref_type='job', ref_id=job_id)
    write_audit(
        tenant_id=u.get('tenant_id') or 'default',
        actor_sub=u['sub'],
        action='ATS_SCORE',
        target_type='job',
        target_id=job_id,
        details={'credits_charged': _COST_ATS},
    )

    result['credits_charged'] = _COST_ATS
    return jsonify(result), 200
