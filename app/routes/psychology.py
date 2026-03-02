"""
Anti-Bot Psychology / Onboarding Test
========================================
POST /v1/onboarding/test/submit   — submit answers, receive score + pass/fail
GET  /v1/onboarding/test/status   — check if current user has passed the test

The test is designed to detect bots, bulk-account creators, and low-quality
sign-ups through a combination of:
  1. Time-based checks (too fast → bot)
  2. Pattern-based answer analysis (all same answers → bot)
  3. Logical consistency (contradictory answers → inconsistent user)

Score 0–100.  Pass threshold: ≥ 60.
"""
import uuid
import time
from flask import Blueprint, jsonify, request

from ..utils.auth import require_auth
from ..db.store import upsert_user, save_psychology_test, get_psychology_test

bp = Blueprint('psychology', __name__, url_prefix='/v1/onboarding')


# ---------------------------------------------------------------------------
# Questions (sent to client on GET /v1/onboarding/test/questions)
# ---------------------------------------------------------------------------

QUESTIONS = [
    {
        'id': 'q1',
        'text': 'What are you primarily looking for on CareerForge?',
        'options': [
            {'value': 'a', 'label': 'A new job or career opportunity'},
            {'value': 'b', 'label': 'To improve my CV or portfolio'},
            {'value': 'c', 'label': 'Career guidance and interview practice'},
            {'value': 'd', 'label': 'I am exploring what the platform offers'},
        ],
    },
    {
        'id': 'q2',
        'text': 'How many years of professional experience do you have?',
        'options': [
            {'value': 'a', 'label': 'None — I am a student or recent graduate'},
            {'value': 'b', 'label': '1–3 years'},
            {'value': 'c', 'label': '4–10 years'},
            {'value': 'd', 'label': 'More than 10 years'},
        ],
    },
    {
        'id': 'q3',
        'text': 'If you received two job offers simultaneously, you would:',
        'options': [
            {'value': 'a', 'label': 'Compare compensation, growth potential, and culture'},
            {'value': 'b', 'label': 'Accept the higher salary immediately'},
            {'value': 'c', 'label': 'Decline both and keep searching'},
            {'value': 'd', 'label': 'Ask for more time to decide'},
        ],
    },
    {
        'id': 'q4',
        'text': 'Which skill would you like to improve most?',
        'options': [
            {'value': 'a', 'label': 'Technical / programming skills'},
            {'value': 'b', 'label': 'Communication and soft skills'},
            {'value': 'c', 'label': 'Leadership and management'},
            {'value': 'd', 'label': 'Domain-specific expertise'},
        ],
    },
    {
        'id': 'q5',
        'text': 'How do you prefer to work?',
        'options': [
            {'value': 'a', 'label': 'Fully remote'},
            {'value': 'b', 'label': 'Hybrid (mix of office and home)'},
            {'value': 'c', 'label': 'On-site / in an office'},
            {'value': 'd', 'label': 'No preference — the role matters more'},
        ],
    },
]

# Minimum time (ms) a human needs to read & answer all questions
_MIN_DURATION_MS = 5_000   # 5 seconds
_PASS_THRESHOLD = 60


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@bp.get('/test/questions')
@require_auth(['careerforge:read'])
def get_questions():
    """Return the list of onboarding questions (no answers in payload)."""
    return jsonify({'questions': QUESTIONS, 'pass_threshold': _PASS_THRESHOLD}), 200


@bp.post('/test/submit')
@require_auth(['careerforge:write'])
def submit_test():
    """
    Submit answers and receive a score.

    Body:
      answers: [{ "question_id": str, "value": str }]
      duration_ms: int   (time the user spent on the form, client-measured)
    """
    u = request.thronos_user
    upsert_user(u['sub'], u.get('email'), u.get('tenant_id'), u.get('verifyid_verified', False))

    body = request.get_json(force=True) or {}
    answers = body.get('answers', [])
    duration_ms = int(body.get('duration_ms', 0))

    if not isinstance(answers, list) or len(answers) == 0:
        return jsonify({'error': {'code': 'invalid_request', 'message': 'answers array required'}}), 400

    score, flags = _score_answers(answers, duration_ms)
    passed = score >= _PASS_THRESHOLD
    test_id = uuid.uuid4().hex

    save_psychology_test(
        test_id=test_id,
        sub=u['sub'],
        answers=answers,
        score=score,
        flags=flags,
        passed=passed,
        duration_ms=duration_ms,
    )

    return jsonify({
        'test_id': test_id,
        'score': score,
        'passed': passed,
        'flags': flags if not passed else [],
        'message': (
            'Welcome to CareerForge! Your account is now fully active.'
            if passed
            else 'Please try again or contact support if you believe this is a mistake.'
        ),
    }), 200


@bp.get('/test/status')
@require_auth(['careerforge:read'])
def test_status():
    """Return the most recent test result for the authenticated user."""
    u = request.thronos_user
    result = get_psychology_test(u['sub'])
    if not result:
        return jsonify({'passed': False, 'score': None, 'message': 'No test completed yet'}), 200
    return jsonify(result), 200


# ---------------------------------------------------------------------------
# Scoring logic
# ---------------------------------------------------------------------------

def _score_answers(answers: list, duration_ms: int) -> tuple[int, list]:
    """
    Returns (score 0–100, flags [str]).
    """
    flags = []
    score = 100  # start full, deduct for suspicious signals

    valid_question_ids = {q['id'] for q in QUESTIONS}
    seen_ids = set()
    values = []

    for ans in answers:
        qid = str(ans.get('question_id', ans.get('id', '')))
        val = str(ans.get('value', ans.get('answer', '')))

        if qid not in valid_question_ids:
            continue
        if qid in seen_ids:
            # Duplicate answer for same question → suspicious
            flags.append('duplicate_question_answer')
            score -= 10
            continue
        seen_ids.add(qid)
        values.append(val)

    # Check: too few answers answered
    if len(seen_ids) < 3:
        flags.append('too_few_answers')
        score -= 30

    # Check: too fast (bot submitting instantly)
    if duration_ms < _MIN_DURATION_MS:
        flags.append('completed_too_fast')
        score -= 35

    # Check: all same value → likely bot clicking first option repeatedly
    if len(set(values)) == 1 and len(values) >= 3:
        flags.append('all_identical_answers')
        score -= 25

    # Check: only 'a' selected (first option every time) — common bot pattern
    if all(v == 'a' for v in values) and len(values) >= 4:
        flags.append('all_first_option')
        score -= 15

    score = max(0, min(score, 100))
    return score, flags
