-- CareerForge Thronos AI — PostgreSQL schema (production)
-- For SQLite MVP the schema is applied automatically in app/db/store.py

-- users: maps gateway sub -> internal user
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    gateway_sub TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    email TEXT,
    verifyid_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (gateway_sub, tenant_id)
);

CREATE TABLE IF NOT EXISTS plans (
    id BIGSERIAL PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,       -- e.g. PACK_30, SUB_STARTER
    name TEXT NOT NULL,
    credits INT NOT NULL,            -- credits granted per purchase/cycle
    active BOOLEAN NOT NULL DEFAULT TRUE
);

-- Seed default plans
INSERT INTO plans (code, name, credits) VALUES
    ('PACK_30',      'Starter Pack',    30),
    ('PACK_100',     'Pro Pack',       100),
    ('PACK_300',     'Power Pack',     300),
    ('SUB_STARTER',  'Monthly Starter', 50),
    ('SUB_PRO',      'Monthly Pro',    200)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS subscriptions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT UNIQUE,
    stripe_price_id TEXT,
    status TEXT NOT NULL,             -- active, past_due, canceled
    current_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,              -- pro_<hex>
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    data_json JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS profiles_user_idx ON profiles(user_id);

CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,              -- job_<hex>
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL,
    source_type TEXT NOT NULL,        -- url/paste/pdf_text
    source_url TEXT,
    raw_text TEXT NOT NULL,
    parsed_json JSONB,
    job_fingerprint_sha256 TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS jobs_user_fp_idx ON jobs(user_id, job_fingerprint_sha256);

CREATE TABLE IF NOT EXISTS credit_ledger (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL,
    delta INT NOT NULL,               -- +grant, -consume, -refund
    reason TEXT NOT NULL,             -- e.g. STRIPE_PACK_PURCHASE, KIT_GENERATE
    ref_type TEXT,                    -- STRIPE_EVENT, KIT, MANUAL_ADJUST
    ref_id TEXT,                      -- stripe_event_id, kit_id, etc.
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS credit_ledger_user_time_idx ON credit_ledger(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS kits (
    id TEXT PRIMARY KEY,              -- kit_<hex>
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL,
    job_id TEXT REFERENCES jobs(id) ON DELETE SET NULL,
    profile_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
    kind TEXT NOT NULL,               -- full/cv_only/ats_only/cover_only
    credits_charged INT NOT NULL,
    idempotency_key TEXT,
    artifacts_json JSONB NOT NULL,
    attestation_txid TEXT,
    artifact_sha256 TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS artifacts (
    id TEXT PRIMARY KEY,              -- art_<hex>
    kit_id TEXT NOT NULL REFERENCES kits(id) ON DELETE CASCADE,
    type TEXT NOT NULL,               -- cv_docx, cover_pdf, ats_report_json
    storage_url TEXT,                 -- signed URL or object key
    content_sha256 TEXT,
    meta JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS applications (
    id TEXT PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL,
    job_id TEXT REFERENCES jobs(id) ON DELETE SET NULL,
    kit_id TEXT REFERENCES kits(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'new', -- new/applied/followup/interview/offer/rejected
    notes TEXT,
    next_action_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Stripe webhook dedupe
CREATE TABLE IF NOT EXISTS stripe_events (
    id TEXT PRIMARY KEY,              -- stripe event id
    type TEXT NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    raw JSONB
);

CREATE TABLE IF NOT EXISTS audits (
    id BIGSERIAL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    actor_user_id BIGINT REFERENCES users(id),
    action TEXT NOT NULL,             -- CREDIT_GRANT, KIT_GENERATE, ATTEST_SUBMIT, etc.
    target_type TEXT,
    target_id TEXT,
    ip INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    details JSONB
);
