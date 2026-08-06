"""PayPal payments service package.

Layout (mirrors the AI client facade pattern — framework-agnostic core wrapped
by thin API routers):

- pricing.py        server-authoritative credit packs (never trust client price)
- paypal_client.py  httpx facade over PayPal REST (OAuth2 + Orders v2)
- fulfillment.py    idempotent credit granting + capture finalization
"""
