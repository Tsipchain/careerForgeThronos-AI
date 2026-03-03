"""
Heuristic fraud / identity-verification scoring.

PURPOSE
-------
This module is a HINT GENERATOR for managers/agents — NOT an automatic
decision maker.  It assigns a suspicion score and raises flags that help
a human reviewer prioritise their workload.

The pipeline in verify_session.py always routes to `manager_review`
(or an agent video call).  Auto-rejection only happens for extreme cases
where the submission is obviously broken (e.g. a file that cannot be
decoded at all).

Score meaning
-------------
  0–25   : Low risk — documents look technically clean
  26–55  : Medium risk — some signals worth checking manually
  56–100 : High risk — multiple red flags, review carefully

Recommendation is informational:
  'low_risk'    → likely clean, quick review
  'medium_risk' → standard review
  'high_risk'   → careful review / request more docs
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
    Run all heuristic checks and return a fraud hint report.

    Never auto-rejects.  Returns recommendation for human reviewer.
    """
    flags: List[str] = []
    score = 0.0

    # 1. Front document (required)
    if not doc_front_b64:
        flags.append('missing_doc_front')
        score += 30          # High signal — no document at all
    else:
        s, f = _check_document(doc_front_b64, 'front')
        score += s
        flags.extend(f)

    # 2. Back document (optional — passports only have one side)
    if doc_back_b64:
        s, f = _check_document(doc_back_b64, 'back')
        score += s
        flags.extend(f)
    # No penalty for missing back — it is optional

    # 3. Video (optional — collected separately via video call if not provided)
    if video_b64:
        s, f = _check_video(video_b64, video_duration_s)
        score += s
        flags.extend(f)
    # No penalty for missing video — video call handles this

    # 4. Cross-checks (only when both are present)
    s, f = _cross_check(doc_front_b64, video_b64, declared_name)
    score += s
    flags.extend(f)

    score = min(score, 100.0)

    if score < 26:
        recommendation = 'low_risk'
    elif score < 56:
        recommendation = 'medium_risk'
    else:
        recommendation = 'high_risk'

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
    b64 += '=' * (-len(b64) % 4)
    return base64.b64decode(b64)


def _check_document(b64: str, side: str) -> tuple[float, List[str]]:
    """
    Analyse a document image.  Lenient thresholds — documents vary wildly.
    Returns (score_penalty, flags).
    """
    flags: List[str] = []
    penalty = 0.0

    try:
        data = _b64_bytes(b64)
    except Exception:
        # Decode error is a genuine red flag
        return 25.0, [f'doc_{side}_decode_error']

    size_kb = len(data) / 1024

    # Under 1 KB is almost certainly not a photo of an ID
    if size_kb < 1:
        flags.append(f'doc_{side}_too_small')
        penalty += 20
    elif size_kb < 5:
        # Small but possible (heavily compressed thumbnail) — soft flag only
        flags.append(f'doc_{side}_small_image')
        penalty += 5

    # Over 15 MB — unusual, mild flag
    if size_kb > 15_000:
        flags.append(f'doc_{side}_unusually_large')
        penalty += 5

    # Check magic bytes: JPEG, PNG, WEBP, or BMP are all acceptable
    is_jpeg = data[:2] == b'\xff\xd8'
    is_png  = data[:4] == b'\x89PNG'
    is_webp = data[:4] == b'RIFF' and len(data) > 12 and data[8:12] == b'WEBP'
    is_bmp  = data[:2] == b'BM'
    if not (is_jpeg or is_png or is_webp or is_bmp):
        flags.append(f'doc_{side}_unrecognised_format')
        penalty += 15

    # Entropy check — threshold lowered; scanned docs on white bg have low entropy
    entropy = _byte_entropy(data[:8192])
    if entropy < 1.0:
        # Essentially a blank/solid image — very suspicious
        flags.append(f'doc_{side}_blank_image')
        penalty += 20
    # No penalty for moderate low entropy (1–3) — real documents can score here

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
        return 15.0, ['video_decode_error']

    size_kb = len(data) / 1024

    # Under 1 s is unusable for liveness
    if duration_s is not None and duration_s < 1:
        flags.append('video_too_short')
        penalty += 15

    # Check common video magic bytes (MP4 / MOV / WEBM)
    is_mp4  = len(data) > 12 and b'ftyp' in data[:12]
    is_webm = data[:4] == b'\x1a\x45\xdf\xa3'
    is_mov  = len(data) > 8 and data[4:8] in (b'moov', b'wide', b'free')
    is_3gp  = len(data) > 12 and b'3gp' in data[8:12]
    if not (is_mp4 or is_webm or is_mov or is_3gp):
        flags.append('video_unrecognised_format')
        penalty += 10

    # Entropy under 2 for a video is suspicious (would need a very unusual file)
    entropy = _byte_entropy(data[:8192])
    if entropy < 2.0:
        flags.append('video_low_entropy')
        penalty += 10

    return penalty, flags


def _cross_check(
    doc_front_b64: Optional[str],
    video_b64: Optional[str],
    declared_name: Optional[str],
) -> tuple[float, List[str]]:
    """
    Cross-validate submission consistency.
    Returns (score_penalty, flags).
    """
    flags: List[str] = []
    penalty = 0.0

    # Check for exact duplicate file submitted as both doc and video
    if doc_front_b64 and video_b64:
        try:
            doc_data = _b64_bytes(doc_front_b64)
            vid_data = _b64_bytes(video_b64)
            if hashlib.sha256(doc_data[:512]).hexdigest() == hashlib.sha256(vid_data[:512]).hexdigest():
                flags.append('doc_and_video_identical_file')
                penalty += 25
        except Exception:
            pass

    # Name sanity check
    if declared_name:
        name = declared_name.strip().lower()
        spam_names = {'test', 'user', 'admin', 'demo', 'fake', 'john doe', 'jane doe', 'asdf', 'qwerty'}
        if name in spam_names:
            flags.append('suspicious_placeholder_name')
            penalty += 15
        elif len(name) < 2:
            flags.append('name_too_short')
            penalty += 10
        elif not re.search(r'[aeiouαεηιουω]', name):
            # No vowels anywhere — likely keyboard mash
            flags.append('name_no_vowels')
            penalty += 8

    return penalty, flags


def _byte_entropy(data: bytes) -> float:
    """Shannon entropy of a byte sequence (0–8 bits per byte)."""
    if not data:
        return 0.0
    freq: Dict[int, int] = {}
    for b in data:
        freq[b] = freq.get(b, 0) + 1
    n = len(data)
    return -sum((c / n) * math.log2(c / n) for c in freq.values())
