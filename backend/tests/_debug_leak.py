"""Debug: isolate the connection leak in interrupted stream_turn."""

import asyncio
import gc
import sys
import traceback
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select

from ai import init_ai_runtime, shutdown_ai_runtime
from core.aio import drain_protected_writes
from core.database import AsyncSessionLocal, engine
from core.security import CurrentUser
from models.profile import Profile
from schemas.ai import ChatMessageIn, ChatRequest
from services.chat_service import prepare_turn, stream_turn

from anyio._backends._asyncio import CancelScope as _AnyioCancelScope

_orig_cancel = _AnyioCancelScope.cancel


def _patched_cancel(self, reason=None):
    print(f"[CANCEL] scope={id(self):x} called by {asyncio.current_task()}")
    traceback.print_stack()
    return _orig_cancel(self, reason)


_AnyioCancelScope.cancel = _patched_cancel


async def pool_stats(label: str) -> None:
    pool = engine.pool
    athrow = [t for t in asyncio.all_tasks() if "athrow" in (t.get_name() or "")]
    print(
        f"[{label}] checked_out={pool.checkedout()} size={pool.size()} "
        f"overflow={pool.overflow()} athrow_tasks={len(athrow)}"
    )
    for t in athrow:
        print(f"    athrow task: {t}")


async def main() -> int:
    init_ai_runtime()
    try:
        async with AsyncSessionLocal() as s:
            profile = (await s.execute(select(Profile).limit(1))).scalar_one()
        user = CurrentUser(id=profile.id, email=profile.email)

        await pool_stats("start")

        # full turn (baseline)
        async with AsyncSessionLocal() as db:
            ctx = await prepare_turn(
                db,
                ChatRequest(messages=[ChatMessageIn(role="user", content="你好，一句话介绍自己")]),
                user,
            )
        async for chunk in stream_turn(ctx):
            pass
        await drain_protected_writes()
        await asyncio.sleep(0.2)
        await pool_stats("after full turn")

        # interrupted turn
        async with AsyncSessionLocal() as db:
            ctx2 = await prepare_turn(
                db,
                ChatRequest(messages=[ChatMessageIn(role="user", content="用十句话讲讲微积分历史")]),
                user,
            )
        gen = stream_turn(ctx2)
        deltas = 0
        async for chunk in gen:
            if chunk.kind == "delta" and chunk.text:
                deltas += 1
                if deltas >= 2:
                    break
        print("  -> break done, about to aclose")
        await gen.aclose()
        print("  -> aclose done")
        # inspect the inner stream object to find the event iterator path
        import inspect
        from services import chat_service
        src = inspect.getsource(chat_service.stream_turn)
        print("  -> stream_turn uses chunk_stream = ai_client.stream_chat(...)")
        await asyncio.sleep(0.5)
        await pool_stats("after interrupted turn + 0.5s")

        gc.collect()
        await asyncio.sleep(0.5)
        await drain_protected_writes()
        await pool_stats("after gc + drain")

        # try a query
        async with AsyncSessionLocal() as s:
            rows = await s.execute(select(Profile).limit(1))
            print(f"  -> query ok: {rows.scalars().first() is not None}")
        await pool_stats("after query")
    finally:
        await shutdown_ai_runtime()
        await engine.dispose()

    print("DONE")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
