"""
Identity Verification Pipeline
================================
POST /v1/verify/start            — create a new verification session
POST /v1/verify/upload           — upload documents (+ optional video)
GET  /v1/verify/status           — get current user's session status
POST /v1/verify/session/<id>/agent-decision — agent records video-call outcome

Flow
----
1. User calls /start
   • channel = 'agent' if AGENT_AVAILABLE=1 env var set, else 'ai'
   • Returns session_id + video_call_url (Jitsi room) so user can join immediately
     if no live agent is available

2. User calls /upload (doc_front required, doc_back + video optional)
   • Documents are stored for manager/agent review
   • AI fraud_detect.analyse() runs and attaches score + flags as HINTS for reviewer
   • Status is ALWAYS set to 'manager_review' — a human must review every submission
   • Exception: if doc front cannot be decoded at all AND fraud_score ≥ 90, set rejected

3. Manager sees session in /v1/manager/pending, reviews docs + video, approves/rejects

4. Agent (channel='agent') joins the Jitsi video call, then calls /agent-decision

Jitsi rooms
-----------
Each session gets a unique Jitsi room:
  https://meet.jit.si/cf-verify-{session_id}

The URL is returned at /start so the user can join before uploading docs.
If JITSI_BASE_URL env var is set, that base is used instead.
"""
import json
import os
import uuid

from flask import Blueprint, jsonify, request

from ..utils.auth import require_auth
from ..db.store import (
    upsert_user, create_verification_session, update_verification_session,
    get_verification_session, get_user_verification_session, _conn,
)
from ..services.fraud_detect import analyse as fraud_analyse

bp = Blueprint('verify', __name__, url_prefix='/v1/verify')

_AGENT_AVAILABLE = os.getenv('AGENT_AVAILABLE', '0').strip() == '1'
_JITSI_BASE = os.getenv('JITSI_BASE_URL', 'https://meet.jit.si').rstrip('/')


def _video_call_url(session_id: str) -> str:
    return f'{_JITSI_BASE}/cf-verify-{session_id}'


@bp.post('/start')
@require_auth(['careerforge:write'])
def start():
    """Create a new verification session for the authenticated user."""
    u = request.thronos_user
    upsert_user(u['sub'], u.get('email'), u.get('tenant_id'), u.get('verifyid_verified', False))

    # Return existing active session (don't create duplicates)
    existing = get_user_verification_session(u['sub'])
    if existing and existing['status'] not in ('approved', 'rejected'):
        return jsonify({
            'session_id': existing['id'],
            'status': existing['status'],
            'channel': existing.get('channel', 'ai'),
            'video_call_url': _video_call_url(existing['id']),
            'message': 'Existing verification session found.',
        }), 200

    channel = 'agent' if _AGENT_AVAILABLE else 'ai'
    session_id = uuid.uuid4().hex

    create_verification_session(
        session_id=session_id,
        sub=u['sub'],
        channel=channel,
    )

    call_url = _video_call_url(session_id)

    return jsonify({
        'session_id': session_id,
        'channel': channel,
        'status': 'pending',
        'video_call_url': call_url,
        'message': (
            f'An agent will contact you on the video call. Join now: {call_url}'
            if channel == 'agent'
            else (
                'No live agent is available right now. '
                'Please upload your documents and optionally join the video room '
                f'for a recorded liveness check: {call_url}'
            )
        ),
    }), 201


@bp.post('/upload')
@require_auth(['careerforge:write'])
def upload():
    """
    Upload ID documents (+ optional video) for the user's active session.

    Body (JSON):
      session_id      : str  (required)
      doc_front       : base64 image — front of ID (required)
      doc_back        : base64 image — back of ID  (optional)
      video           : base64 video blob           (optional)
      video_duration_s: float                       (optional)
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
        return jsonify({'error': {
            'code': 'conflict',
            'message': f"Session status is '{session['status']}' — documents already submitted.",
        }}), 409

    doc_front = body.get('doc_front', '').strip()
    doc_back  = body.get('doc_back', '').strip() or None
    video     = body.get('video', '').strip() or None
    duration  = body.get('video_duration_s')

    if not doc_front:
        return jsonify({'error': {'code': 'invalid_request', 'message': 'doc_front is required'}}), 400

    # Persist uploads
    update_verification_session(
        session_id,
        doc_front_b64=doc_front,
        doc_back_b64=doc_back,
        video_b64=video,
        video_duration_s=float(duration) if duration else None,
    )

    # Run AI fraud analysis — result is a HINT for the manager, never auto-decides
    with _conn() as c:
        row = c.execute('SELECT full_name FROM auth_accounts WHERE sub=?', (u['sub'],)).fetchone()
        declared_name = row['full_name'] if row else ''

    result = fraud_analyse(
        doc_front_b64=doc_front,
        doc_back_b64=doc_back,
        video_b64=video,
        video_duration_s=float(duration) if duration else None,
        declared_name=declared_name,
    )

    fraud_score   = result['fraud_score']
    recommendation = result['recommendation']    # 'low_risk' | 'medium_risk' | 'high_risk'

    # Only auto-reject if the document literally cannot be decoded (obvious abuse)
    # Everything else goes to manager review
    obvious_spam = (
        fraud_score >= 90
        and 'doc_front_decode_error' in result['flags']
    )

    new_status = 'rejected' if obvious_spam else 'manager_review'

    update_verification_session(
        session_id,
        status=new_status,
        fraud_score=fraud_score,
        fraud_flags_json=json.dumps(result['flags']),
    )

    call_url = _video_call_url(session_id)

    if new_status == 'rejected':
        return jsonify({
            'session_id': session_id,
            'status': 'rejected',
            'fraud_score': fraud_score,
            'flags': result['flags'],
            'message': (
                'Your document could not be processed (file error). '
                'Please try again with a clear JPEG or PNG photo of your ID.'
            ),
        }), 200

    # manager_review — always
    return jsonify({
        'session_id': session_id,
        'status': 'manager_review',
        'fraud_score': fraud_score,
        'risk_level': recommendation,
        'video_call_url': call_url,
        'message': (
            'Documents received. A manager will review your submission shortly. '
            + (
                f'You can also join a live video verification call here: {call_url}'
                if session['channel'] == 'ai'
                else 'Your agent will complete the review via video call.'
            )
        ),
    }), 200


@bp.get('/status')
@require_auth(['careerforge:read'])
def status():
    """Get the most recent verification session for the authenticated user."""
    u = request.thronos_user
    session = get_user_verification_session(u['sub'])
    if not session:
        return jsonify({'status': 'none', 'message': 'No verification session found.'}), 200

    data = dict(session)
    data['video_call_url'] = _video_call_url(session['id'])
    return jsonify(data), 200


@bp.post('/session/<session_id>/agent-decision')
@require_auth(['careerforge:write'])
def agent_decision(session_id: str):
    """
    Called by an agent after their video call to record their decision.

    Body:
      decision : "approved" | "rejected" | "escalate"
      note     : str (optional)
    """
    u = request.thronos_user
    body = request.get_json(force=True) or {}

    session = get_verification_session(session_id)
    if not session:
        return jsonify({'error': {'code': 'not_found', 'message': 'Session not found'}}), 404

    decision = body.get('decision', '').strip()
    if decision not in ('approved', 'rejected', 'escalate'):
        return jsonify({'error': {
            'code': 'invalid_request',
            'message': "decision must be 'approved', 'rejected', or 'escalate'",
        }}), 400

    note = body.get('note', '').strip()
    new_status = 'manager_review' if decision == 'escalate' else decision

    update_verification_session(
        session_id,
        status=new_status,
        agent_sub=u['sub'],
        manager_note=note or None,
    )

    if new_status == 'approved':
        with _conn() as c:
            c.execute('UPDATE users SET verifyid_verified=1 WHERE sub=?', (session['sub'],))

    return jsonify({
        'session_id': session_id,
        'status': new_status,
        'message': f'Session {new_status}.',
    }), 200
