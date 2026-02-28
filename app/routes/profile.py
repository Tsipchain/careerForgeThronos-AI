"""
POST /v1/profile/upsert  — create/update Master Profile
GET  /v1/profile         — retrieve current profile
"""
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
