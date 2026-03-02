import sqlite3
import json
import time
import uuid
import datetime
from urllib.parse import urlparse
from typing import Optional, Dict, Any, List

_DB_PATH: Optional[str] = None

_SCHEMA_SQL = """
PRAGMA journal_mode=WAL;

CREATE TABLE IF NOT EXISTS auth_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sub TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT,
    created_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS auth_accounts_email_idx ON auth_accounts(email);

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sub TEXT UNIQUE NOT NULL,
    email TEXT,
    tenant_id TEXT,
    verifyid_verified INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    sub TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    data_json TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (sub) REFERENCES users(sub) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS profiles_sub_idx ON profiles(sub);

CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    sub TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    source_type TEXT NOT NULL,
    source_url TEXT,
    raw_text TEXT NOT NULL,
    parsed_json TEXT,
    job_fingerprint_sha256 TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (sub) REFERENCES users(sub) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS jobs_sub_fp_idx ON jobs(sub, job_fingerprint_sha256);

CREATE TABLE IF NOT EXISTS credit_ledger (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sub TEXT NOT NULL,
    delta INTEGER NOT NULL,
    reason TEXT NOT NULL,
    ref_type TEXT,
    ref_id TEXT,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS credit_ledger_sub_time_idx ON credit_ledger(sub, created_at DESC);

CREATE TABLE IF NOT EXISTS kits (
    id TEXT PRIMARY KEY,
    sub TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    job_id TEXT,
    profile_id TEXT,
    kind TEXT NOT NULL DEFAULT 'full',
    credits_charged INTEGER NOT NULL DEFAULT 0,
    idempotency_key TEXT,
    artifacts_json TEXT NOT NULL,
    attestation_txid TEXT,
    artifact_sha256 TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (sub) REFERENCES users(sub) ON DELETE CASCADE,
    UNIQUE(sub, idempotency_key)
);

CREATE TABLE IF NOT EXISTS artifacts (
    id TEXT PRIMARY KEY,
    kit_id TEXT NOT NULL,
    type TEXT NOT NULL,
    storage_url TEXT,
    content_sha256 TEXT,
    meta_json TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (kit_id) REFERENCES kits(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS applications (
    id TEXT PRIMARY KEY,
    sub TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    job_id TEXT,
    kit_id TEXT,
    status TEXT NOT NULL DEFAULT 'new',
    notes TEXT,
    next_action_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (sub) REFERENCES users(sub) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS stripe_events (
    id TEXT PRIMARY KEY,
    type TEXT,
    created_at INTEGER NOT NULL,
    raw_json TEXT
);

CREATE TABLE IF NOT EXISTS audits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id TEXT NOT NULL,
    actor_sub TEXT,
    action TEXT NOT NULL,
    target_type TEXT,
    target_id TEXT,
    details_json TEXT,
    created_at INTEGER NOT NULL
);

-- CV analysis results uploaded by users
CREATE TABLE IF NOT EXISTS cv_analyses (
    id TEXT PRIMARY KEY,
    sub TEXT NOT NULL,
    filename TEXT,
    raw_text TEXT NOT NULL,
    analysis_json TEXT,
    ats_score INTEGER,
    artifact_sha256 TEXT,
    attestation_txid TEXT,
    credits_charged INTEGER NOT NULL DEFAULT 2,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (sub) REFERENCES users(sub) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS cv_analyses_sub_idx ON cv_analyses(sub, created_at DESC);

-- Employer/recruiter accounts
CREATE TABLE IF NOT EXISTS employers (
    id TEXT PRIMARY KEY,
    sub TEXT NOT NULL,
    company_name TEXT NOT NULL,
    verified INTEGER DEFAULT 0,
    credit_balance INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (sub) REFERENCES users(sub) ON DELETE CASCADE
);

-- Controls whether a candidate appears in recruiter search
CREATE TABLE IF NOT EXISTS candidate_visibility (
    sub TEXT PRIMARY KEY,
    visible INTEGER DEFAULT 0,
    desired_roles_json TEXT,
    desired_locations_json TEXT,
    keywords_json TEXT,
    updated_at INTEGER NOT NULL
);

-- Identity verification sessions (tri-channel: agent → AI → manager)
CREATE TABLE IF NOT EXISTS verification_sessions (
    id TEXT PRIMARY KEY,
    sub TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    channel TEXT NOT NULL DEFAULT 'ai',
    agent_sub TEXT,
    fraud_score REAL,
    fraud_flags_json TEXT,
    doc_front_b64 TEXT,
    doc_back_b64 TEXT,
    video_b64 TEXT,
    video_duration_s REAL,
    manager_decision TEXT,
    manager_note TEXT,
    manager_sub TEXT,
    decided_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (sub) REFERENCES users(sub) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS vsess_sub_idx ON verification_sessions(sub, created_at DESC);
CREATE INDEX IF NOT EXISTS vsess_status_idx ON verification_sessions(status);

-- Anti-bot psychology test results
CREATE TABLE IF NOT EXISTS psychology_tests (
    id TEXT PRIMARY KEY,
    sub TEXT NOT NULL,
    answers_json TEXT NOT NULL,
    score INTEGER NOT NULL DEFAULT 0,
    flags_json TEXT,
    passed INTEGER NOT NULL DEFAULT 0,
    duration_ms INTEGER,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (sub) REFERENCES users(sub) ON DELETE CASCADE
);

-- Job-search guarantee tracking
CREATE TABLE IF NOT EXISTS guarantee_requests (
    id TEXT PRIMARY KEY,
    sub TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    credits_refunded INTEGER DEFAULT 0,
    reason TEXT,
    reviewed_by TEXT,
    created_at INTEGER NOT NULL,
    resolved_at INTEGER
);
"""


def init_db(database_url: str) -> None:
    global _DB_PATH
    u = urlparse(database_url)
    if u.scheme != 'sqlite':
        raise RuntimeError('MVP template supports sqlite only. Set DATABASE_URL=sqlite:///careerforge.db')
    path = (u.path or '').lstrip('/')
    if not path:
        path = 'careerforge.db'
    _DB_PATH = path

    conn = sqlite3.connect(_DB_PATH)
    try:
        conn.executescript(_SCHEMA_SQL)
        conn.commit()
    finally:
        conn.close()


def _conn() -> sqlite3.Connection:
    if not _DB_PATH:
        raise RuntimeError('DB not initialized')
    conn = sqlite3.connect(_DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def _iso(ts: int) -> str:
    return datetime.datetime.utcfromtimestamp(ts).strftime('%Y-%m-%dT%H:%M:%SZ')


# ---------------------------------------------------------------------------
# Auth accounts (CareerForge native login)
# ---------------------------------------------------------------------------

import hashlib
import secrets as _secrets


def _hash_password(password: str, salt: str) -> str:
    return hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 260_000).hex()


def create_account(email: str, password: str, full_name: str = '') -> Optional[Dict]:
    """Create a new auth account. Returns account dict or None if email taken."""
    now = int(time.time())
    sub = 'cf_' + uuid.uuid4().hex
    salt = _secrets.token_hex(16)
    pw_hash = f"{salt}:{_hash_password(password, salt)}"
    with _conn() as c:
        try:
            c.execute(
                'INSERT INTO auth_accounts (sub, email, password_hash, full_name, created_at) VALUES (?,?,?,?,?)',
                (sub, email.lower().strip(), pw_hash, full_name, now)
            )
            return {'sub': sub, 'email': email.lower().strip(), 'full_name': full_name}
        except sqlite3.IntegrityError:
            return None


def verify_account(email: str, password: str) -> Optional[Dict]:
    """Verify credentials. Returns account dict or None if invalid."""
    with _conn() as c:
        row = c.execute(
            'SELECT sub, email, password_hash, full_name FROM auth_accounts WHERE email=?',
            (email.lower().strip(),)
        ).fetchone()
    if not row:
        return None
    stored = row['password_hash']
    salt, expected = stored.split(':', 1)
    if not _secrets.compare_digest(_hash_password(password, salt), expected):
        return None
    return {'sub': row['sub'], 'email': row['email'], 'full_name': row['full_name']}


def get_account_by_sub(sub: str) -> Optional[Dict]:
    with _conn() as c:
        row = c.execute(
            'SELECT sub, email, full_name FROM auth_accounts WHERE sub=?', (sub,)
        ).fetchone()
    return dict(row) if row else None


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------

def upsert_user(sub: str, email: Optional[str], tenant_id: Optional[str], verifyid_verified: bool) -> None:
    now = int(time.time())
    with _conn() as c:
        c.execute('''
        INSERT INTO users (sub, email, tenant_id, verifyid_verified, created_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(sub) DO UPDATE SET
            email=excluded.email,
            tenant_id=excluded.tenant_id,
            verifyid_verified=excluded.verifyid_verified
        ''', (sub, email, tenant_id, 1 if verifyid_verified else 0, now))


# ---------------------------------------------------------------------------
# Profiles
# ---------------------------------------------------------------------------

def upsert_profile(sub: str, tenant_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    now = int(time.time())
    with _conn() as c:
        row = c.execute('SELECT id, version FROM profiles WHERE sub=?', (sub,)).fetchone()
        if row:
            profile_id = row['id']
            new_version = row['version'] + 1
            c.execute(
                'UPDATE profiles SET version=?, data_json=?, tenant_id=?, updated_at=? WHERE id=?',
                (new_version, json.dumps(data, ensure_ascii=False), tenant_id, now, profile_id)
            )
        else:
            profile_id = 'pro_' + uuid.uuid4().hex[:20]
            new_version = 1
            c.execute(
                'INSERT INTO profiles (id, sub, tenant_id, version, data_json, created_at, updated_at) VALUES (?,?,?,?,?,?,?)',
                (profile_id, sub, tenant_id, new_version,
                 json.dumps(data, ensure_ascii=False), now, now)
            )
    return {'profile_id': profile_id, 'profile_version': new_version, 'stored_at': _iso(now)}


def get_profile(sub: str) -> Optional[Dict[str, Any]]:
    with _conn() as c:
        row = c.execute('SELECT * FROM profiles WHERE sub=?', (sub,)).fetchone()
        if not row:
            return None
        return {
            'profile_id': row['id'],
            'profile_version': row['version'],
            'data': json.loads(row['data_json']),
            'stored_at': _iso(row['updated_at']),
        }


# ---------------------------------------------------------------------------
# Jobs
# ---------------------------------------------------------------------------

def upsert_job(sub: str, tenant_id: str, source_type: str, raw_text: str,
               fingerprint: str, source_url: Optional[str],
               parsed: Optional[Dict]) -> Dict[str, Any]:
    now = int(time.time())
    with _conn() as c:
        row = c.execute(
            'SELECT id FROM jobs WHERE sub=? AND job_fingerprint_sha256=?', (sub, fingerprint)
        ).fetchone()
        if row:
            job_id = row['id']
            if parsed:
                c.execute('UPDATE jobs SET parsed_json=? WHERE id=?',
                          (json.dumps(parsed, ensure_ascii=False), job_id))
        else:
            job_id = 'job_' + uuid.uuid4().hex[:20]
            c.execute(
                'INSERT INTO jobs (id, sub, tenant_id, source_type, source_url, raw_text, parsed_json, job_fingerprint_sha256, created_at) VALUES (?,?,?,?,?,?,?,?,?)',
                (job_id, sub, tenant_id, source_type, source_url, raw_text,
                 json.dumps(parsed, ensure_ascii=False) if parsed else None,
                 fingerprint, now)
            )
    return {'job_id': job_id, 'job_fingerprint_sha256': fingerprint}


def get_job(job_id: str, sub: str) -> Optional[Dict[str, Any]]:
    with _conn() as c:
        row = c.execute('SELECT * FROM jobs WHERE id=? AND sub=?', (job_id, sub)).fetchone()
        if not row:
            return None
        return {
            'job_id': row['id'],
            'source_type': row['source_type'],
            'source_url': row['source_url'],
            'raw_text': row['raw_text'],
            'parsed': json.loads(row['parsed_json']) if row['parsed_json'] else None,
            'job_fingerprint_sha256': row['job_fingerprint_sha256'],
        }


# ---------------------------------------------------------------------------
# Credits ledger
# ---------------------------------------------------------------------------

def add_credits(sub: str, delta: int, reason: str,
                ref_type: str = None, ref_id: str = None) -> None:
    now = int(time.time())
    with _conn() as c:
        c.execute(
            'INSERT INTO credit_ledger (sub, delta, reason, ref_type, ref_id, created_at) VALUES (?,?,?,?,?,?)',
            (sub, delta, reason, ref_type, ref_id, now)
        )


def get_balance(sub: str) -> int:
    with _conn() as c:
        row = c.execute(
            'SELECT COALESCE(SUM(delta),0) AS bal FROM credit_ledger WHERE sub=?', (sub,)
        ).fetchone()
        return int(row['bal']) if row else 0


# ---------------------------------------------------------------------------
# Kits
# ---------------------------------------------------------------------------

def get_kit_by_idempotency(sub: str, idem_key: str) -> Optional[Dict[str, Any]]:
    with _conn() as c:
        row = c.execute(
            'SELECT * FROM kits WHERE sub=? AND idempotency_key=?', (sub, idem_key)
        ).fetchone()
        return dict(row) if row else None


def save_kit(kit_id: str, sub: str, tenant_id: str, job_id: Optional[str],
             profile_id: Optional[str], kind: str, credits_charged: int,
             idempotency_key: Optional[str], artifacts_json: str,
             attestation_txid: Optional[str] = None,
             artifact_sha256: Optional[str] = None) -> None:
    now = int(time.time())
    with _conn() as c:
        c.execute('''
        INSERT INTO kits (id, sub, tenant_id, job_id, profile_id, kind, credits_charged,
                          idempotency_key, artifacts_json, attestation_txid, artifact_sha256, created_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
        ''', (kit_id, sub, tenant_id, job_id, profile_id, kind, credits_charged,
              idempotency_key, artifacts_json, attestation_txid, artifact_sha256, now))


def list_kits(sub: str, limit: int = 25) -> List[Dict[str, Any]]:
    with _conn() as c:
        rows = c.execute(
            'SELECT id, kind, job_id, credits_charged, attestation_txid, artifact_sha256, created_at '
            'FROM kits WHERE sub=? ORDER BY created_at DESC LIMIT ?',
            (sub, limit)
        ).fetchall()
        return [dict(r) for r in rows]


# ---------------------------------------------------------------------------
# Stripe events (dedup)
# ---------------------------------------------------------------------------

def has_free_pack(sub: str) -> bool:
    """Return True if this user has already received the verifyid free pack."""
    with _conn() as c:
        row = c.execute(
            "SELECT COUNT(*) AS cnt FROM credit_ledger WHERE sub=? AND reason='verifyid_free_pack'",
            (sub,)
        ).fetchone()
        return bool(row and row['cnt'] > 0)


def has_stripe_event(event_id: str) -> bool:
    with _conn() as c:
        row = c.execute('SELECT id FROM stripe_events WHERE id=?', (event_id,)).fetchone()
        return bool(row)


def mark_stripe_event(event_id: str, event_type: str = '',
                      raw: Optional[Dict] = None) -> None:
    now = int(time.time())
    with _conn() as c:
        c.execute(
            'INSERT OR IGNORE INTO stripe_events (id, type, created_at, raw_json) VALUES (?,?,?,?)',
            (event_id, event_type, now,
             json.dumps(raw, ensure_ascii=False) if raw else None)
        )


# ---------------------------------------------------------------------------
# Audits
# ---------------------------------------------------------------------------

def write_audit(tenant_id: str, actor_sub: Optional[str], action: str,
                target_type: Optional[str] = None, target_id: Optional[str] = None,
                details: Optional[Dict] = None) -> None:
    now = int(time.time())
    with _conn() as c:
        c.execute(
            'INSERT INTO audits (tenant_id, actor_sub, action, target_type, target_id, details_json, created_at) VALUES (?,?,?,?,?,?,?)',
            (tenant_id, actor_sub, action, target_type, target_id,
             json.dumps(details, ensure_ascii=False) if details else None, now)
        )


# ---------------------------------------------------------------------------
# CV Analyses
# ---------------------------------------------------------------------------

def save_cv_analysis(
    analysis_id: str, sub: str, filename: str, raw_text: str,
    analysis: Dict[str, Any], ats_score_val: int,
    artifact_sha256: str, attestation_txid: Optional[str],
    credits_charged: int,
) -> Dict[str, Any]:
    now = int(time.time())
    with _conn() as c:
        c.execute(
            '''INSERT OR REPLACE INTO cv_analyses
               (id, sub, filename, raw_text, analysis_json, ats_score,
                artifact_sha256, attestation_txid, credits_charged, created_at)
               VALUES (?,?,?,?,?,?,?,?,?,?)''',
            (analysis_id, sub, filename, raw_text,
             json.dumps(analysis, ensure_ascii=False), ats_score_val,
             artifact_sha256, attestation_txid, credits_charged, now)
        )
    return {'analysis_id': analysis_id, 'created_at': _iso(now)}


def list_cv_analyses(sub: str, limit: int = 20) -> List[Dict[str, Any]]:
    with _conn() as c:
        rows = c.execute(
            'SELECT id, sub, filename, ats_score, credits_charged, created_at '
            'FROM cv_analyses WHERE sub=? ORDER BY created_at DESC LIMIT ?',
            (sub, limit)
        ).fetchall()
    return [dict(r) for r in rows]


def get_cv_analysis(analysis_id: str, sub: str) -> Optional[Dict[str, Any]]:
    with _conn() as c:
        row = c.execute(
            'SELECT * FROM cv_analyses WHERE id=? AND sub=?', (analysis_id, sub)
        ).fetchone()
        if not row:
            return None
        d = dict(row)
        d['analysis'] = json.loads(d.pop('analysis_json') or '{}')
        return d


# ---------------------------------------------------------------------------
# Candidate visibility (opt-in recruiter pool)
# ---------------------------------------------------------------------------

def set_candidate_visibility(
    sub: str, visible: bool,
    desired_roles: Optional[List[str]] = None,
    desired_locations: Optional[List[str]] = None,
    keywords: Optional[List[str]] = None,
) -> None:
    now = int(time.time())
    with _conn() as c:
        c.execute(
            '''INSERT INTO candidate_visibility
               (sub, visible, desired_roles_json, desired_locations_json, keywords_json, updated_at)
               VALUES (?,?,?,?,?,?)
               ON CONFLICT(sub) DO UPDATE SET
                 visible=excluded.visible,
                 desired_roles_json=excluded.desired_roles_json,
                 desired_locations_json=excluded.desired_locations_json,
                 keywords_json=excluded.keywords_json,
                 updated_at=excluded.updated_at''',
            (sub, 1 if visible else 0,
             json.dumps(desired_roles or [], ensure_ascii=False),
             json.dumps(desired_locations or [], ensure_ascii=False),
             json.dumps(keywords or [], ensure_ascii=False), now)
        )


def search_candidates(
    role_query: str = '', location: str = '', limit: int = 20, offset: int = 0
) -> List[Dict[str, Any]]:
    """Return visible candidates whose profile matches the query."""
    with _conn() as c:
        rows = c.execute(
            '''SELECT cv.sub, cv.visible, cv.desired_roles_json, cv.desired_locations_json,
                      cv.keywords_json, u.email,
                      p.data_json,
                      (SELECT ats_score FROM cv_analyses WHERE sub=cv.sub ORDER BY created_at DESC LIMIT 1) AS latest_ats
               FROM candidate_visibility cv
               JOIN users u ON u.sub = cv.sub
               LEFT JOIN profiles p ON p.sub = cv.sub
               WHERE cv.visible = 1
               ORDER BY latest_ats DESC NULLS LAST
               LIMIT ? OFFSET ?''',
            (limit, offset)
        ).fetchall()

    candidates = []
    role_lower = role_query.lower()
    loc_lower = location.lower()

    for r in rows:
        roles = json.loads(r['desired_roles_json'] or '[]')
        locs = json.loads(r['desired_locations_json'] or '[]')
        kwds = json.loads(r['keywords_json'] or '[]')
        profile_data = json.loads(r['data_json'] or '{}') if r['data_json'] else {}
        identity = profile_data.get('identity', {})

        # Simple keyword match score
        match_score = 100
        if role_lower:
            role_match = any(role_lower in role.lower() for role in roles) or \
                         any(role_lower in kw.lower() for kw in kwds)
            if not role_match:
                match_score -= 40
        if loc_lower:
            loc_match = any(loc_lower in loc.lower() for loc in locs)
            if not loc_match:
                match_score -= 30
        if match_score <= 0:
            continue

        candidates.append({
            'sub': r['sub'],
            'name': identity.get('full_name', 'Anonymous'),
            'title': identity.get('current_title', ''),
            'location': identity.get('location', ''),
            'desired_roles': roles,
            'desired_locations': locs,
            'keywords': kwds,
            'latest_ats_score': r['latest_ats'],
            'match_score': match_score,
        })

    return sorted(candidates, key=lambda x: x['match_score'], reverse=True)


# ---------------------------------------------------------------------------
# GDPR: hard-delete all user data
# ---------------------------------------------------------------------------

def delete_user_data(sub: str) -> Dict[str, Any]:
    """Remove all PII and generated content for a user. Keeps audit trail rows."""
    with _conn() as c:
        tables = [
            'cv_analyses', 'candidate_visibility', 'profiles', 'jobs',
            'kits', 'artifacts', 'applications', 'credit_ledger',
            'verification_sessions', 'psychology_tests',
        ]
        deleted: Dict[str, int] = {}
        for tbl in tables:
            cur = c.execute(f'DELETE FROM {tbl} WHERE sub=?', (sub,))
            deleted[tbl] = cur.rowcount
        # Anonymise auth account — keep row for dedup but wipe PII
        c.execute(
            "UPDATE auth_accounts SET email='[deleted]@deleted', full_name='[deleted]', password_hash='[deleted]' WHERE sub=?",
            (sub,)
        )
        c.execute(
            "UPDATE users SET email='[deleted]@deleted' WHERE sub=?", (sub,)
        )
    return {'deleted_rows': deleted}


# ---------------------------------------------------------------------------
# Verification sessions
# ---------------------------------------------------------------------------

def create_verification_session(
    session_id: str, sub: str, channel: str,
    doc_front_b64: Optional[str] = None,
    doc_back_b64: Optional[str] = None,
    video_b64: Optional[str] = None,
    video_duration_s: Optional[float] = None,
) -> Dict[str, Any]:
    now = int(time.time())
    with _conn() as c:
        c.execute(
            '''INSERT INTO verification_sessions
               (id, sub, status, channel, doc_front_b64, doc_back_b64,
                video_b64, video_duration_s, created_at, updated_at)
               VALUES (?,?,?,?,?,?,?,?,?,?)''',
            (session_id, sub, 'pending', channel,
             doc_front_b64, doc_back_b64, video_b64, video_duration_s, now, now)
        )
    return {'session_id': session_id, 'status': 'pending', 'created_at': _iso(now)}


def update_verification_session(session_id: str, **kwargs: Any) -> None:
    now = int(time.time())
    allowed = {
        'status', 'channel', 'agent_sub', 'fraud_score', 'fraud_flags_json',
        'manager_decision', 'manager_note', 'manager_sub', 'decided_at',
    }
    sets = ', '.join(f'{k}=?' for k in kwargs if k in allowed)
    vals = [v for k, v in kwargs.items() if k in allowed]
    if not sets:
        return
    vals += [now, session_id]
    with _conn() as c:
        c.execute(f'UPDATE verification_sessions SET {sets}, updated_at=? WHERE id=?', vals)


def get_verification_session(session_id: str) -> Optional[Dict[str, Any]]:
    with _conn() as c:
        row = c.execute(
            'SELECT id, sub, status, channel, agent_sub, fraud_score, fraud_flags_json, '
            'video_duration_s, manager_decision, manager_note, created_at, updated_at '
            'FROM verification_sessions WHERE id=?', (session_id,)
        ).fetchone()
        return dict(row) if row else None


def get_user_verification_session(sub: str) -> Optional[Dict[str, Any]]:
    with _conn() as c:
        row = c.execute(
            'SELECT id, sub, status, channel, fraud_score, manager_decision, created_at '
            'FROM verification_sessions WHERE sub=? ORDER BY created_at DESC LIMIT 1', (sub,)
        ).fetchone()
        return dict(row) if row else None


def list_pending_verifications(limit: int = 50) -> List[Dict[str, Any]]:
    with _conn() as c:
        rows = c.execute(
            '''SELECT vs.id, vs.sub, vs.status, vs.channel, vs.fraud_score,
                      vs.video_duration_s, vs.created_at, u.email
               FROM verification_sessions vs
               JOIN users u ON u.sub = vs.sub
               WHERE vs.status IN ('pending','ai_review','manager_review')
               ORDER BY vs.created_at ASC
               LIMIT ?''', (limit,)
        ).fetchall()
    return [dict(r) for r in rows]


def get_session_doc(session_id: str, doc_type: str) -> Optional[str]:
    """Return base64-encoded document — only for internal/manager use."""
    col = 'doc_front_b64' if doc_type == 'front' else ('doc_back_b64' if doc_type == 'back' else 'video_b64')
    with _conn() as c:
        row = c.execute(f'SELECT {col} FROM verification_sessions WHERE id=?', (session_id,)).fetchone()
        return row[0] if row else None


# ---------------------------------------------------------------------------
# Psychology tests
# ---------------------------------------------------------------------------

def save_psychology_test(
    test_id: str, sub: str, answers: List[Dict],
    score: int, flags: List[str], passed: bool, duration_ms: int,
) -> None:
    now = int(time.time())
    with _conn() as c:
        c.execute(
            '''INSERT OR REPLACE INTO psychology_tests
               (id, sub, answers_json, score, flags_json, passed, duration_ms, created_at)
               VALUES (?,?,?,?,?,?,?,?)''',
            (test_id, sub,
             json.dumps(answers, ensure_ascii=False),
             score,
             json.dumps(flags, ensure_ascii=False),
             1 if passed else 0, duration_ms, now)
        )


def get_psychology_test(sub: str) -> Optional[Dict[str, Any]]:
    with _conn() as c:
        row = c.execute(
            'SELECT id, score, passed, flags_json, duration_ms, created_at '
            'FROM psychology_tests WHERE sub=? ORDER BY created_at DESC LIMIT 1',
            (sub,)
        ).fetchone()
        if not row:
            return None
        d = dict(row)
        d['flags'] = json.loads(d.pop('flags_json') or '[]')
        return d


# ---------------------------------------------------------------------------
# Guarantee requests
# ---------------------------------------------------------------------------

def create_guarantee_request(req_id: str, sub: str, reason: str) -> Dict[str, Any]:
    now = int(time.time())
    with _conn() as c:
        # One active request per user
        existing = c.execute(
            "SELECT id FROM guarantee_requests WHERE sub=? AND status='pending'", (sub,)
        ).fetchone()
        if existing:
            return {'error': 'already_pending', 'request_id': existing['id']}
        c.execute(
            '''INSERT INTO guarantee_requests (id, sub, status, reason, created_at)
               VALUES (?,?,?,?,?)''',
            (req_id, sub, 'pending', reason, now)
        )
    return {'request_id': req_id, 'status': 'pending'}


def resolve_guarantee_request(req_id: str, credits_refunded: int, reviewed_by: str) -> None:
    now = int(time.time())
    with _conn() as c:
        c.execute(
            '''UPDATE guarantee_requests
               SET status='resolved', credits_refunded=?, reviewed_by=?, resolved_at=?
               WHERE id=?''',
            (credits_refunded, reviewed_by, now, req_id)
        )


def get_user_guarantee_status(sub: str) -> Dict[str, Any]:
    now = int(time.time())
    with _conn() as c:
        # Kits generated (active search indicator)
        kit_count = c.execute('SELECT COUNT(*) FROM kits WHERE sub=?', (sub,)).fetchone()[0]
        # Days since first kit
        first_kit = c.execute('SELECT MIN(created_at) FROM kits WHERE sub=?', (sub,)).fetchone()[0]
        days_active = int((now - first_kit) / 86400) if first_kit else 0
        # Pending request
        req = c.execute(
            "SELECT id, status, credits_refunded FROM guarantee_requests WHERE sub=? ORDER BY created_at DESC LIMIT 1",
            (sub,)
        ).fetchone()
    eligible = kit_count >= 1 and days_active >= 7
    return {
        'kit_count': kit_count,
        'days_active': days_active,
        'eligible_for_refund': eligible,
        'existing_request': dict(req) if req else None,
    }
