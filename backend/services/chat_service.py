"""Chat business logic: conversation state + persistence around AIClient.

Split into two steps because the conversation id must be known BEFORE the
SSE response starts (it travels in the X-Conversation-Id header):

    prepare_turn()  -> create-or-load the conversation, rebuild history
    run_turn()      -> dispatch on the request's tool: plain text or a tool turn

A plain turn (stream_turn) just streams the model. A tool turn (currently only
stream_course_planning_turn) streams a short AI intro, runs the tool's own
service, then attaches a tool card via one `tool` chunk — same conversation
resolution, SSE protocol and persistence as a plain turn, only the body differs.

Persistence rule (拍板 2026-06-11): the user+assistant pair is written once
the first token has been emitted — partial answers from a stop/error are kept
(the user saw them, the tokens are paid for). If the turn fails before any
output, nothing is written and a retry starts clean.
"""

import asyncio
import contextlib
import uuid
from collections.abc import AsyncIterator
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from ai import AIChunk, AIUseCase, ChatMessage, ai_client
from core import aio
from core.database import AsyncSessionLocal
from core.security import CurrentUser
from schemas.ai import ChatRequest
from services import (
    conversation_service,
    conversation_tool_service,
    course_planning_service,
    project_service,
)


@dataclass
class TurnContext:
    conversation_id: uuid.UUID
    user_id: uuid.UUID
    user_content: str
    user_sent_at: datetime
    history: list[ChatMessage]
    # Set for a NEW conversation: the row doesn't exist yet (its id is
    # pre-generated); persist_turn creates it together with the first turn.
    new_conversation_title: str | None = None
    # New conversation born inside a project (ownership already verified).
    new_conversation_project_id: uuid.UUID | None = None
    # C1 persona block for conversations inside a learn space (project):
    # the bound agent's SOUL.md / persona fields, injected into the system
    # prompt so the companion speaks with its own voice. None for unfiled or
    # course conversations.
    agent_persona: str | None = None
    # C1 learner 记忆注入块（L1 S3）：<memory-context>（概念掌握 + 最近卡点）。
    # 仅 learn space 对话 + lemma_hermes 门控开时非 None；其余为 None =>
    # 模板 Memory guidance 不激活，行为与注入前一致。
    learner_memory: str | None = None


# The previous turn's write is async (done doesn't wait for it); a fast
# follow-up message may race it. Total grace ≈ 7 × 250ms — generously above
# the worst observed write latency (~1.2s); forged ids pay ~1.75s before 404.
_LOOKUP_GRACE_ATTEMPTS = 8
_LOOKUP_GRACE_INTERVAL_S = 0.25


def build_agent_persona(project: Any) -> str | None:
    """C1 persona block for a learn space's bound agent.

    The full SOUL.md document is authoritative when present (user-editable
    persona); otherwise we compose a compact block from the individual
    fields so legacy rows still get a voice. Returns None for spaces without
    an agent — the prompt then stays the generic Lemma persona.
    """
    if project.agent_soul_md:
        return project.agent_soul_md.strip()
    parts: list[str] = []
    if project.agent_name:
        parts.append(f"你是这个学习空间的伴学老师，名字叫「{project.agent_name}」。")
    if project.agent_personality:
        parts.append(f"性格：{project.agent_personality}")
    if project.agent_teaching_style:
        parts.append(f"教学风格：{project.agent_teaching_style}")
    if project.agent_welcome:
        parts.append(f"开场白（自然的，不是模板）：{project.agent_welcome}")
    return "\n".join(parts).strip() or None


async def _agent_persona_for_project(
    db: AsyncSession, *, user_id: uuid.UUID, project_id: uuid.UUID | None
) -> str | None:
    """Load the learn space's bound agent persona, if any (C1)."""
    if project_id is None:
        return None
    project = await project_service.get_owned_project(
        db, user_id=user_id, project_id=project_id
    )
    if project is None:
        return None
    return build_agent_persona(project)


# ── L1 S3：learner 记忆注入块（C1）────────────────────────────────────────
_LEARNER_MEMORY_MAX_CHARS = 800

# D2 决策（自然引用）：guidance 只在有记忆时随块输出——模板只留 $learner_memory
# 一个占位，无记忆时整段为空，prompt 与注入前逐字节一致。
_LEARNER_MEMORY_GUIDANCE = (
    "Memory guidance:\n"
    "- You may reference the learner's past knowledge state naturally, like a\n"
    "  real tutor would (\"你上次卡在换元法，这次我们从这里继续\"), without\n"
    "  announcing that you are reading a record.\n"
    "- Never invent states that are not in the block."
)


def build_learner_memory_block(
    user_id: uuid.UUID, topic: str | None = None
) -> str | None:
    """C1 learner 记忆注入（S3，2026-08-15；2026-08-19 收敛到普通对话）。

    触发条件（全满足才注入）：
    - lemma_hermes 门控开（get_learner_service() 非 None）
    - 用户已有 learner 数据（否则两段都为空 => None）
    不再以 project_id 作硬拦：普通对话（无 project_id）同样可注入。
    D3 决策：只注入「概念掌握 + 最近卡点」两层（knowledge_summary +
    memory_context），硬限 800 字符防 prompt 膨胀。
    主题过滤（2026-08-19 收敛）：topic 作为 memory_context 的 query 传入
    prefetch，只注入与当前对话主题匹配的概念，降低跨主题串线；topic 为空
    时 memory_context 退化为近期摘要兜底。
    每 turn 重新生成（不做会话缓存）：S4 工具调用会改 learner 状态，缓存
    会让下一轮看到过期记忆；SQLite 查询毫秒级，turn 级成本可接受。
    fail-open：learner 服务异常 => None（不阻塞对话）。
    """
    from services.learner.learner_service import get_learner_service

    svc = get_learner_service()
    if svc is None:
        return None
    try:
        uid = str(user_id)
        summary = svc.knowledge_summary(uid, limit=8)
        memory = svc.memory_context(uid, query=topic or "", limit=5)
        block = "\n".join(p for p in (summary, memory) if p and p.strip())
        if not block:
            return None
        if len(block) > _LEARNER_MEMORY_MAX_CHARS:
            block = block[:_LEARNER_MEMORY_MAX_CHARS] + "…"
        return (
            f"<memory-context>\n{block}\n</memory-context>\n\n"
            f"{_LEARNER_MEMORY_GUIDANCE}"
        )
    except Exception:  # noqa: BLE001 — fail-open：记忆是增强，不阻塞对话
        return None


async def prepare_turn(
    db: AsyncSession, payload: ChatRequest, user: CurrentUser
) -> TurnContext | None:
    """Resolve the conversation for this turn before streaming starts.

    A new conversation is NOT written here — only its id is generated, so a
    turn that dies before the first token leaves no empty conversation behind.
    Returns None when the requested conversation doesn't belong to the caller
    (the API layer answers 404 — indistinguishable from "doesn't exist").
    """
    content = payload.user_content
    if payload.conversation_id is None:
        if payload.project_id is not None:
            # Same IDOR rule as conversations: foreign/unknown project -> 404.
            project = await project_service.get_owned_project(
                db, user_id=user.id, project_id=payload.project_id
            )
            if project is None:
                return None
        return TurnContext(
            conversation_id=uuid.uuid4(),
            user_id=user.id,
            user_content=content,
            user_sent_at=datetime.now(UTC),
            history=[],
            new_conversation_title=conversation_service.title_from_first_message(
                content
            ),
            new_conversation_project_id=payload.project_id,
            agent_persona=(
                build_agent_persona(project) if payload.project_id is not None else None
            ),
            learner_memory=build_learner_memory_block(
                user.id, topic=content
            ),
        )

    conversation = None
    for attempt in range(_LOOKUP_GRACE_ATTEMPTS):
        conversation = await conversation_service.get_owned_conversation(
            db, user_id=user.id, conversation_id=payload.conversation_id
        )
        if conversation is not None:
            break
        if attempt < _LOOKUP_GRACE_ATTEMPTS - 1:
            await asyncio.sleep(_LOOKUP_GRACE_INTERVAL_S)
    if conversation is None:
        return None
    rows = await conversation_service.load_recent_history(
        db, conversation_id=conversation.id
    )
    return TurnContext(
        conversation_id=conversation.id,
        user_id=user.id,
        user_content=content,
        user_sent_at=datetime.now(UTC),
        history=[ChatMessage(role=row.role, content=row.content_text) for row in rows],
        agent_persona=await _agent_persona_for_project(
            db, user_id=user.id, project_id=conversation.project_id
        ),
        learner_memory=build_learner_memory_block(
            user.id, topic=content
        ),
    )


async def stream_turn(context: TurnContext) -> AsyncIterator[AIChunk]:
    """Run one AI turn (with the global plugin tools bound) and persist the pair.

    Persistence runs on a protected background task (spawn_protected:
    synchronous scheduling, own task, module-held strong reference), never
    awaited on the user's critical path:
    - `done` is yielded immediately; the write lands ~roundtrip later.
      The follow-up-message race is covered by prepare_turn's grace retry.
    - Disconnect mid-stream (browsers cancel with anyio-style repeating
      cancellation, bug 2026-06-12): the finally block schedules the write
      synchronously, so it survives even when every await here insta-raises
      and this generator's frame is torn down.

    A `tool` chunk (a plugin card, e.g. desmos_graph) is captured as the
    turn's tool_ref and lands in ai_messages.tool_json — the same thin-card
    mechanism course_planning uses, so history reload re-renders it in place.
    """
    parts: list[str] = []
    reasoning_parts: list[str] = []
    reasoning_text: str | None = None
    raw_parts: dict[str, Any] | None = None
    tool_ref: dict[str, Any] | None = None
    persist_task: asyncio.Task[Any] | None = None

    def ensure_persist_scheduled() -> asyncio.Task[Any] | None:
        nonlocal persist_task
        assistant_text = "".join(parts)
        assistant_reasoning_text = reasoning_text or "".join(reasoning_parts) or None
        if persist_task is None and assistant_text:
            persist_task = aio.spawn_protected(
                conversation_service.persist_turn(
                    conversation_id=context.conversation_id,
                    user_id=context.user_id,
                    new_conversation_title=context.new_conversation_title,
                    new_conversation_project_id=context.new_conversation_project_id,
                    user_content=context.user_content,
                    user_sent_at=context.user_sent_at,
                    assistant_content=assistant_text,
                    assistant_reasoning_text=assistant_reasoning_text,
                    raw_parts=raw_parts,
                    tool_ref=tool_ref,
                )
            )
        return persist_task

    # New conversation: the row doesn't exist until persist_turn, so plugin
    # tools must not FK-link a graph to it — the message tool_json is the link.
    tools = conversation_tool_service.build_global_tools(
        user_id=context.user_id,
        conversation_id=(
            None if context.new_conversation_title else context.conversation_id
        ),
    )
    chunk_stream = ai_client.stream_chat(
        AIUseCase.TEXT_CHAT,
        [*context.history, ChatMessage(role="user", content=context.user_content)],
        user_id=str(context.user_id),
        conversation_id=str(context.conversation_id),
        prompt_vars={
            "agent_persona": context.agent_persona or "",
            "learner_memory": context.learner_memory or "",
        },
        tools=tools,
    )
    try:
        async for chunk in chunk_stream:
            if chunk.kind == "delta" and chunk.text:
                parts.append(chunk.text)
            elif chunk.kind == "reasoning":
                if chunk.reasoning_text:
                    reasoning_parts.append(chunk.reasoning_text)
            elif chunk.kind == "tool":
                if chunk.tool:
                    tool_ref = chunk.tool
            elif chunk.kind == "done":
                raw_parts = chunk.raw_parts
                reasoning_text = chunk.reasoning_text
                # Scheduled, NOT awaited: a DB roundtrip before `done` would
                # hold the user's send button hostage (~1s on dev topology).
                # Durability is guaranteed by the protected task; the
                # "next message races the write" window is covered by
                # prepare_turn's in-flight grace retry.
                ensure_persist_scheduled()
            yield chunk
    finally:
        # Schedule FIRST and synchronously: under re-cancellation every await
        # below may raise immediately, but the write is already on its own
        # protected task by then.
        ensure_persist_scheduled()
        # Close the inner generator deterministically (books the interrupted
        # ledger row now instead of whenever GC finalizes it). May insta-raise
        # under cancellation — the persist above no longer depends on it.
        with contextlib.suppress(Exception):
            await chunk_stream.aclose()
        if persist_task is not None and not persist_task.done():
            with contextlib.suppress(asyncio.CancelledError):
                await asyncio.shield(persist_task)


def run_turn(
    context: TurnContext, *, tool: str | None, user: CurrentUser
) -> AsyncIterator[AIChunk]:
    """Dispatch a turn to its runner. Plain text by default; a tool turn when
    the request asked for one. Returns the async iterator (not awaited) so the
    API layer wraps it straight into the SSE response."""
    if tool == "course_planning":
        return stream_course_planning_turn(context, user)
    return stream_turn(context)


async def stream_course_planning_turn(
    context: TurnContext, user: CurrentUser
) -> AsyncIterator[AIChunk]:
    """Course-planning tool turn: create the course up front, stream a short AI
    intro, then attach the card with one `tool` chunk.

    Ordering matters for two reasons:
    - The course shell is created BEFORE the intro streams, so the turn has a
      course id from the first token. Closing the tab mid-intro still persists
      the turn (same "first token persists" guarantee as a plain chat turn).
    - The questionnaire is generated on a protected background task, NOT inline,
      so `done` fires right after the intro: the card appears immediately (with
      a skeleton) instead of after the slow questionnaire LLM call.

    A NEW conversation isn't in the DB yet, so the course links via the message
    tool_json reference rather than course.conversation_id (which would violate
    the FK pre-persist).
    """
    intro_parts: list[str] = []
    reasoning_parts: list[str] = []
    reasoning_text: str | None = None
    raw_parts: dict[str, Any] | None = None
    persist_task: asyncio.Task[Any] | None = None

    plan_conversation_id = (
        None if context.new_conversation_title else context.conversation_id
    )
    async with AsyncSessionLocal() as db:
        course = await course_planning_service.create_course_shell(
            db,
            user,
            topic=context.user_content,
            conversation_id=plan_conversation_id,
        )
    course_id = course.id
    # Generate the questionnaire off the critical path: it fills the course
    # afterwards (the card polls for it) and survives a client disconnect.
    aio.spawn_protected(
        course_planning_service.generate_and_store_questionnaire(
            course_id, topic=context.user_content
        )
    )
    # 搜索前置: kick off the request-level broad search CONCURRENTLY with the
    # questionnaire (Celery). It caches course_search_candidates and flips
    # course.search_status; organize (after answers) gates on that. Lazy import:
    # tasks import services.
    from tasks.course_search import search_course

    search_course.delay(str(course_id), context.user_content)

    def ensure_persist_scheduled() -> None:
        nonlocal persist_task
        intro_text = "".join(intro_parts)
        assistant_reasoning_text = reasoning_text or "".join(reasoning_parts) or None
        # course_id always exists here (created above); persist once the intro
        # has produced output, mirroring the plain chat turn.
        if persist_task is None and intro_text:
            persist_task = aio.spawn_protected(
                conversation_service.persist_turn(
                    conversation_id=context.conversation_id,
                    user_id=context.user_id,
                    new_conversation_title=context.new_conversation_title,
                    new_conversation_project_id=context.new_conversation_project_id,
                    user_content=context.user_content,
                    user_sent_at=context.user_sent_at,
                    assistant_content=intro_text,
                    assistant_reasoning_text=assistant_reasoning_text,
                    raw_parts=raw_parts,
                    tool_ref={
                        "type": "course_planning",
                        "courseId": str(course_id),
                    },
                )
            )

    intro_stream = ai_client.stream_chat(
        AIUseCase.COURSE_PLAN_INTRO,
        [*context.history, ChatMessage(role="user", content=context.user_content)],
        user_id=str(context.user_id),
        conversation_id=str(context.conversation_id),
    )
    try:
        async for chunk in intro_stream:
            if chunk.kind == "delta":
                if chunk.text:
                    intro_parts.append(chunk.text)
                yield chunk
            elif chunk.kind == "reasoning":
                if chunk.reasoning_text:
                    reasoning_parts.append(chunk.reasoning_text)
                yield chunk
            elif chunk.kind == "usage":
                yield chunk
            elif chunk.kind == "done":
                # Capture for history rebuild; do NOT forward — the TURN isn't
                # done until the card is attached below.
                raw_parts = chunk.raw_parts
                reasoning_text = chunk.reasoning_text
            elif chunk.kind == "error":
                # Intro failed before producing output: surface and stop. The
                # orphan course shell is swept later; nothing is persisted.
                yield chunk
                return

        # Intro streamed OK -> attach the card and finish the turn.
        yield AIChunk(
            kind="tool",
            tool={"type": "course_planning", "courseId": str(course_id)},
        )
        ensure_persist_scheduled()
        yield AIChunk(kind="done")
    finally:
        ensure_persist_scheduled()
        with contextlib.suppress(Exception):
            await intro_stream.aclose()
        if persist_task is not None and not persist_task.done():
            with contextlib.suppress(asyncio.CancelledError):
                await asyncio.shield(persist_task)
