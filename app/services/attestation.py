import os
import time
import secrets
from typing import Dict, Any, Optional

from ..utils.canonical import canonical_json_bytes
from ..utils.crypto_secp256k1 import sha256, sign_compact, pubkey_from_privkey_hex


def _env_int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, str(default)))
    except Exception:
        return default


def build_ai_attestation_payload(
    *,
    artifact_type: str,
    artifact_sha256_hex: str,
    artifact_version: str,
    model_id: str,
    tenant_id: str,
    verifyid_verified: bool,
    job_fingerprint_sha256_hex: Optional[str] = None,
) -> Dict[str, Any]:
    payload: Dict[str, Any] = {
        'tx_type': 'AI_ATTESTATION',
        'service': 'careerforge',
        'schema_version': 1,
        'artifact_type': artifact_type,
        'artifact_sha256': artifact_sha256_hex.lower(),
        'artifact_version': artifact_version,
        'model_id': model_id,
        'tenant_id': tenant_id,
        'verifyid_verified': bool(verifyid_verified),
        'created_at': int(time.time()),
        'nonce': secrets.token_hex(12),
    }
    if job_fingerprint_sha256_hex:
        payload['job_fingerprint_sha256'] = job_fingerprint_sha256_hex.lower()
    return payload


def build_ai_attestation_tx(payload: Dict[str, Any]) -> Dict[str, Any]:
    prefix = os.getenv('SERVICE_PREFIX', 'THRONOS|AI_ATTESTATION|V1|careerforge|').encode('utf-8')
    priv = os.getenv('ATTESTOR_PRIVKEY_HEX', '').strip()
    if not priv:
        raise RuntimeError('ATTESTOR_PRIVKEY_HEX not set')

    pub = os.getenv('ATTESTOR_PUBKEY_HEX', '').strip()
    if not pub:
        pub = pubkey_from_privkey_hex(priv)

    payload_bytes = canonical_json_bytes(payload)
    signing_bytes = prefix + payload_bytes
    txid = sha256(signing_bytes).hex()
    sig = sign_compact(priv, signing_bytes)

    return {
        'txid': txid,
        'payload': payload,
        'attestor_pubkey': pub,
        'attestor_signature': sig,
    }


def build_ai_service_register_payload(*, service_name: str, pubkey_hex: str, scopes: list[str]) -> Dict[str, Any]:
    payload: Dict[str, Any] = {
        'tx_type': 'AI_SERVICE_REGISTER',
        'schema_version': 1,
        'service_name': service_name,
        'pubkey': pubkey_hex.lower(),
        'scopes': scopes,
        'created_at': int(time.time()),
        'nonce': secrets.token_hex(12),
    }
    return payload


def build_ai_service_register_tx(payload: Dict[str, Any]) -> Dict[str, Any]:
    # For v1 we let the service self-sign registration.
    # Core node can enforce additional rules later (fee, governance, rate limits).
    prefix = os.getenv('SERVICE_PREFIX_REGISTER', 'THRONOS|AI_SERVICE_REGISTER|V1|').encode('utf-8')
    priv = os.getenv('ATTESTOR_PRIVKEY_HEX', '').strip()
    if not priv:
        raise RuntimeError('ATTESTOR_PRIVKEY_HEX not set')

    payload_bytes = canonical_json_bytes(payload)
    signing_bytes = prefix + payload_bytes
    txid = sha256(signing_bytes).hex()
    sig = sign_compact(priv, signing_bytes)

    # pubkey in payload already
    return {
        'txid': txid,
        'payload': payload,
        'registrant_signature': sig,
    }
