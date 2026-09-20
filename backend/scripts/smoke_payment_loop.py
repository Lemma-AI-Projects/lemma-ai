"""Exercise the payment → credits loop against the real schema, then roll back.

Proves the two properties that matter for the simplest closed loop:
  1. a COMPLETED capture grants the pack's credits exactly once;
  2. a replay (duplicate capture / duplicate webhook) grants nothing more.

Nothing is persisted: the whole thing runs in one transaction that is rolled
back at the end, so it is safe to run against the shared database.

Run from backend/:  .venv/Scripts/python.exe scripts/smoke_payment_loop.py
"""

import asyncio
import sys
import uuid

sys.path.insert(0, ".")

from sqlalchemy import func, select  # noqa: E402

from core.database import AsyncSessionLocal  # noqa: E402
from models.payment import CreditLedger, Payment  # noqa: E402
from models.profile import Profile  # noqa: E402
from services.credits.ledger import get_balance  # noqa: E402
from services.payments.fulfillment import finalize_payment  # noqa: E402
from services.payments.pricing import get_pack  # noqa: E402


async def main() -> int:
    pack = get_pack("starter")
    assert pack is not None
    failures: list[str] = []

    async with AsyncSessionLocal() as db:
        user_id = await db.scalar(select(Profile.id).limit(1))
        if user_id is None:
            print("SKIP: no profile row to test against")
            return 1

        balance_before = await get_balance(db, user_id)
        order_id = f"SMOKE-{uuid.uuid4()}"
        db.add(
            Payment(
                user_id=user_id,
                pack_id=pack.id,
                credits=pack.credits,
                amount_usd=pack.price_usd,
                currency="USD",
                provider="paypal",
                provider_order_id=order_id,
                status="created",
            )
        )
        await db.flush()

        # 1. first capture (COMPLETED) grants once
        granted, credits = await finalize_payment(
            db, "paypal", order_id, status="COMPLETED"
        )
        await db.flush()
        balance_mid = await get_balance(db, user_id)
        print(f"granted={granted} credits={credits} balance {balance_before} -> {balance_mid}")
        if not granted or credits != pack.credits:
            failures.append("first capture did not grant the pack credits")
        if balance_mid != balance_before + pack.credits:
            failures.append("balance did not increase by the pack credits")

        # 2. replay: same order captured again -> no-op
        granted2, credits2 = await finalize_payment(
            db, "paypal", order_id, status="COMPLETED"
        )
        await db.flush()
        balance_after = await get_balance(db, user_id)
        print(f"replay granted={granted2} credits={credits2} balance={balance_after}")
        if granted2:
            failures.append("replay granted credits a second time")
        if balance_after != balance_mid:
            failures.append("replay changed the balance")

        # 3. ledger recorded exactly one purchase entry for this payment
        pay_id = await db.scalar(
            select(Payment.id).where(Payment.provider_order_id == order_id)
        )
        entries = await db.scalar(
            select(func.count())
            .select_from(CreditLedger)
            .where(CreditLedger.reason == f"purchase:{pay_id}")
        )
        print(f"ledger entries for this payment: {entries}")
        if entries != 1:
            failures.append(f"expected 1 ledger entry, got {entries}")

        # 4. unknown order is a no-op, not a crash
        granted3, _ = await finalize_payment(
            db, "paypal", "SMOKE-nonexistent", status="COMPLETED"
        )
        if granted3:
            failures.append("unknown order granted credits")

        await db.rollback()
        print("rolled back — no data persisted")

    if failures:
        for item in failures:
            print(f"FAIL: {item}")
        return 1
    print("OK: credits granted exactly once, replays are no-ops")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
