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
