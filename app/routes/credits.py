import os
from flask import Blueprint, jsonify, request
import stripe

from ..utils.auth import require_auth
from ..db.store import upsert_user, get_balance

bp = Blueprint('credits', __name__, url_prefix='/v1/credits')


def _stripe():
    stripe.api_key = os.getenv('STRIPE_SECRET_KEY', '')
    if not stripe.api_key:
        raise RuntimeError('STRIPE_SECRET_KEY not set')
    return stripe


@bp.get('/balance')
@require_auth(['careerforge:read'])
def balance():
    u = request.thronos_user
    upsert_user(u['sub'], u.get('email'), u.get('tenant_id'), u.get('verifyid_verified', False))
    return jsonify({'balance': get_balance(u['sub'])})


@bp.post('/checkout-session')
@require_auth(['careerforge:write'])
def checkout_session():
    body = request.get_json(force=True) or {}
    pack = body.get('pack', 'pack_30')

    price_map = {
        'pack_30': os.getenv('STRIPE_PRICE_PACK_30', ''),
        'pack_100': os.getenv('STRIPE_PRICE_PACK_100', ''),
        'pack_300': os.getenv('STRIPE_PRICE_PACK_300', ''),
        'sub_starter': os.getenv('STRIPE_PRICE_SUB_STARTER', ''),
        'sub_pro': os.getenv('STRIPE_PRICE_SUB_PRO', ''),
    }
    price_id = price_map.get(pack, '')
    if not price_id:
        return jsonify({'error': 'unknown_pack_or_missing_price_id', 'pack': pack}), 400

    u = request.thronos_user
    upsert_user(u['sub'], u.get('email'), u.get('tenant_id'), u.get('verifyid_verified', False))

    mode = 'subscription' if pack.startswith('sub_') else 'payment'

    s = _stripe().checkout.Session.create(
        mode=mode,
        line_items=[{'price': price_id, 'quantity': 1}],
        success_url=os.getenv('STRIPE_SUCCESS_URL', '') + '?session_id={CHECKOUT_SESSION_ID}',
        cancel_url=os.getenv('STRIPE_CANCEL_URL', ''),
        client_reference_id=u['sub'],
        metadata={'sub': u['sub'], 'pack': pack},
        allow_promotion_codes=True,
    )

    return jsonify({'checkout_url': s.url, 'session_id': s.id})
