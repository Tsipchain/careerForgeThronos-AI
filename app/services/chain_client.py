import os
import requests
from typing import Dict, Any


def submit_tx(tx: Dict[str, Any]) -> Dict[str, Any]:
    base = os.getenv('THRONOS_CHAIN_API_URL', '').rstrip('/')
    path = os.getenv('CHAIN_SUBMIT_PATH', '/tx/submit')
    if not base:
        raise RuntimeError('THRONOS_CHAIN_API_URL not configured')

    url = f"{base}{path}"
    r = requests.post(url, json=tx, timeout=20)
    try:
        data = r.json()
    except Exception:
        data = {'raw': r.text}
    if r.status_code >= 300:
        raise RuntimeError(f"Chain submit failed: {r.status_code} {data}")
    return data
