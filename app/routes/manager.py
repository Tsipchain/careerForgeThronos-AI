"""
Manager Review Portal
========================
GET  /v1/manager/pending              — list sessions awaiting manual review
GET  /v1/manager/session/<id>         — full session details (no binary blobs)
GET  /v1/manager/session/<id>/doc/<t> — serve document inline (front|back|video)
POST /v1/manager/session/<id>/review  — submit approve/reject decision

Security
--------
- Requires role claim `careerforge:manager` in the JWT.
- Documents are served inline via Content-Disposition: inline to prevent
  downloads while still allowing browser/iframe display.
- The raw base64 is NEVER returned in JSON responses.
"""
import base64
import json
import mimetypes
from flask import Blueprint, jsonify, request, Response

from ..utils.auth import require_auth
from ..db.store import (
    list_pending_verifications, get_verification_session,
    get_session_doc, update_verification_session, _conn,
)

bp = Blueprint('manager', __name__, url_prefix='/v1/manager')


def _require_manager(u: dict) -> bool:
    """Return True if the user has the manager role."""
    roles = u.get('roles', []) or []
    scopes = u.get('scopes', []) or []
    return 'careerforge:manager' in roles or 'careerforge:manager' in scopes


@bp.get('/pending')
@require_auth(['careerforge:read'])
def pending():
    """List sessions that need manual review (status = manager_review)."""
    u = request.thronos_user
    if not _require_manager(u):
        return jsonify({'error': {'code': 'forbidden', 'message': 'Manager role required'}}), 403

    sessions = list_pending_verifications(limit=100)
    # Filter to manager_review only
    sessions = [s for s in sessions if s.get('status') == 'manager_review']

    return jsonify({'sessions': sessions, 'count': len(sessions)}), 200


@bp.get('/session/<session_id>')
@require_auth(['careerforge:read'])
def session_detail(session_id: str):
    """
    Get full session details.
    Does NOT include binary blobs — use /doc/<type> endpoint for those.
    """
    u = request.thronos_user
    if not _require_manager(u):
        return jsonify({'error': {'code': 'forbidden', 'message': 'Manager role required'}}), 403

    session = get_verification_session(session_id)
    if not session:
        return jsonify({'error': {'code': 'not_found', 'message': 'Session not found'}}), 404

    # Augment with user email
    with _conn() as c:
        row = c.execute(
            'SELECT email, full_name FROM auth_accounts WHERE sub=?', (session['sub'],)
        ).fetchone()
        if row:
            session['user_email'] = row['email']
            session['user_full_name'] = row['full_name']

    # Deserialize flags
    raw_flags = session.pop('fraud_flags_json', None)
    session['fraud_flags'] = json.loads(raw_flags) if raw_flags else []

    return jsonify(session), 200


@bp.get('/session/<session_id>/doc/<doc_type>')
@require_auth(['careerforge:read'])
def view_doc(session_id: str, doc_type: str):
    """
    Serve a document inline — no download.
    doc_type: front | back | video
    """
    u = request.thronos_user
    if not _require_manager(u):
        return jsonify({'error': {'code': 'forbidden', 'message': 'Manager role required'}}), 403

    if doc_type not in ('front', 'back', 'video'):
        return jsonify({'error': {'code': 'invalid_request', 'message': 'doc_type must be front|back|video'}}), 400

    b64_data = get_session_doc(session_id, doc_type)
    if not b64_data:
        return jsonify({'error': {'code': 'not_found', 'message': 'Document not found'}}), 404

    # Strip data-URL prefix if present
    if ',' in b64_data:
        header, b64_data = b64_data.split(',', 1)
        # Extract mime from header: "data:image/jpeg;base64"
        mime_part = header.split(':')[1].split(';')[0] if ':' in header else ''
    else:
        mime_part = ''

    # Determine MIME type
    if doc_type == 'video':
        content_type = mime_part or 'video/mp4'
    else:
        content_type = mime_part or 'image/jpeg'

    b64_data += '=' * (-len(b64_data) % 4)
    try:
        raw_bytes = base64.b64decode(b64_data)
    except Exception:
        return jsonify({'error': {'code': 'server_error', 'message': 'Could not decode document'}}), 500

    # Content-Disposition: inline prevents downloads while allowing display
    headers = {
        'Content-Disposition': 'inline',
        'Cache-Control': 'no-store, no-cache',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'",
    }

    return Response(raw_bytes, status=200, mimetype=content_type, headers=headers)


@bp.post('/session/<session_id>/review')
@require_auth(['careerforge:write'])
def review(session_id: str):
    """
    Submit a manager decision on a verification session.

    Body:
      decision : "approved" | "rejected"
      note     : str (optional, reason / notes)
    """
    u = request.thronos_user
    if not _require_manager(u):
        return jsonify({'error': {'code': 'forbidden', 'message': 'Manager role required'}}), 403

    session = get_verification_session(session_id)
    if not session:
        return jsonify({'error': {'code': 'not_found', 'message': 'Session not found'}}), 404
    if session['status'] != 'manager_review':
        return jsonify({'error': {'code': 'conflict', 'message': f"Session status is '{session['status']}', expected 'manager_review'"}}), 409

    body = request.get_json(force=True) or {}
    decision = body.get('decision', '').strip()
    note = body.get('note', '').strip()

    if decision not in ('approved', 'rejected'):
        return jsonify({'error': {'code': 'invalid_request', 'message': "decision must be 'approved' or 'rejected'"}}), 400

    update_verification_session(
        session_id,
        status=decision,
        manager_decision=decision,
        manager_note=note or None,
        manager_sub=u['sub'],
    )

    if decision == 'approved':
        with _conn() as c:
            c.execute('UPDATE users SET verifyid_verified=1 WHERE sub=?', (session['sub'],))

    return jsonify({
        'session_id': session_id,
        'decision': decision,
        'message': f'Session has been {decision}.',
    }), 200
