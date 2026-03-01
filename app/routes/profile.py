"""
POST /v1/profile/upsert    — create/update Master Profile
GET  /v1/profile           — retrieve current profile
POST /v1/profile/parse-cv  — upload PDF, extract text for kit generation
"""
import io
from flask import Blueprint, jsonify, request

from ..utils.auth import require_auth
from ..db.store import upsert_user, upsert_profile, get_profile, write_audit

bp = Blueprint('profile', __name__, url_prefix='/v1/profile')

_REQUIRED_FIELDS = {'profile_version', 'identity', 'headline', 'skills', 'experience'}


def _validate(data: dict) -> list:
    errors = []
    missing = _REQUIRED_FIELDS - data.keys()
    if missing:
        errors.append(f"Missing required fields: {sorted(missing)}")
    identity = data.get('identity', {})
    if not identity.get('full_name'):
        errors.append("identity.full_name is required")
    skills = data.get('skills', {})
    if not isinstance(skills.get('hard'), list) or len(skills.get('hard', [])) < 1:
        errors.append("skills.hard must be a non-empty list")
    exp = data.get('experience', [])
    if not isinstance(exp, list) or len(exp) < 1:
        errors.append("experience must be a non-empty list")
    return errors


@bp.post('/upsert')
@require_auth(['careerforge:write'])
def upsert():
    u = request.thronos_user
    upsert_user(u['sub'], u.get('email'), u.get('tenant_id'), u.get('verifyid_verified', False))

    body = request.get_json(force=True) or {}
    profile_data = body.get('profile')
    if not profile_data or not isinstance(profile_data, dict):
        return jsonify({'error': {'code': 'invalid_request', 'message': "'profile' object is required"}}), 400

    errors = _validate(profile_data)
    if errors:
        return jsonify({'error': {'code': 'invalid_schema', 'message': 'Profile validation failed', 'details': errors}}), 400

    result = upsert_profile(
        sub=u['sub'],
        tenant_id=u.get('tenant_id') or 'default',
        data=profile_data,
    )

    write_audit(
        tenant_id=u.get('tenant_id') or 'default',
        actor_sub=u['sub'],
        action='PROFILE_UPSERT',
        target_type='profile',
        target_id=result['profile_id'],
    )

    return jsonify(result), 200


@bp.get('')
@require_auth(['careerforge:read'])
def get():
    u = request.thronos_user
    profile = get_profile(u['sub'])
    if not profile:
        return jsonify({'error': {'code': 'not_found', 'message': 'No profile found'}}), 404
    return jsonify(profile), 200


@bp.post('/parse-cv')
@require_auth(['careerforge:write'])
def parse_cv():
    """Accept a PDF CV upload and return extracted plain text.

    The text is returned as-is so the frontend can pre-fill the
    'Your CV / experience' textarea in the kit generation wizard.
    Max file size: 5 MB.
    """
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded. Send multipart/form-data with field "file".'}), 400

    f = request.files['file']
    if not f.filename or not f.filename.lower().endswith('.pdf'):
        return jsonify({'error': 'Only PDF files are supported.'}), 400

    raw = f.read()
    if len(raw) > 5 * 1024 * 1024:
        return jsonify({'error': 'File too large (max 5 MB).'}), 413

    try:
        import pdfplumber
        with pdfplumber.open(io.BytesIO(raw)) as pdf:
            pages = []
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    pages.append(text.strip())
        extracted = '\n\n'.join(pages)
    except Exception as e:
        return jsonify({'error': f'PDF extraction failed: {e}'}), 422

    if not extracted.strip():
        return jsonify({'error': 'Could not extract text from this PDF. Try a text-based (non-scanned) PDF.'}), 422

    word_count = len(extracted.split())
    return jsonify({
        'text': extracted,
        'pages': len(pages),
        'word_count': word_count,
    })
