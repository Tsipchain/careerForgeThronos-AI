"""
n8n automation webhook endpoints — all require X-N8N-Secret header.

Automation flows supported:

Flow A — Profile & Kit bootstrap
  POST /v1/n8n/flow-a/bootstrap   Trigger when new user registers; n8n calls back
                                   to create baseline profile and first kit.

Flow B — Job match → email/kit decision
  GET  /v1/n8n/inactive-users     Poll users idle for N days (threshold_days param).
  POST /v1/n8n/send-alert         Log that n8n sent an email to a user.

Flow C — Daily job alert drip (email)
  GET  /v1/n8n/job-alert-targets  Returns users + their CV keywords for job-alert emails.
                                   n8n fetches RemoteOK matches and sends via SendGrid.

Flow D — Reply detection → interview prep
  POST /v1/n8n/interview-trigger  n8n detected a reply with keyword "interview";
                                   CareerForge logs it and returns interview pack params.

Flow E — AI Interview Coach trigger
  POST /v1/n8n/coach-trigger      n8n calls after "interview" keyword detected in email;
                                   returns interview prepare endpoint + user profile summary.

Platform stats
  GET  /v1/n8n/stats              Aggregate KPIs for n8n dashboard reporting.
"""
import os
import time
from functools import wraps
from flask import Blueprint, jsonify, request

from ..db.store import _conn  # internal helper — read-only queries

bp = Blueprint('n8n', __name__, url_prefix='/v1/n8n')


def _require_n8n_secret(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        secret = os.getenv('N8N_WEBHOOK_SECRET', '')
        if not secret:
            return jsonify({'error': 'n8n integration not configured'}), 503
        provided = request.headers.get('X-N8N-Secret', '')
        if provided != secret:
            return jsonify({'error': 'Unauthorized'}), 401
        return f(*args, **kwargs)
    return wrapper


@bp.get('/inactive-users')
@_require_n8n_secret
def inactive_users():
    """Return users whose last kit was more than `days` days ago (or who never generated one)."""
    try:
        days = max(1, min(int(request.args.get('days', 3)), 90))
    except (ValueError, TypeError):
        days = 3

    cutoff = int(time.time()) - days * 86400

    with _conn() as c:
        # Users who never generated a kit
        no_kit_rows = c.execute('''
            SELECT u.sub, u.email, u.created_at
            FROM users u
            LEFT JOIN kits k ON k.sub = u.sub
            WHERE k.sub IS NULL
              AND u.created_at < ?
        ''', (cutoff,)).fetchall()

        # Users whose last kit was before the cutoff
        inactive_rows = c.execute('''
            SELECT u.sub, u.email, MAX(k.created_at) AS last_kit_at
            FROM users u
            JOIN kits k ON k.sub = u.sub
            GROUP BY u.sub
            HAVING MAX(k.created_at) < ?
        ''', (cutoff,)).fetchall()

    result = []
    for r in no_kit_rows:
        result.append({
            'sub': r['sub'],
            'email': r['email'],
            'reason': 'never_generated',
            'days_inactive': days,
        })
    for r in inactive_rows:
        last = r['last_kit_at'] or 0
        days_ago = int((time.time() - last) / 86400)
        result.append({
            'sub': r['sub'],
            'email': r['email'],
            'reason': 'no_recent_kit',
            'days_inactive': days_ago,
            'last_kit_at': last,
        })

    return jsonify({'users': result, 'count': len(result), 'threshold_days': days})


@bp.post('/send-alert')
@_require_n8n_secret
def send_alert():
    """Log that n8n sent an alert to a user (for audit / deduplication)."""
    body = request.get_json(force=True) or {}
    sub = body.get('sub')
    message = body.get('message', '')
    channel = body.get('channel', 'email')  # email | slack | sms

    if not sub:
        return jsonify({'error': 'sub is required'}), 400

    # Just log to audit — no action taken by CareerForge itself
    from ..db.store import write_audit
    write_audit(
        tenant_id='default',
        actor_sub='n8n',
        action='N8N_ALERT_SENT',
        target_type='user',
        target_id=sub,
        details={'channel': channel, 'message': message[:200]},
    )

    return jsonify({'ok': True, 'sub': sub, 'channel': channel})


@bp.post('/flow-a/bootstrap')
@_require_n8n_secret
def flow_a_bootstrap():
    """
    Flow A — Profile & Kit bootstrap.
    n8n calls this after a new user registers to log and schedule the bootstrap kit.
    Body: { sub, email, full_name }
    """
    from ..db.store import write_audit
    body = request.get_json(force=True) or {}
    sub = body.get('sub', '')
    email = body.get('email', '')
    if not sub:
        return jsonify({'error': 'sub is required'}), 400

    write_audit(
        tenant_id='default',
        actor_sub='n8n',
        action='N8N_FLOW_A_BOOTSTRAP',
        target_type='user',
        target_id=sub,
        details={'email': email},
    )
    return jsonify({
        'ok': True,
        'next_step': 'user must paste job description to generate first kit',
        'dashboard_url': '/dashboard',
        'kit_url': '/dashboard/kit/new',
    }), 200


@bp.get('/job-alert-targets')
@_require_n8n_secret
def job_alert_targets():
    """
    Flow C — Daily job alert drip.
    Returns active users with their CV keywords so n8n can match against RemoteOK
    and send personalised job alert emails via SendGrid.
    """
    import json as _json
    with _conn() as c:
        rows = c.execute('''
            SELECT cv.sub, u.email, cv.keywords_json, cv.desired_roles_json,
                   cv.desired_locations_json
            FROM candidate_visibility cv
            JOIN users u ON u.sub = cv.sub
            WHERE cv.visible = 1 AND u.email NOT LIKE '[deleted]%'
        ''').fetchall()

    targets = []
    for r in rows:
        targets.append({
            'sub': r['sub'],
            'email': r['email'],
            'keywords': _json.loads(r['keywords_json'] or '[]'),
            'desired_roles': _json.loads(r['desired_roles_json'] or '[]'),
            'desired_locations': _json.loads(r['desired_locations_json'] or '[]'),
        })

    return jsonify({'targets': targets, 'count': len(targets)}), 200


@bp.post('/interview-trigger')
@_require_n8n_secret
def interview_trigger():
    """
    Flow D — Reply detection → interview prep.
    n8n detected a recruiter reply with keyword 'interview'.
    Logs the trigger and returns the user's latest job_id for use in /v1/interview/prepare.
    Body: { sub, email_subject, sender_email }
    """
    from ..db.store import write_audit, _conn as get_conn
    body = request.get_json(force=True) or {}
    sub = body.get('sub', '')
    if not sub:
        return jsonify({'error': 'sub is required'}), 400

    # Get user's most recent kit job_id
    with _conn() as c:
        row = c.execute(
            'SELECT job_id FROM kits WHERE sub=? AND job_id IS NOT NULL ORDER BY created_at DESC LIMIT 1',
            (sub,)
        ).fetchone()
    job_id = row['job_id'] if row else None

    write_audit(
        tenant_id='default',
        actor_sub='n8n',
        action='N8N_INTERVIEW_TRIGGER',
        target_type='user',
        target_id=sub,
        details={
            'email_subject': body.get('email_subject', ''),
            'sender': body.get('sender_email', ''),
            'job_id': job_id,
        },
    )

    return jsonify({
        'ok': True,
        'sub': sub,
        'job_id': job_id,
        'interview_prepare_endpoint': 'POST /v1/interview/prepare',
        'note': 'Use job_id + user JWT to call /v1/interview/prepare',
    }), 200


@bp.post('/coach-trigger')
@_require_n8n_secret
def coach_trigger():
    """
    Flow E — AI Interview Coach.
    Called when 'interview' keyword detected in an email reply.
    Returns user profile summary + interview prep URL so n8n can notify user.
    Body: { sub, context }
    """
    from ..db.store import write_audit, get_profile
    body = request.get_json(force=True) or {}
    sub = body.get('sub', '')
    if not sub:
        return jsonify({'error': 'sub is required'}), 400

    profile_rec = get_profile(sub)
    name = ''
    if profile_rec:
        name = profile_rec.get('data', {}).get('identity', {}).get('full_name', '')

    write_audit(
        tenant_id='default',
        actor_sub='n8n',
        action='N8N_COACH_TRIGGER',
        target_type='user',
        target_id=sub,
        details={'context': body.get('context', '')},
    )

    return jsonify({
        'ok': True,
        'sub': sub,
        'candidate_name': name,
        'action': 'Send interview prep notification to user',
        'dashboard_interview_url': '/dashboard/interview',
        'api_interview_endpoint': 'POST /v1/interview/prepare',
    }), 200


@bp.get('/stats')
@_require_n8n_secret
def stats():
    """Aggregate platform stats for n8n reporting workflows."""
    now = int(time.time())
    day_start = now - 86400
    week_start = now - 7 * 86400

    with _conn() as c:
        total_users = c.execute('SELECT COUNT(*) FROM users').fetchone()[0]
        verified_users = c.execute('SELECT COUNT(*) FROM users WHERE verifyid_verified=1').fetchone()[0]
        total_kits = c.execute('SELECT COUNT(*) FROM kits').fetchone()[0]
        kits_today = c.execute('SELECT COUNT(*) FROM kits WHERE created_at >= ?', (day_start,)).fetchone()[0]
        kits_week = c.execute('SELECT COUNT(*) FROM kits WHERE created_at >= ?', (week_start,)).fetchone()[0]
        new_users_today = c.execute('SELECT COUNT(*) FROM users WHERE created_at >= ?', (day_start,)).fetchone()[0]
        cv_analyses_total = c.execute('SELECT COUNT(*) FROM cv_analyses').fetchone()[0]
        candidates_visible = c.execute('SELECT COUNT(*) FROM candidate_visibility WHERE visible=1').fetchone()[0]

    return jsonify({
        'total_users': total_users,
        'verified_users': verified_users,
        'total_kits': total_kits,
        'kits_today': kits_today,
        'kits_this_week': kits_week,
        'new_users_today': new_users_today,
        'cv_analyses_total': cv_analyses_total,
        'candidates_in_pool': candidates_visible,
        'generated_at': now,
    })
