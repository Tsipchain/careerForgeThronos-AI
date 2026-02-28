# CareerForge Thronos AI (L2 Service)

Production-lean MVP for **CareerForge Thronos AI**:
- RS256 JWT auth behind a shared gateway
- Stripe (fiat, off-chain) **credit ledger** inside the service
- Thronos Chain integration:
  - `AI_SERVICE_REGISTER` tx type (registry)
  - `AI_ATTESTATION` tx type (hash-only integrity proofs)
- Canonical JSON + `txid = sha256(prefix + payload_bytes)`
- Allowlist enforcement designed to be driven by on-chain registry

## Run locally

```bash
cd careerforge_api
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python -m app
```

Service: http://localhost:8080

## Deploy (Railway)
- Set variables from `.env.example` in Railway
- Start command:

```bash
gunicorn -w 2 -k gthread -b 0.0.0.0:$PORT app:create_app()
```

## Key endpoints
- `GET /health`
- `GET /v1/credits/balance`
- `POST /v1/credits/checkout-session` (Stripe Checkout)
- `POST /v1/stripe/webhook` (Stripe webhooks)
- `POST /v1/attestation/register-service` (submits `AI_SERVICE_REGISTER` to chain)
- `POST /v1/attestation/submit` (submits `AI_ATTESTATION` to chain)
- `POST /v1/kit/generate` (stub generator that demonstrates credit burn + attestation)

## Notes
- **Never put PII on-chain**. Only hashes + metadata.
- The chain registry can be used by the core node to enforce allowlisting.


## Setup Guide PDF

See `docs/CareerForge_ThronosAI_Setup_Guide.pdf` for Railway + Stripe + Thronos tx types setup (Greece/EU/UK).

