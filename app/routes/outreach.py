"""
POST /v1/outreach/generate  — email/DM scripts + follow-up cadence (costs 2 credits)
"""
import os
from flask import Blueprint, jsonify, request

from ..utils.auth import require_auth
from ..db.store import upsert_user, get_job, get_profile, get_balance, add_credits, write_audit
from ..services.ai_core import generate_outreach

bp = Blueprint('outreach', __name__, url_prefix='/v1/outreach')

_COST = int(os.getenv('COST_OUTREACH_PACK', '2'))
_VALID_CHANNELS = {'email', 'linkedin', 'twitter'}
_VALID_TONES = {'direct', 'balanced', 'formal'}


@bp.post('/generate')
@require_auth(['careerforge:write'])
def generate():
    u = request.thronos_user
    upsert_user(u['sub'], u.get('email'), u.get('tenant_id'), u.get('verifyid_verified', False))

    body = request.get_json(force=True) or {}
    job_id = body.get('job_id', '')
    channel = body.get('channel', 'email')
    tone = body.get('tone', 'balanced')
    cadence_days = body.get('cadence_days', [5, 10, 20])

    if not job_id:
        return jsonify({'error': {'code': 'invalid_request', 'message': 'job_id is required'}}), 400
    if channel not in _VALID_CHANNELS:
        return jsonify({'error': {'code': 'invalid_request', 'message': f"channel must be one of {_VALID_CHANNELS}"}}), 400
    if tone not in _VALID_TONES:
        return jsonify({'error': {'code': 'invalid_request', 'message': f"tone must be one of {_VALID_TONES}"}}), 400
    if not isinstance(cadence_days, list) or len(cadence_days) > 10:
        return jsonify({'error': {'code': 'invalid_request', 'message': 'cadence_days must be a list with up to 10 items'}}), 400

    job = get_job(job_id, u['sub'])
    if not job:
        return jsonify({'error': {'code': 'not_found', 'message': 'job_id not found'}}), 404

    profile_rec = get_profile(u['sub'])
    profile_data = profile_rec['data'] if profile_rec else {}

    bal = get_balance(u['sub'])
    if bal < _COST:
        return jsonify({'error': {'code': 'insufficient_credits', 'balance': bal, 'required': _COST}}), 402

    messages = generate_outreach(profile_data, job, channel, tone, cadence_days)

    add_credits(u['sub'], -_COST, reason='outreach_generate', ref_type='job', ref_id=job_id)
    write_audit(
        tenant_id=u.get('tenant_id') or 'default',
        actor_sub=u['sub'],
        action='OUTREACH_GENERATE',
        target_type='job',
        target_id=job_id,
        details={'credits_charged': _COST, 'channel': channel},
    )

    return jsonify({'messages': messages, 'credits_charged': _COST}), 200
