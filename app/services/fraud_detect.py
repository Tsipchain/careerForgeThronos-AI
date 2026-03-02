"""
Heuristic fraud / identity-verification scoring.

Inputs
------
- doc_front_b64, doc_back_b64  : base64-encoded images of ID documents (JPEG/PNG)
- video_b64                    : base64-encoded short video (<30 s) of the user
- video_duration_s             : reported duration in seconds
- declared_name                : full name from the user's profile

Returns
-------
{
  "fraud_score": float 0–100,   # 0 = looks legit, 100 = highly suspicious
  "flags": [str, ...],          # human-readable reasons
  "recommendation": "approve" | "manual_review" | "reject"
}

In production you would call a real OCR/face-match/liveness vendor
(Onfido, Jumio, AWS Rekognition, etc.).  This module implements
a deterministic heuristic fallback so the pipeline always returns
a decision even when no external service is configured.
"""
from __future__ import annotations

import base64
import hashlib
import math
import re
from typing import Any, Dict, List, Optional


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def analyse(
    *,
    doc_front_b64: Optional[str] = None,
    doc_back_b64: Optional[str] = None,
    video_b64: Optional[str] = None,
    video_duration_s: Optional[float] = None,
    declared_name: Optional[str] = '',
) -> Dict[str, Any]:
    """
    Run all heuristic checks and return a consolidated fraud report.
    """
    flags: List[str] = []
    score = 0.0

    # 1. Document presence checks
    if not doc_front_b64:
        flags.append('missing_doc_front')
        score += 25
    else:
        s, f = _check_document(doc_front_b64, 'front')
        score += s
        flags.extend(f)

    if not doc_back_b64:
        flags.append('missing_doc_back')
        score += 15
    else:
        s, f = _check_document(doc_back_b64, 'back')
        score += s
        flags.extend(f)

    # 2. Video / liveness checks
    if not video_b64:
        flags.append('missing_liveness_video')
        score += 20
    else:
        s, f = _check_video(video_b64, video_duration_s)
        score += s
        flags.extend(f)

    # 3. Cross-checks
    s, f = _cross_check(doc_front_b64, video_b64, declared_name)
    score += s
    flags.extend(f)

    score = min(score, 100.0)

    if score < 30:
        recommendation = 'approve'
    elif score < 65:
        recommendation = 'manual_review'
    else:
        recommendation = 'reject'

    return {
        'fraud_score': round(score, 1),
        'flags': flags,
        'recommendation': recommendation,
    }


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _b64_bytes(b64: str) -> bytes:
    """Decode base64, stripping data-URL prefix if present."""
    if ',' in b64:
        b64 = b64.split(',', 1)[1]
    # Add padding
    b64 += '=' * (-len(b64) % 4)
    return base64.b64decode(b64)


def _check_document(b64: str, side: str) -> tuple[float, List[str]]:
    """
    Analyse a document image.
    Returns (score_penalty, flags).
    """
    flags: List[str] = []
    penalty = 0.0

    try:
        data = _b64_bytes(b64)
    except Exception:
        return 20.0, [f'doc_{side}_decode_error']

    size_kb = len(data) / 1024

    # Too small — probably a placeholder / screenshot thumbnail
    if size_kb < 10:
        flags.append(f'doc_{side}_suspiciously_small')
        penalty += 15

    # Too large — could be a padded/manipulated file
    if size_kb > 8_000:
        flags.append(f'doc_{side}_suspiciously_large')
        penalty += 5

    # Check magic bytes
    if not (data[:2] == b'\xff\xd8' or data[:4] == b'\x89PNG' or data[:4] == b'RIFF'):
        flags.append(f'doc_{side}_invalid_format')
        penalty += 20

    # Entropy check — very low entropy → likely a solid-colour fake
    entropy = _byte_entropy(data[:4096])
    if entropy < 2.5:
        flags.append(f'doc_{side}_low_entropy')
        penalty += 20

    return penalty, flags


def _check_video(b64: str, duration_s: Optional[float]) -> tuple[float, List[str]]:
    """
    Analyse a liveness video.
    Returns (score_penalty, flags).
    """
    flags: List[str] = []
    penalty = 0.0

    try:
        data = _b64_bytes(b64)
    except Exception:
        return 20.0, ['video_decode_error']

    size_kb = len(data) / 1024

    # Too short a video (< 2 s)
    if duration_s is not None and duration_s < 2:
        flags.append('video_too_short')
        penalty += 15

    # Very large gap between declared duration and file size
    # ~100 KB/s is a rough lower bound for a real webcam recording
    if duration_s and duration_s > 0:
        expected_min_kb = duration_s * 50  # very lenient
        if size_kb < expected_min_kb:
            flags.append('video_size_duration_mismatch')
            penalty += 10

    # Check common video magic bytes (MP4 / MOV / WEBM)
    is_mp4 = b'ftyp' in data[:12]
    is_webm = data[:4] == b'\x1a\x45\xdf\xa3'
    is_mov = data[4:8] == b'moov' or data[4:8] == b'wide'
    if not (is_mp4 or is_webm or is_mov):
        flags.append('video_invalid_format')
        penalty += 15

    # Entropy check
    entropy = _byte_entropy(data[:4096])
    if entropy < 3.0:
        flags.append('video_low_entropy')
        penalty += 15

    return penalty, flags


def _cross_check(
    doc_front_b64: Optional[str],
    video_b64: Optional[str],
    declared_name: Optional[str],
) -> tuple[float, List[str]]:
    """
    Cross-validate document + video consistency.
    Returns (score_penalty, flags).
    In production: face-match API call here.
    """
    flags: List[str] = []
    penalty = 0.0

    if not doc_front_b64 or not video_b64:
        return 0.0, []

    # Heuristic: compare entropy fingerprints of first 512 bytes of each
    # as a rough proxy for "are these from completely different sources"
    try:
        doc_data = _b64_bytes(doc_front_b64)
        vid_data = _b64_bytes(video_b64)
        doc_fp = hashlib.sha256(doc_data[:512]).hexdigest()
        vid_fp = hashlib.sha256(vid_data[:512]).hexdigest()
        # If the first 512 bytes are identical → same file submitted twice
        if doc_fp == vid_fp:
            flags.append('doc_and_video_identical_source')
            penalty += 30
    except Exception:
        pass

    # Name validation: if declared name looks like a placeholder
    if declared_name:
        name = declared_name.strip().lower()
        suspicious_names = {'test', 'user', 'admin', 'demo', 'fake', 'john doe', 'jane doe'}
        if name in suspicious_names or len(name) < 3:
            flags.append('suspicious_declared_name')
            penalty += 10
        # No vowels at all — keyboard mash
        if not re.search(r'[aeiouαεηιουω]', name):
            flags.append('name_has_no_vowels')
            penalty += 5

    return penalty, flags


def _byte_entropy(data: bytes) -> float:
    """Shannon entropy of a byte sequence."""
    if not data:
        return 0.0
    freq: Dict[int, int] = {}
    for b in data:
        freq[b] = freq.get(b, 0) + 1
    n = len(data)
    return -sum((c / n) * math.log2(c / n) for c in freq.values())
