"""Stripe card channel (server-authoritative checkout).

Stripe Checkout is used (hosted page): card data never touches our servers, so
no PCI scope. Flow:

- create_checkout_session(pack, custom_id) -> (session_id, checkout_url)
  The frontend redirects the user to checkout_url. `custom_id` carries
  "{user_id}:{pack_id}" so fulfillment knows who/what to credit.
- Completion arrives via the /webhooks/stripe endpoint
  (checkout.session.completed, payment_status=paid), which calls
  fulfillment.finalize_payment(provider='stripe', ...) idempotently.

The `stripe` import is lazy so the app boots even when the SDK isn't installed
and the channel is disabled (stripe_ready=False without a configured key).
"""

from __future__ import annotations

from dataclasses import dataclass

from core.config import settings
from services.payments.pricing import CreditPack


class StripeError(Exception):
    """Wraps stripe SDK errors into our channel exception."""


@dataclass(frozen=True)
class StripeCheckout:
    session_id: str
    url: str


class StripeClient:
    """Thin wrapper around the stripe SDK, bound to this app's settings."""

    def __init__(self) -> None:
        import stripe  # lazy import (channel disabled until a key is set)

        stripe.api_key = settings.stripe_secret_key
        self._stripe = stripe

    def create_checkout_session(
        self, pack: CreditPack, custom_id: str
    ) -> StripeCheckout:
        """Create a one-time payment Checkout Session (server-authoritative)."""
        origin = settings.stripe_checkout_origin.rstrip("/")
        try:
            session = self._stripe.checkout.Session.create(
                mode="payment",
                client_reference_id=custom_id,
                line_items=[
                    {
                        "price_data": {
                            "currency": "usd",
                            "product_data": {"name": f"Lemma {pack.name} credits"},
                            "unit_amount": int(round(pack.price_usd * 100)),
                        },
                        "quantity": 1,
                    }
                ],
                success_url=f"{origin}/gotopay?status=success",
                cancel_url=f"{origin}/gotopay?status=cancel",
                metadata={"pack_id": pack.id},
            )
        except Exception as exc:  # stripe.error.StripeError
            raise StripeError(str(exc)) from exc
        return StripeCheckout(session_id=session.id, url=session.url)
