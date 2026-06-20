"""organizing 窗口实时 SSE 的 Redis pub/sub 中继（方案二）。

进程边界：compose 在 Celery worker（course.organize）里跑，面向浏览器的 SSE 在 API
进程。worker 把事件 publish 到 `course:organize:{course_id}`，API 的 /organize/stream
subscribe 并转成 SSE 帧。事件 = JSON 信封 `{"event": name, "data": {...}}`；SSE 编码在
本模块（to_sse）统一。

事件词汇（决策②）：searching（搜索未完心跳，API 侧自发）/ search（真实搜索结果）/
reasoning（compose 思考增量，复用 chat 的 {"text"} 形状）/ done（携 CourseDetailOut
快照）/ error（{"code","message"}，复用 chat 形状）。

频道无历史重放（pub/sub）：迟到/重连订阅者由 API 侧「先查 DB 终态」兜底（见端点），
本模块不做 Stream/重放。Redis 抖动不致命：发布失败只记日志（compose 在 Celery 照跑照
落库），订阅失败由端点降级为 DB 快照流。
"""

import json
import logging
import uuid
from collections.abc import AsyncIterator
from typing import Any

import redis.asyncio as aioredis

from ai.coursegen.ranking import rank
from ai.search import VideoCandidate
from core.config import settings

logger = logging.getLogger("lemma.services.course_organize_events")

# After one of these the worker stops publishing and subscribers close.
TERMINAL_EVENTS = frozenset({"done", "error"})

# Real search hits shown while composing (决策②: 命中数 + top-K 真实标题/作者/播放量).
_SEARCH_TOP_K = 8


def channel_for(course_id: uuid.UUID) -> str:
    return f"course:organize:{course_id}"


def to_sse(event: str, data: dict[str, Any]) -> str:
    """Lemma SSE frame (same shape as ai/streaming._encode)."""
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


def build_search_payload(candidates: list[VideoCandidate]) -> dict[str, Any]:
    """The `search` event body: per-platform hit counts + top-K real videos.

    Shared by the worker (publishes it) and the API degrade path (reads the pool
    directly). camelCase for the wire; ranking reuses ai.coursegen.ranking.
    """
    counts: dict[str, int] = {}
    for candidate in candidates:
        platform = candidate.platform.value
        counts[platform] = counts.get(platform, 0) + 1
    top = rank(candidates)[:_SEARCH_TOP_K]
    return {
        "platforms": [
            {"platform": platform, "count": count}
            for platform, count in counts.items()
        ],
        "items": [
            {
                "platform": candidate.platform.value,
                "title": candidate.title,
                "author": candidate.author,
                "viewCount": candidate.view_count,
            }
            for candidate in top
        ],
    }


class OrganizeEventPublisher:
    """Worker-side publisher: one per organize task, closed in `finally`.

    Publishing NEVER raises — a Redis hiccup must not break compose/persist; it
    is logged and swallowed (the course still completes; the browser just loses
    live reasoning and falls back to the DB snapshot stream).
    """

    def __init__(self, course_id: uuid.UUID) -> None:
        self._channel = channel_for(course_id)
        self._redis = aioredis.from_url(settings.redis_url)

    async def _publish(self, event: str, data: dict[str, Any]) -> None:
        try:
            await self._redis.publish(
                self._channel,
                json.dumps({"event": event, "data": data}, ensure_ascii=False),
            )
        except Exception:  # noqa: BLE001 — pub/sub is best-effort, never fatal
            logger.warning("publish %r failed on %s", event, self._channel)

    async def search(self, payload: dict[str, Any]) -> None:
        await self._publish("search", payload)

    async def reasoning(self, text: str) -> None:
        await self._publish("reasoning", {"text": text})

    async def done(self) -> None:
        # Terminal success SIGNAL only — the API builds the CourseDetailOut
        # snapshot for the SSE `done` frame from its authenticated context
        # (single snapshot path also covers reconnect / DB watchdog).
        await self._publish("done", {})

    async def error(self, code: str, message: str) -> None:
        await self._publish("error", {"code": code, "message": message})

    async def aclose(self) -> None:
        try:
            await self._redis.aclose()
        except Exception:  # noqa: BLE001 — cleanup must not raise
            logger.warning("closing organize publisher failed for %s", self._channel)


async def subscribe(
    course_id: uuid.UUID, *, poll_timeout: float = 1.0
) -> AsyncIterator[dict[str, Any] | None]:
    """API-side: yield `{"event","data"}` envelopes; yield None on each idle
    `poll_timeout` tick (the endpoint uses idle ticks for the `searching`
    heartbeat + the DB watchdog).

    Raises (RedisError/OSError) if Redis is unreachable so the endpoint can fall
    back to the DB snapshot stream (决策⑦). The subscription is always torn down
    in `finally` (no leaked connection) — including on client disconnect (the
    consuming generator is closed, which propagates here).
    """
    channel = channel_for(course_id)
    client = aioredis.from_url(settings.redis_url)
    pubsub = client.pubsub()
    await pubsub.subscribe(channel)
    try:
        while True:
            message = await pubsub.get_message(
                ignore_subscribe_messages=True, timeout=poll_timeout
            )
            if message is None:
                yield None  # idle tick
                continue
            if message.get("type") != "message":
                continue
            raw = message.get("data")
            try:
                envelope = json.loads(raw)
            except (TypeError, ValueError):
                continue
            if isinstance(envelope, dict) and "event" in envelope:
                yield envelope
    finally:
        try:
            await pubsub.aclose()
            await client.aclose()
        except Exception:  # noqa: BLE001 — cleanup must not raise
            logger.warning("closing organize subscription failed for %s", channel)
