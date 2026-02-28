import sqlite3
from urllib.parse import urlparse
from typing import Optional, Dict, Any, List
import time

_DB_PATH: Optional[str] = None


def init_db(database_url: str) -> None:
    global _DB_PATH
    u = urlparse(database_url)
    if u.scheme != 'sqlite':
        # MVP: only sqlite supported in this template
        raise RuntimeError('MVP template supports sqlite only. Set DATABASE_URL=sqlite:///careerforge.db')
    path = (u.path or '').lstrip('/')
    if not path:
        path = 'careerforge.db'
    _DB_PATH = path

    with _conn() as c:
        c.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sub TEXT UNIQUE NOT NULL,
            email TEXT,
            tenant_id TEXT,
            verifyid_verified INTEGER DEFAULT 0,
            created_at INTEGER NOT NULL
        )
        ''')
        c.execute('''
        CREATE TABLE IF NOT EXISTS credit_ledger (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sub TEXT NOT NULL,
            delta INTEGER NOT NULL,
            reason TEXT NOT NULL,
            ref_type TEXT,
            ref_id TEXT,
            created_at INTEGER NOT NULL
        )
        ''')
        c.execute('''
        CREATE TABLE IF NOT EXISTS kits (
            id TEXT PRIMARY KEY,
            sub TEXT NOT NULL,
            tenant_id TEXT,
            job_title TEXT,
            artifacts_json TEXT NOT NULL,
            attestation_txid TEXT,
            created_at INTEGER NOT NULL
        )
        ''')
        c.execute('''
        CREATE TABLE IF NOT EXISTS stripe_events (
            id TEXT PRIMARY KEY,
            created_at INTEGER NOT NULL
        )
        ''')


def _conn() -> sqlite3.Connection:
    if not _DB_PATH:
        raise RuntimeError('DB not initialized')
    conn = sqlite3.connect(_DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


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


def add_credits(sub: str, delta: int, reason: str, ref_type: str = None, ref_id: str = None) -> None:
    now = int(time.time())
    with _conn() as c:
        c.execute('''
        INSERT INTO credit_ledger (sub, delta, reason, ref_type, ref_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ''', (sub, delta, reason, ref_type, ref_id, now))


def get_balance(sub: str) -> int:
    with _conn() as c:
        row = c.execute('SELECT COALESCE(SUM(delta),0) AS bal FROM credit_ledger WHERE sub=?', (sub,)).fetchone()
        return int(row['bal']) if row else 0


def has_stripe_event(event_id: str) -> bool:
    with _conn() as c:
        row = c.execute('SELECT id FROM stripe_events WHERE id=?', (event_id,)).fetchone()
        return bool(row)


def mark_stripe_event(event_id: str) -> None:
    now = int(time.time())
    with _conn() as c:
        c.execute('INSERT OR IGNORE INTO stripe_events (id, created_at) VALUES (?, ?)', (event_id, now))


def save_kit(kit_id: str, sub: str, tenant_id: str, job_title: str, artifacts_json: str, attestation_txid: str = None) -> None:
    now = int(time.time())
    with _conn() as c:
        c.execute('''
        INSERT INTO kits (id, sub, tenant_id, job_title, artifacts_json, attestation_txid, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (kit_id, sub, tenant_id, job_title, artifacts_json, attestation_txid, now))


def list_kits(sub: str, limit: int = 25) -> List[Dict[str, Any]]:
    with _conn() as c:
        rows = c.execute('SELECT id, job_title, attestation_txid, created_at FROM kits WHERE sub=? ORDER BY created_at DESC LIMIT ?', (sub, limit)).fetchall()
        return [dict(r) for r in rows]
