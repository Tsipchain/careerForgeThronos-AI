"""
CareerForge 7-Day Promise / Credit Guarantee
==============================================
GET  /v1/guarantee/status          — check eligibility + existing request
POST /v1/guarantee/request         — submit a refund request
POST /v1/guarantee/resolve/<id>    — manager/admin resolves a request (credits refund)

Logic
-----
Eligibility:
  • User has generated ≥ 1 kit
  • ≥ 7 days since first kit was generated
  • No prior resolved refund request

Refund:
  • Default: refund all credits spent on kit generation (up to a cap)
  • Admin/manager can override the credit amount
"""
import uuid
from flask import Blueprint, jsonify, request

from ..utils.auth import require_auth
from ..db.store import (
    upsert_user, get_user_guarantee_status,
    create_guarantee_request, resolve_guarantee_request,
    add_credits, write_audit, _conn,
)

bp = Blueprint('guarantee', __name__, url_prefix='/v1/guarantee')

_MAX_REFUND_CREDITS = 100  # safety cap


def _require_manager(u: dict) -> bool:
    roles = u.get('roles', []) or []
    scopes = u.get('scopes', []) or []
    return 'careerforge:manager' in roles or 'careerforge:manager' in scopes


@bp.get('/status')
@require_auth(['careerforge:read'])
def status():
    """
    Return guarantee eligibility and any existing refund request for the user.
    """
    u = request.thronos_user
    info = get_user_guarantee_status(u['sub'])
    return jsonify(info), 200


@bp.post('/request')
@require_auth(['careerforge:write'])
def request_refund():
    """
    Submit a CareerForge Promise refund request.

    Body (optional):
      reason : str  — user's explanation
    """
    u = request.thronos_user
    upsert_user(u['sub'], u.get('email'), u.get('tenant_id'), u.get('verifyid_verified', False))

    info = get_user_guarantee_status(u['sub'])

    if not info.get('eligible_for_refund'):
        days = info.get('days_active', 0)
        kits = info.get('kit_count', 0)
        if kits == 0:
            msg = 'You need to generate at least one kit before requesting a refund.'
        elif days < 7:
            msg = f'The 7-day guarantee period starts after your first kit. You are on day {days}.'
        else:
            msg = 'You are not currently eligible for a refund.'
        return jsonify({'error': {'code': 'not_eligible', 'message': msg}}), 422

    existing = info.get('existing_request')
    if existing and existing.get('status') == 'pending':
        return jsonify({
            'error': {
                'code': 'already_pending',
                'message': 'You already have a pending refund request.',
                'request_id': existing['id'],
            }
        }), 409

    body = request.get_json(force=True) or {}
    reason = body.get('reason', '').strip()[:500]

    req_id = uuid.uuid4().hex
    result = create_guarantee_request(req_id=req_id, sub=u['sub'], reason=reason)

    if 'error' in result:
        return jsonify({'error': {'code': result['error'], 'message': 'Could not create request'}}), 409

    write_audit(
        tenant_id=u.get('tenant_id') or 'default',
        actor_sub=u['sub'],
        action='GUARANTEE_REQUEST',
        target_type='guarantee',
        target_id=req_id,
        details={'reason': reason},
    )

    return jsonify({
        'request_id': req_id,
        'status': 'pending',
        'message': 'Your refund request has been submitted. We will review it within 48 hours.',
    }), 201


@bp.post('/resolve/<request_id>')
@require_auth(['careerforge:write'])
def resolve(request_id: str):
    """
    Manager/admin endpoint to approve and execute a credit refund.

    Body:
      credits_refunded : int   (how many credits to refund; 0 = deny)
      note             : str   (optional)
    """
    u = request.thronos_user
    if not _require_manager(u):
        return jsonify({'error': {'code': 'forbidden', 'message': 'Manager role required'}}), 403

    body = request.get_json(force=True) or {}
    credits_refunded = int(body.get('credits_refunded', 0))
    note = body.get('note', '').strip()[:500]

    # Fetch the request
    with _conn() as c:
        row = c.execute(
            'SELECT id, sub, status FROM guarantee_requests WHERE id=?', (request_id,)
        ).fetchone()

    if not row:
        return jsonify({'error': {'code': 'not_found', 'message': 'Request not found'}}), 404
    if row['status'] != 'pending':
        return jsonify({'error': {'code': 'conflict', 'message': f"Request is already '{row['status']}'"}}), 409

    credits_refunded = max(0, min(credits_refunded, _MAX_REFUND_CREDITS))
    beneficiary_sub = row['sub']

    # Issue credit refund if applicable
    if credits_refunded > 0:
        add_credits(
            sub=beneficiary_sub,
            delta=credits_refunded,
            reason='guarantee_refund',
            ref_type='guarantee',
            ref_id=request_id,
        )

    resolve_guarantee_request(
        req_id=request_id,
        credits_refunded=credits_refunded,
        reviewed_by=u['sub'],
    )

    write_audit(
        tenant_id=u.get('tenant_id') or 'default',
        actor_sub=u['sub'],
        action='GUARANTEE_RESOLVE',
        target_type='guarantee',
        target_id=request_id,
        details={'credits_refunded': credits_refunded, 'note': note},
    )

    return jsonify({
        'request_id': request_id,
        'status': 'resolved',
        'credits_refunded': credits_refunded,
        'message': f'{credits_refunded} credits refunded to user.' if credits_refunded > 0 else 'Request closed without refund.',
    }), 200
