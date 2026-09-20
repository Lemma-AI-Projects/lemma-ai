"""Pydantic schemas for the payments API.

Field names serialize to camelCase (alias generator) to match the frontend
types in src/features/payments/types.ts.
"""

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class _CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )


class PaymentConfigResponse(_CamelModel):
    """Probes whether the backend can accept payments right now."""

    paypal_ready: bool
    stripe_ready: bool
    currency: str


class BalanceResponse(_CamelModel):
    credits: int


class CreateOrderRequest(_CamelModel):
    """The frontend sends only the pack id: the server recomputes price and
    credits from its own pricing table and ignores the client's amount."""

    pack_id: str
    amount: float = 0.0
    currency: str = "USD"
    provider: str = "paypal"


class CreateOrderResponse(_CamelModel):
    order_id: str
    # Reserved for redirect-based channels (Stripe Checkout). Null for PayPal,
    # which embeds client-side.
    url: str | None = None


class CaptureOrderRequest(_CamelModel):
    order_id: str


class CaptureOrderResponse(_CamelModel):
    order_id: str
    status: str
    credits_granted: int | None = None
