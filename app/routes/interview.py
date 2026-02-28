"""
POST /v1/interview/prepare  — interview prep pack (costs 3 credits)
"""
import os
from flask import Blueprint, jsonify, request

from ..utils.auth import require_auth
from ..db.store import upsert_user, get_job, get_profile, get_balance, add_credits, write_audit
from ..services.ai_core import generate_interview_pack

bp = Blueprint('interview', __name__, url_prefix='/v1/interview')

_COST = int(os.getenv('COST_INTERVIEW_PACK', '3'))


@bp.post('/prepare')
@require_auth(['careerforge:write'])
def prepare():
    u = request.thronos_user
    upsert_user(u['sub'], u.get('email'), u.get('tenant_id'), u.get('verifyid_verified', False))

    body = request.get_json(force=True) or {}
    job_id = body.get('job_id', '')
    profile_id = body.get('profile_id', '')
    company_context = body.get('company_context', {})

    if not job_id:
        return jsonify({'error': {'code': 'invalid_request', 'message': 'job_id is required'}}), 400

    job = get_job(job_id, u['sub'])
    if not job:
        return jsonify({'error': {'code': 'not_found', 'message': 'job_id not found'}}), 404

    profile_rec = get_profile(u['sub'])
    profile_data = profile_rec['data'] if profile_rec else {}

    bal = get_balance(u['sub'])
    if bal < _COST:
        return jsonify({'error': {'code': 'insufficient_credits', 'balance': bal, 'required': _COST}}), 402

    pack = generate_interview_pack(profile_data, job, company_context)

    add_credits(u['sub'], -_COST, reason='interview_prepare', ref_type='job', ref_id=job_id)
    write_audit(
        tenant_id=u.get('tenant_id') or 'default',
        actor_sub=u['sub'],
        action='INTERVIEW_PREPARE',
        target_type='job',
        target_id=job_id,
        details={'credits_charged': _COST},
    )

    return jsonify({'interview_pack': pack, 'credits_charged': _COST}), 200
