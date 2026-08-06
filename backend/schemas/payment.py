"""Pydantic schemas for the payments API.

Field names are serialized to camelCase (via the alias generator) to match the
frontend's TypeScript types in src/features/payments/types.ts.
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
    currency: str


class BalanceResponse(_CamelModel):
    credits: int


class CreateOrderRequest(_CamelModel):
    """Frontend sends the pack id; the server recomputes price from its own
    pricing table and ignores `amount`/`currency` (anti-tamper)."""

    pack_id: str
    amount: float = 0.0
    currency: str = "USD"


class CreateOrderResponse(_CamelModel):
    order_id: str


class CaptureOrderRequest(_CamelModel):
    order_id: str


class CaptureOrderResponse(_CamelModel):
    order_id: str
    status: str
    credits_granted: int | None = None
