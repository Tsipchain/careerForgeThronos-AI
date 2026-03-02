"""
POST /v1/job/ingest              — parse/normalize a job description
GET  /v1/job/<job_id>            — retrieve an ingested job
GET  /v1/job/remoteok            — fetch live remote jobs from RemoteOK (free, no credits)
POST /v1/job/remoteok/ingest     — ingest a RemoteOK listing by slug
GET  /v1/job/country-context     — full context for a country (?country=GR|Germany|…)
GET  /v1/job/countries           — list all supported countries (compact)
"""
import hashlib
from flask import Blueprint, jsonify, request
import requests as http_requests

from ..utils.auth import require_auth
from ..db.store import upsert_user, upsert_job, get_job, write_audit
from ..services.ai_core import parse_job
from ..services.country_context import country_summary, list_countries

bp = Blueprint('job', __name__, url_prefix='/v1/job')

_REMOTEOK_BASE = 'https://remoteok.com/api'
_REMOTEOK_UA = 'CareerForge/1.0 (jobs integration)'


# ---------------------------------------------------------------------------
# RemoteOK integration
# ---------------------------------------------------------------------------

def _fetch_remoteok(tag: str = '', limit: int = 20) -> list:
    url = _REMOTEOK_BASE if not tag else f'{_REMOTEOK_BASE}?tag={tag}'
    try:
        r = http_requests.get(url, timeout=10, headers={'User-Agent': _REMOTEOK_UA})
        r.raise_for_status()
        data = r.json()
        # First item is always metadata
        jobs = [item for item in data if isinstance(item, dict) and item.get('id')]
        return jobs[:limit]
    except Exception as exc:
        return []


def _remoteok_to_raw_text(job: dict) -> str:
    parts = [
        job.get('position', ''),
        job.get('company', ''),
        job.get('location', 'Remote'),
        job.get('description', ''),
        'Tags: ' + ', '.join(job.get('tags', [])),
    ]
    return '\n'.join(p for p in parts if p).strip()


@bp.get('/remoteok')
@require_auth(['careerforge:read'])
def list_remoteok():
    """Browse live remote jobs from RemoteOK. Free — no credit burn."""
    tag = request.args.get('tag', '').strip().lower()
    try:
        limit = max(1, min(int(request.args.get('limit', 20)), 50))
    except (ValueError, TypeError):
        limit = 20

    jobs = _fetch_remoteok(tag=tag, limit=limit)

    normalized = []
    for j in jobs:
        normalized.append({
            'remoteok_id': str(j.get('id', '')),
            'slug': j.get('slug', ''),
            'title': j.get('position', ''),
            'company': j.get('company', ''),
            'location': j.get('location', 'Remote'),
            'salary': j.get('salary', ''),
            'tags': j.get('tags', []),
            'url': j.get('url', ''),
            'posted_at': j.get('date', ''),
            'logo': j.get('company_logo', ''),
        })

    return jsonify({'jobs': normalized, 'count': len(normalized), 'tag': tag}), 200


@bp.post('/remoteok/ingest')
@require_auth(['careerforge:write'])
def ingest_remoteok():
    """Fetch a specific RemoteOK job by slug and ingest it (parses it, saves to DB)."""
    u = request.thronos_user
    upsert_user(u['sub'], u.get('email'), u.get('tenant_id'), u.get('verifyid_verified', False))

    body = request.get_json(force=True) or {}
    slug = body.get('slug', '').strip()
    remoteok_id = body.get('remoteok_id', '').strip()

    # Fetch all and find by slug/id
    jobs = _fetch_remoteok(limit=100)
    matched = None
    for j in jobs:
        if slug and j.get('slug') == slug:
            matched = j
            break
        if remoteok_id and str(j.get('id', '')) == remoteok_id:
            matched = j
            break

    if not matched:
        return jsonify({'error': {'code': 'not_found', 'message': 'RemoteOK job not found'}}), 404

    raw_text = _remoteok_to_raw_text(matched)
    job_fp = hashlib.sha256(raw_text.encode('utf-8')).hexdigest()
    source_url = matched.get('url', '')
    parsed = parse_job(raw_text)
    # Enrich parsed with RemoteOK metadata
    parsed['title'] = matched.get('position', parsed.get('title', ''))
    parsed['company'] = matched.get('company', parsed.get('company', ''))
    parsed['location'] = matched.get('location', 'Remote')
    parsed['salary'] = matched.get('salary', '')

    result = upsert_job(
        sub=u['sub'],
        tenant_id=u.get('tenant_id') or 'default',
        source_type='url',
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
        details={'source': 'remoteok', 'slug': slug},
    )

    return jsonify({
        'job_id': result['job_id'],
        'job_fingerprint_sha256': job_fp,
        'parsed': parsed,
        'source': 'remoteok',
    }), 200


# ---------------------------------------------------------------------------
# Standard job routes
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# Country context (free — no credits)
# ---------------------------------------------------------------------------

@bp.get('/countries')
@require_auth(['careerforge:read'])
def countries():
    """List all supported countries with compact metadata."""
    return jsonify({'countries': list_countries()}), 200


@bp.get('/country-context')
@require_auth(['careerforge:read'])
def country_context():
    """
    Full living/working/tax context for a country.
    Query param: ?country=GR  (ISO code or English name)
    """
    code = request.args.get('country', '').strip()
    if not code:
        return jsonify({'error': {'code': 'invalid_request', 'message': "'country' param required (e.g. GR, Germany, US)"}}), 400
    ctx = country_summary(code)
    if 'error' in ctx:
        return jsonify({'error': {'code': 'not_found', 'message': ctx['error'], 'available': ctx.get('available', [])}}), 404
    return jsonify(ctx), 200


@bp.get('/<job_id>')
@require_auth(['careerforge:read'])
def get(job_id: str):
    u = request.thronos_user
    job = get_job(job_id, u['sub'])
    if not job:
        return jsonify({'error': {'code': 'not_found', 'message': 'Job not found'}}), 404
    return jsonify(job), 200
