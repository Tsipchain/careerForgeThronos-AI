"""
n8n automation webhook endpoints.

All routes require the X-N8N-Secret header matching the N8N_WEBHOOK_SECRET env var.

GET  /v1/n8n/inactive-users?days=3
    Returns users who have NOT generated a kit in the last `days` days.
    n8n polls this to trigger follow-up email sequences.

POST /v1/n8n/send-alert
    Body: { sub, message, channel }
    n8n calls this after sending an alert so CareerForge can log it.

GET  /v1/n8n/stats
    Returns platform-wide aggregate stats for n8n dashboards / reporting.
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

    return jsonify({
        'total_users': total_users,
        'verified_users': verified_users,
        'total_kits': total_kits,
        'kits_today': kits_today,
        'kits_this_week': kits_week,
        'new_users_today': new_users_today,
        'generated_at': now,
    })
