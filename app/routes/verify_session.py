"""
Identity Verification Pipeline
================================
POST /v1/verify/start            — create a new verification session
POST /v1/verify/upload           — upload documents + video (base64 JSON)
GET  /v1/verify/status           — get current user's session status
GET  /v1/verify/session/<id>     — get any session by ID (manager / agent only)

Flow
----
1. User calls /start  → status=pending, channel determined automatically:
     • if an agent is declared available (env AGENT_AVAILABLE=1) → channel=agent
     • otherwise → channel=ai
2. User calls /upload with doc_front, doc_back, video
3. If channel=ai:  fraud service runs immediately; if score<30 → approved,
                   if 30–65 → manager_review, if ≥65 → rejected
   If channel=agent: session waits for agent to complete video call externally,
                     then POST /v1/verify/session/<id>/agent-decision
4. manager_review sessions surface in /v1/manager/pending
"""
import os
import uuid
from flask import Blueprint, jsonify, request

from ..utils.auth import require_auth
from ..db.store import (
    upsert_user, create_verification_session, update_verification_session,
    get_verification_session, get_user_verification_session,
)
from ..services.fraud_detect import analyse as fraud_analyse

bp = Blueprint('verify', __name__, url_prefix='/v1/verify')

_AGENT_AVAILABLE = os.getenv('AGENT_AVAILABLE', '0').strip() == '1'


@bp.post('/start')
@require_auth(['careerforge:write'])
def start():
    """Create a new verification session for the authenticated user."""
    u = request.thronos_user
    upsert_user(u['sub'], u.get('email'), u.get('tenant_id'), u.get('verifyid_verified', False))

    # Check for existing active session
    existing = get_user_verification_session(u['sub'])
    if existing and existing['status'] not in ('approved', 'rejected'):
        return jsonify({
            'session_id': existing['id'],
            'status': existing['status'],
            'channel': existing.get('channel', 'ai'),
            'message': 'Existing verification session found',
        }), 200

    channel = 'agent' if _AGENT_AVAILABLE else 'ai'
    session_id = uuid.uuid4().hex

    create_verification_session(
        session_id=session_id,
        sub=u['sub'],
        channel=channel,
    )

    return jsonify({
        'session_id': session_id,
        'channel': channel,
        'status': 'pending',
        'message': (
            'An agent will contact you shortly for a video call.'
            if channel == 'agent'
            else 'Please upload your ID documents and a short selfie video.'
        ),
    }), 201


@bp.post('/upload')
@require_auth(['careerforge:write'])
def upload():
    """
    Upload ID documents + liveness video for the user's active session.

    Body (JSON):
      session_id   : str
      doc_front    : base64-encoded image of document front
      doc_back     : base64-encoded image of document back (optional)
      video        : base64-encoded video blob (<30 MB)
      video_duration_s : float (optional, client-reported duration)
    """
    u = request.thronos_user
    body = request.get_json(force=True) or {}

    session_id = body.get('session_id', '').strip()
    if not session_id:
        return jsonify({'error': {'code': 'invalid_request', 'message': 'session_id required'}}), 400

    session = get_verification_session(session_id)
    if not session:
        return jsonify({'error': {'code': 'not_found', 'message': 'Session not found'}}), 404
    if session['sub'] != u['sub']:
        return jsonify({'error': {'code': 'forbidden', 'message': 'Not your session'}}), 403
    if session['status'] not in ('pending',):
        return jsonify({'error': {'code': 'conflict', 'message': f"Session is already in status '{session['status']}'"}}), 409

    doc_front = body.get('doc_front', '')
    doc_back = body.get('doc_back', '')
    video = body.get('video', '')
    duration = body.get('video_duration_s')

    if not doc_front:
        return jsonify({'error': {'code': 'invalid_request', 'message': 'doc_front is required'}}), 400

    # Persist uploads regardless of channel
    update_verification_session(
        session_id,
        doc_front_b64=doc_front,
        doc_back_b64=doc_back or None,
        video_b64=video or None,
        video_duration_s=float(duration) if duration else None,
    )

    # For AI channel: run fraud analysis immediately
    if session['channel'] == 'ai':
        # Get user's declared name for cross-check
        from ..db.store import _conn
        with _conn() as c:
            row = c.execute('SELECT full_name FROM auth_accounts WHERE sub=?', (u['sub'],)).fetchone()
            declared_name = row['full_name'] if row else ''

        result = fraud_analyse(
            doc_front_b64=doc_front,
            doc_back_b64=doc_back or None,
            video_b64=video or None,
            video_duration_s=float(duration) if duration else None,
            declared_name=declared_name,
        )

        fraud_score = result['fraud_score']
        recommendation = result['recommendation']

        import json
        new_status = {
            'approve': 'approved',
            'manual_review': 'manager_review',
            'reject': 'rejected',
        }.get(recommendation, 'manager_review')

        update_verification_session(
            session_id,
            status=new_status,
            fraud_score=fraud_score,
            fraud_flags_json=json.dumps(result['flags']),
        )

        # If approved by AI, mark user as verified
        if new_status == 'approved':
            with _conn() as c:
                c.execute('UPDATE users SET verifyid_verified=1 WHERE sub=?', (u['sub'],))

        return jsonify({
            'session_id': session_id,
            'status': new_status,
            'fraud_score': fraud_score,
            'flags': result['flags'],
            'message': {
                'approved': 'Identity verified successfully.',
                'manager_review': 'Documents received. A manager will review shortly.',
                'rejected': 'Verification could not be completed. Please contact support.',
            }.get(new_status, ''),
        }), 200

    # Agent channel: just store docs, session stays pending for agent action
    return jsonify({
        'session_id': session_id,
        'status': 'pending',
        'message': 'Documents uploaded. Your agent will review them during the video call.',
    }), 200


@bp.get('/status')
@require_auth(['careerforge:read'])
def status():
    """Get the most recent verification session for the authenticated user."""
    u = request.thronos_user
    session = get_user_verification_session(u['sub'])
    if not session:
        return jsonify({'status': 'none', 'message': 'No verification session found'}), 200
    return jsonify(session), 200


@bp.post('/session/<session_id>/agent-decision')
@require_auth(['careerforge:write'])
def agent_decision(session_id: str):
    """
    Called by an agent after their video call to record their decision.
    Body: { "decision": "approved"|"rejected"|"escalate", "note": str }
    """
    u = request.thronos_user
    body = request.get_json(force=True) or {}

    session = get_verification_session(session_id)
    if not session:
        return jsonify({'error': {'code': 'not_found', 'message': 'Session not found'}}), 404

    decision = body.get('decision', '').strip()
    if decision not in ('approved', 'rejected', 'escalate'):
        return jsonify({'error': {'code': 'invalid_request', 'message': "decision must be approved|rejected|escalate"}}), 400

    note = body.get('note', '').strip()

    if decision == 'escalate':
        new_status = 'manager_review'
    else:
        new_status = decision

    update_verification_session(
        session_id,
        status=new_status,
        agent_sub=u['sub'],
        manager_note=note or None,
    )

    if new_status == 'approved':
        from ..db.store import _conn
        with _conn() as c:
            c.execute('UPDATE users SET verifyid_verified=1 WHERE sub=?', (session['sub'],))

    return jsonify({'session_id': session_id, 'status': new_status}), 200
