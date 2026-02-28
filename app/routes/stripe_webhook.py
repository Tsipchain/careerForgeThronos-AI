import os
import stripe
from flask import Blueprint, request, jsonify

from ..db.store import add_credits, has_stripe_event, mark_stripe_event

bp = Blueprint('stripe', __name__, url_prefix='/v1/stripe')


def _credits_for_pack(pack: str) -> int:
    # Keep it simple; tune later.
    return {
        'pack_30': 30,
        'pack_100': 100,
        'pack_300': 300,
        'sub_starter': 50,
        'sub_pro': 200,
    }.get(pack, 0)


@bp.post('/webhook')
def webhook():
    secret = os.getenv('STRIPE_WEBHOOK_SECRET', '')
    if not secret:
        return jsonify({'error': 'STRIPE_WEBHOOK_SECRET not set'}), 500

    payload = request.data
    sig_header = request.headers.get('Stripe-Signature', '')

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, secret)
    except Exception as e:
        return jsonify({'error': 'invalid_signature', 'detail': str(e)}), 400

    event_id = event.get('id')
    if event_id and has_stripe_event(event_id):
        return jsonify({'ok': True, 'dedup': True})

    etype = event.get('type')

    # One-time packs: checkout.session.completed
    if etype == 'checkout.session.completed':
        session = event['data']['object']
        sub = (session.get('metadata') or {}).get('sub') or session.get('client_reference_id')
        pack = (session.get('metadata') or {}).get('pack', '')
        credits = _credits_for_pack(pack)
        if sub and credits > 0:
            add_credits(sub, credits, reason='stripe_purchase', ref_type='stripe_session', ref_id=session.get('id'))

    # Subscriptions: invoice.paid (credit monthly)
    if etype == 'invoice.paid':
        inv = event['data']['object']
        sub_ref = (inv.get('metadata') or {}).get('sub')
        pack = (inv.get('metadata') or {}).get('pack', '')
        if not pack:
            # if you want, map subscription price_id -> pack here
            pass
        credits = _credits_for_pack(pack)
        if sub_ref and credits > 0:
            add_credits(sub_ref, credits, reason='stripe_subscription_credit', ref_type='stripe_invoice', ref_id=inv.get('id'))

    if event_id:
        mark_stripe_event(event_id)

    return jsonify({'ok': True})
