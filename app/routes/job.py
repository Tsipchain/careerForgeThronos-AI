"""
POST /v1/job/ingest  — parse/normalize a job description
GET  /v1/job/<job_id> — retrieve an ingested job
"""
import hashlib
from flask import Blueprint, jsonify, request

from ..utils.auth import require_auth
from ..db.store import upsert_user, upsert_job, get_job, write_audit
from ..services.ai_core import parse_job

bp = Blueprint('job', __name__, url_prefix='/v1/job')


@bp.post('/ingest')
@require_auth(['careerforge:write'])
def ingest():
    u = request.thronos_user
    upsert_user(u['sub'], u.get('email'), u.get('tenant_id'), u.get('verifyid_verified', False))

    body = request.get_json(force=True) or {}
    job_data = body.get('job')
    if not job_data or not isinstance(job_data, dict):
        return jsonify({'error': {'code': 'invalid_request', 'message': "'job' object is required"}}), 400

    source = job_data.get('source', {})
    raw_text = job_data.get('raw_text', '').strip()
    if len(raw_text) < 50:
        return jsonify({'error': {'code': 'invalid_request', 'message': 'raw_text must be at least 50 characters'}}), 400

    source_type = source.get('type', 'paste')
    if source_type not in ('url', 'paste', 'pdf_text'):
        return jsonify({'error': {'code': 'invalid_request', 'message': "source.type must be url|paste|pdf_text"}}), 400

    source_url = source.get('url')
    job_fp = hashlib.sha256(raw_text.encode('utf-8')).hexdigest()

    # Use pre-parsed data if supplied, otherwise call AI core parser
    pre_parsed = job_data.get('parsed')
    parsed = pre_parsed if pre_parsed else parse_job(raw_text)

    result = upsert_job(
        sub=u['sub'],
        tenant_id=u.get('tenant_id') or 'default',
        source_type=source_type,
        raw_text=raw_text,
        fingerprint=job_fp,
        source_url=source_url,
        parsed=parsed,
    )

    write_audit(
        tenant_id=u.get('tenant_id') or 'default',
        actor_sub=u['sub'],
        action='JOB_INGEST',
        target_type='job',
        target_id=result['job_id'],
    )

    return jsonify({
        'job_id': result['job_id'],
        'job_fingerprint_sha256': job_fp,
        'parsed': parsed,
    }), 200


@bp.get('/<job_id>')
@require_auth(['careerforge:read'])
def get(job_id: str):
    u = request.thronos_user
    job = get_job(job_id, u['sub'])
    if not job:
        return jsonify({'error': {'code': 'not_found', 'message': 'Job not found'}}), 404
    return jsonify(job), 200
