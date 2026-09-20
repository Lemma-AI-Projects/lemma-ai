"""PayPal sandbox smoke: fetch a token and create a real sandbox order.

Read-only with respect to our database — it only exercises the PayPal REST API
with the configured credentials, so it answers "are the sandbox keys live?".
Run from backend/:  .venv/Scripts/python.exe scripts/smoke_paypal_order.py
"""

import asyncio
import sys

sys.path.insert(0, ".")

from core.config import settings  # noqa: E402
from services.payments.paypal_client import PayPalClient, PayPalError  # noqa: E402
from services.payments.pricing import get_pack  # noqa: E402


async def main() -> int:
    print(f"mode          : {settings.paypal_mode}")
    print(f"api base      : {settings.paypal_api_base}")
    print(f"client id set : {bool(settings.paypal_client_id)}")
    print(f"secret set    : {bool(settings.paypal_client_secret)}")
    print(f"webhook id set: {bool(settings.paypal_webhook_id)}")
    print(f"paypal_ready  : {settings.paypal_ready}")

    if not settings.paypal_ready:
        print("FAIL: sandbox client id/secret missing")
        return 1

    client = PayPalClient()
    pack = get_pack("starter")
    assert pack is not None

    try:
        token = await client._get_token()
        print(f"token         : OK (len {len(token)})")
    except PayPalError as exc:
        print(f"FAIL: token -> {exc}")
        return 1

    try:
        result = await client.create_order(pack, custom_id="smoke:starter")
    except PayPalError as exc:
        print(f"FAIL: create_order -> {exc}")
        return 1

    print(f"order id      : {result.order_id}")
    print(f"order status  : {result.status}")
    print(f"approval url  : {result.approval_url}")
    print("OK: sandbox credentials are live and can create orders")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
