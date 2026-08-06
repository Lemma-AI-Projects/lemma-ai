"""Server-authoritative credit pack pricing.

The frontend's `plans.ts` is display-only. All money and credit amounts are
recomputed here from the pack id so a tampered client request can never change
what the user is charged or how many credits they receive. Keep this in sync with
the pricing the business finalizes; the frontend copy is cosmetic.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class CreditPack:
    id: str
    name: str
    credits: int
    price_usd: float


# Initial (dev) pricing — to be replaced with the business-finalized table.
CREDIT_PACKS: list[CreditPack] = [
    CreditPack("starter", "Starter", 500, 4.99),
    CreditPack("pro", "Pro", 1200, 9.99),
    CreditPack("max", "Max", 4000, 29.99),
]

PACK_BY_ID: dict[str, CreditPack] = {p.id: p for p in CREDIT_PACKS}

# Single source of truth for available packs; lets the API reject unknown ids.
AVAILABLE_PACK_IDS = frozenset(PACK_BY_ID)


def get_pack(pack_id: str) -> CreditPack | None:
    return PACK_BY_ID.get(pack_id)
