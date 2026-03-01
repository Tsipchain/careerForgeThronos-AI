"""
GET  /v1/candidates/search  — recruiter: search opt-in candidate pool (1 credit per search)
DELETE /v1/user/data        — GDPR: hard-delete all user data
"""
import os
from flask import Blueprint, jsonify, request

from ..utils.auth import require_auth
from ..db.store import (
    upsert_user, get_balance, add_credits, write_audit,
    search_candidates, delete_user_data,
)

bp = Blueprint('candidates', __name__)

_COST_SEARCH = int(os.getenv('COST_CANDIDATE_SEARCH', '1'))


@bp.get('/v1/candidates/search')
@require_auth(['careerforge:read'])
def candidate_search():
    """Search the opt-in candidate pool. Costs 1 credit per search."""
    u = request.thronos_user
    upsert_user(u['sub'], u.get('email'), u.get('tenant_id'), u.get('verifyid_verified', False))

    role = request.args.get('role', '').strip()
    location = request.args.get('location', '').strip()
    try:
        limit = max(1, min(int(request.args.get('limit', 20)), 50))
        offset = max(0, int(request.args.get('offset', 0)))
    except (ValueError, TypeError):
        limit, offset = 20, 0

    bal = get_balance(u['sub'])
    if bal < _COST_SEARCH:
        return jsonify({'error': {'code': 'insufficient_credits',
                                  'balance': bal, 'required': _COST_SEARCH}}), 402

    results = search_candidates(role_query=role, location=location, limit=limit, offset=offset)

    add_credits(u['sub'], -_COST_SEARCH, reason='candidate_search', ref_type='search', ref_id=role[:32])
    write_audit(
        tenant_id=u.get('tenant_id') or 'default',
        actor_sub=u['sub'],
        action='CANDIDATE_SEARCH',
        details={'role': role, 'location': location, 'results': len(results), 'credits_charged': _COST_SEARCH},
    )

    return jsonify({
        'candidates': results,
        'count': len(results),
        'credits_charged': _COST_SEARCH,
        'balance_after': get_balance(u['sub']),
    }), 200


@bp.delete('/v1/user/data')
@require_auth(['careerforge:write'])
def gdpr_delete():
    """Permanently delete all PII and generated data for the authenticated user."""
    u = request.thronos_user
    body = request.get_json(force=True) or {}

    # Require explicit confirmation phrase to prevent accidental deletion
    if body.get('confirm') != 'DELETE_ALL_MY_DATA':
        return jsonify({
            'error': {
                'code': 'confirmation_required',
                'message': "Set confirm='DELETE_ALL_MY_DATA' to proceed",
            }
        }), 400

    result = delete_user_data(u['sub'])

    write_audit(
        tenant_id=u.get('tenant_id') or 'default',
        actor_sub=u['sub'],
        action='GDPR_DELETE',
        details={'deleted_rows': result['deleted_rows']},
    )

    return jsonify({'ok': True, 'deleted': result['deleted_rows']}), 200
