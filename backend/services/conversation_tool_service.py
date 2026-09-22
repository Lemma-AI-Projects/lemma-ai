"""Global conversation plugin tools (Desmos 2D/3D 四件套; future plugins land here).

Builds the per-turn ToolBindings shared by BOTH channels — chat_service
(pydantic-ai framework loop) and companion_service (native gemini loop). The
tool TRUTH is single: specs from ai/tools/declarations, handlers here,
validation in schemas/desmos.py; each channel only adapts dispatch.

The two Desmos render tools (2D / 3D) share ONE handler pipeline via
`_make_render_handler(config)` — gate, auto-teach, one-card rule, zero-trust
validation and persistence are maintained in a single place; a `RenderConfig`
per variant supplies the skill name, payload model and card type. Adding the
next Desmos variant (geometry, ...) is one more config + skill + declaration.

Handlers are closures over this turn's user/conversation context (ai/ never
imports services). All handlers share one mutable TurnToolContext:

- loaded_skills gates each render tool on ITS OWN skill: Pydantic can reject
  malformed payloads, but it cannot catch "valid yet quietly wrong" graphs
  (unescaped \\sin parses as s*i*n — plots fine, plots WRONG). Forcing the
  model to see the spec first shuts down that error class.
- card_emitted enforces 一轮一图 ACROSS variants (the message tool_json is a
  single card slot — one drawing per turn, be it 2D or 3D).
- last_graph_id lets read_current_graph see a graph rendered EARLIER IN THIS
  SAME TURN; otherwise it resolves through the persisted tool_json chain.
- memories_written collects what `remember` wrote during THIS turn, so the
  answer's digest can report it separately from the memories the turn started
  with (see the field's own comment) — nothing in the tool loop reads it.

Handlers never raise for business failures — they return structured statuses
({"status": "rejected"/"invalid"/...}) so the model self-corrects inside the
tool loop instead of killing the stream.
"""

import uuid
from collections.abc import AsyncIterator, Callable
from dataclasses import dataclass, field

from pydantic import BaseModel, ValidationError

from ai import (
    LOAD_SKILL,
    READ_CURRENT_GRAPH,
    READ_PAGE,
    RECORD_EVIDENCE,
    REMEMBER,
    RENDER_DESMOS_3D_GRAPH,
    RENDER_DESMOS_GRAPH,
    SAVE_NOTE,
    ToolBinding,
    ToolCall,
    ToolProgress,
    ToolResult,
    tool_spec,
)
from ai.skills import skill_body, skill_names
from core.database import AsyncSessionLocal
from models.doc import Page
from schemas.desmos import Desmos3DGraphPayload, DesmosGraphPayload
from schemas.knowledge import KnowledgeEvidenceIn
from services import (
    desmos_graph_service,
    doc_service,
    knowledge_service,
    space_memory_service,
)


@dataclass
class TurnToolContext:
    loaded_skills: set[str] = field(default_factory=set)
    card_emitted: bool = False
    last_graph_id: uuid.UUID | None = None
    # Space Memory written during THIS turn. Reported alongside the memories the
    # turn already had: the context digest is frozen when the turn starts (so it
    # describes the same moment as the prompt), which means a memory written now
    # is by definition NOT in this turn's context. Listing the two separately is
    # what keeps the panel honest about that.
    memories_written: list[dict] = field(default_factory=list)


@dataclass(frozen=True)
class RenderConfig:
    """Everything variant-specific about one Desmos render tool."""

    tool_name: str
    skill_name: str
    payload_model: type[BaseModel]
    card_type: str
    kind: str  # desmos_graphs.kind value


_RENDER_CONFIGS = (
    RenderConfig(
        tool_name=RENDER_DESMOS_GRAPH,
        skill_name="desmos-graphing",
        payload_model=DesmosGraphPayload,
        card_type="desmos_graph",
        kind="2d",
    ),
    RenderConfig(
        tool_name=RENDER_DESMOS_3D_GRAPH,
        skill_name="desmos-3d-graphing",
        payload_model=Desmos3DGraphPayload,
        card_type="desmos_3d_graph",
        kind="3d",
    ),
)

# kind -> the render tool that redraws graphs of that kind (read tool's note).
_RENDER_TOOL_BY_KIND = {
    config.kind: config.tool_name for config in _RENDER_CONFIGS
}
_SKILL_BY_KIND = {config.kind: config.skill_name for config in _RENDER_CONFIGS}


def _wrapped_spec(skill_name: str) -> str:
    """Skill body in the structured tag (官方实现指南: content identification)."""
    return (
        f'<skill_content name="{skill_name}">\n'
        f"{skill_body(skill_name)}\n"
        f"</skill_content>"
    )


def _match_space_page(
    rows: list[tuple[Page, str]], wanted: str
) -> Page | list[Page] | None:
    """Resolve the model's `page` argument against one space's pages.

    Returns the Page, a list of pages (ambiguous) or None (no match) — the two
    failure shapes the model must be able to tell apart. Exact id first, then
    exact title (case-folded). Substring matching is deliberately absent: a
    request for 「微积分」 hitting both 「微积分入门」 and 「微积分习题」 is exactly
    the silent mis-read this rule exists to prevent, and the same "不猜" rule
    governs the Learner State evidence writer.
    """
    try:
        as_id = uuid.UUID(wanted)
    except (ValueError, AttributeError, TypeError):
        as_id = None
    if as_id is not None:
        for page, _ in rows:
            if page.id == as_id:
                return page
    key = wanted.strip().casefold()
    matches = [page for page, _ in rows if page.title.strip().casefold() == key]
    if len(matches) == 1:
        return matches[0]
    return matches or None


def build_global_tools(
    *,
    user_id: uuid.UUID,
    conversation_id: uuid.UUID | None,
    project_id: uuid.UUID | None = None,
    on_memory_written: Callable[[dict], None] | None = None,
) -> list[ToolBinding]:
    """The plugin ToolBindings for one turn.

    conversation_id is None only when the conversation row may not exist yet
    (new conversation's first turn) — graphs are then created unlinked and the
    message tool_json carries the link (course_planning precedent).

    project_id is the learn space this turn runs in (None outside a space).
    Every space-scoped tool is gated on it: without a space there is no
    material to read and nowhere to write, and the handlers say so instead of
    failing — the Learner State evidence tool needs the same argument, so this
    signature carries both features.

    on_memory_written is how this turn's memory writes reach the answer's
    digest. A callback rather than a return value because the bindings are
    handed to the model loop, not inspected by it; and rather than a field the
    caller reads off afterwards because the caller (chat_service) already owns
    the local list it wants filled.
    """
    ctx = TurnToolContext()

    async def load_skill_handler(
        call: ToolCall,
    ) -> AsyncIterator[ToolProgress | ToolResult]:
        name = str(call.args.get("skill", ""))
        if name not in skill_names():
            yield ToolResult(
                response={"status": "unknown_skill", "available": skill_names()}
            )
            return
        ctx.loaded_skills.add(name)
        yield ToolResult(response={"status": "loaded", "skill": _wrapped_spec(name)})

    def make_render_handler(config: RenderConfig):
        async def render_handler(
            call: ToolCall,
        ) -> AsyncIterator[ToolProgress | ToolResult]:
            if config.skill_name not in ctx.loaded_skills:
                # 门禁 + 自动补课：不是干拒（真跑观察到模型被拒后会放弃并让
                # 用户"稍等"），而是把本工具的规范全文直接递回去，让下一轮就
                # 能按规范重试——自愈从两步缩为一步，token 成本相同。
                ctx.loaded_skills.add(config.skill_name)
                yield ToolResult(
                    response={
                        "status": "spec_required",
                        "spec": _wrapped_spec(config.skill_name),
                        "instruction": (
                            "本次调用未执行。上面是绘图参数规范：请立即按规范"
                            f"检查/修正你的参数，并重新调用 {config.tool_name} "
                            "完成绘图。不要询问用户、不要说稍等。"
                        ),
                    }
                )
                return
            if ctx.card_emitted:
                yield ToolResult(
                    response={
                        "status": "rejected",
                        "reason": "每个回答最多画一张图；请在讲解中使用已生成的图",
                    }
                )
                return
            try:
                payload = config.payload_model.model_validate(call.args)
            except ValidationError as exc:
                yield ToolResult(
                    response={
                        "status": "invalid",
                        "errors": [
                            {
                                "loc": ".".join(str(part) for part in error["loc"]),
                                "msg": error["msg"],
                            }
                            for error in exc.errors()
                        ],
                    }
                )
                return
            async with AsyncSessionLocal() as db:
                graph = await desmos_graph_service.create_graph(
                    db,
                    user_id=user_id,
                    conversation_id=conversation_id,
                    ai_params=payload.model_dump(by_alias=True, exclude_none=True),
                    kind=config.kind,
                )
            ctx.card_emitted = True
            ctx.last_graph_id = graph.id
            yield ToolResult(
                response={"status": "created", "graphId": str(graph.id)},
                card={"type": config.card_type, "graphId": str(graph.id)},
            )

        return render_handler

    async def read_handler(
        call: ToolCall,
    ) -> AsyncIterator[ToolProgress | ToolResult]:
        graph_id = ctx.last_graph_id
        if graph_id is None and conversation_id is not None:
            async with AsyncSessionLocal() as db:
                graph_id = await desmos_graph_service.find_latest_graph_id(
                    db, conversation_id=conversation_id
                )
        if graph_id is None:
            yield ToolResult(response={"status": "no_graph"})
            return
        async with AsyncSessionLocal() as db:
            snapshot = await desmos_graph_service.read_graph_snapshot(
                db, user_id=user_id, graph_id=graph_id
            )
        if snapshot is None:
            yield ToolResult(response={"status": "no_graph"})
            return
        kind = str(snapshot.get("kind", "2d"))
        render_tool = _RENDER_TOOL_BY_KIND.get(kind, RENDER_DESMOS_GRAPH)
        response: dict = {
            "status": "ok",
            **snapshot,
            # 防"只读当成已改"幻觉（真跑观察到：模型 read 完直接宣布改好了）：
            # 把下一步指令放在离模型决策最近的位置——函数返回值里。
            "note": (
                f"这只是当前图（kind={kind}）的快照，图并未被修改。要完成修改，"
                f"必须立即调用 {render_tool} 输出完整的新图参数。在该调用成功"
                "返回之前，绝对不要声称图已修改。"
            ),
        }
        skill_name = _SKILL_BY_KIND.get(kind)
        if skill_name is not None and skill_name not in ctx.loaded_skills:
            # 读图九成是为了改图：把对应 kind 的规范直接搭在快照上，改图链路
            # 从三步（read -> 补课 -> render）缩成两步，消除中途放弃的窗口。
            ctx.loaded_skills.add(skill_name)
            response["spec"] = _wrapped_spec(skill_name)
        yield ToolResult(response=response)

    async def read_page_handler(
        call: ToolCall,
    ) -> AsyncIterator[ToolProgress | ToolResult]:
        """Read one board's text, by title or id, inside THIS space only.

        The scope is project_id, never "any page of this user": the tool exists
        to answer "what does my space hold", and a cross-space read would let
        the model mix two spaces' material into one answer.
        """
        if project_id is None:
            yield ToolResult(
                response={
                    "status": "no_space",
                    "note": "当前对话不属于任何空间，读不到板块。",
                }
            )
            return
        wanted = str(call.args.get("page", "")).strip()
        if not wanted:
            yield ToolResult(
                response={"status": "invalid", "note": "page 不能为空（传标题或 id）。"}
            )
            return
        async with AsyncSessionLocal() as db:
            rows = await doc_service.list_project_pages(
                db, user_id=user_id, project_id=project_id
            )
            if rows is None:
                yield ToolResult(response={"status": "no_space"})
                return
            match = _match_space_page(rows, wanted)
            if match is None:
                yield ToolResult(
                    response={
                        "status": "not_found",
                        "available": [page.title for page, _ in rows],
                        "note": (
                            "没有标题匹配的板块。上面是这个空间的全部标题，"
                            "请从中选一个重试，不要编造内容。"
                        ),
                    }
                )
                return
            if isinstance(match, list):
                yield ToolResult(
                    response={
                        "status": "ambiguous",
                        "candidates": [
                            {"id": str(page.id), "title": page.title}
                            for page in match
                        ],
                        "note": "标题对上了多块板，请让用户挑，或改用 id 重试。",
                    }
                )
                return
            loaded = await doc_service.get_page_blocks(
                db, user_id=user_id, page_id=match.id
            )
        if loaded is None:
            yield ToolResult(response={"status": "not_found"})
            return
        page, blocks = loaded
        titles = [p.title for p, _ in rows]
        yield ToolResult(
            response={
                "status": "ok",
                "id": str(page.id),
                "title": page.title,
                "kind": page.kind,
                "position": titles.index(page.title) + 1,
                "total": len(titles),
                "text": doc_service.blocks_to_text(blocks),
                "note": "以上是该板正文全文。若还要别的板，用标题再调一次本工具。",
            }
        )

    async def save_note_handler(
        call: ToolCall,
    ) -> AsyncIterator[ToolProgress | ToolResult]:
        """Store a conclusion as a NEW board in this space. Never edits one.

        Only-create is the V1 shape of the "永不自动改用户画布" red line: an
        Agent that can append into a board the user wrote cannot be trusted to
        leave the user's own words alone. Creating is additive and reversible
        (the user can delete it); editing is neither.
        """
        if project_id is None:
            yield ToolResult(
                response={
                    "status": "no_space",
                    "note": "当前对话不属于任何空间，没有地方可存。",
                }
            )
            return
        title = str(call.args.get("title", "")).strip()
        content = str(call.args.get("content", ""))
        if not title or not content.strip():
            yield ToolResult(
                response={
                    "status": "invalid",
                    "note": "title 与 content 都不能为空。",
                }
            )
            return
        blocks = doc_service.markdown_to_blocks(content)
        if not blocks:
            yield ToolResult(
                response={"status": "invalid", "note": "content 解析后是空的。"}
            )
            return
        async with AsyncSessionLocal() as db:
            created = await doc_service.create_page_with_blocks(
                db,
                user_id=user_id,
                project_id=project_id,
                title=title,
                blocks=blocks,
            )
        if created is None:
            yield ToolResult(response={"status": "no_space"})
            return
        page, _ = created
        yield ToolResult(
            response={
                "status": "created",
                "pageId": str(page.id),
                "title": page.title,
                "note": (
                    "已新建这篇笔记（只新建，没有改动任何已有板块）。"
                    "请把标题念给用户确认。"
                ),
            }
        )

    async def remember_handler(
        call: ToolCall,
    ) -> AsyncIterator[ToolProgress | ToolResult]:
        """Record one memory for this space — the only Space Memory write path.

        Scoped by project_id, so a memory always belongs to the space the turn
        ran in; a turn outside a space has nowhere to put one and says so.

        Honest about being a no-op: when the same text is already remembered,
        the response says `already_remembered` and the model is told to say so
        rather than claim a fresh save. The user should be able to trust that
        "记下了" means something changed (or that nothing needed to).
        """
        if project_id is None:
            yield ToolResult(
                response={
                    "status": "no_space",
                    "note": "当前对话不属于任何空间，没有地方可以记住这件事。",
                }
            )
            return
        text = str(call.args.get("text", "")).strip()
        if not text:
            yield ToolResult(
                response={"status": "invalid", "note": "text 不能为空。"}
            )
            return
        async with AsyncSessionLocal() as db:
            result = await space_memory_service.record(
                db,
                user_id=user_id,
                project_id=project_id,
                text=text,
                conversation_id=conversation_id,
            )
        if result is None:
            # Ownership failed for a project we were handed — the same
            # not-yours/no-such collapse as everywhere else.
            yield ToolResult(response={"status": "no_space"})
            return
        memory, created = result
        written = {
            "id": str(memory.id),
            "text": memory.text,
            "created": created,
        }
        ctx.memories_written.append(written)
        if on_memory_written is not None:
            on_memory_written(written)
        yield ToolResult(
            response={
                "status": "remembered" if created else "already_remembered",
                "id": str(memory.id),
                "text": memory.text,
                "note": (
                    "已记进这个空间，之后**别的对话**里也能用到。"
                    "请在回答里把记下的内容说一遍，让用户看见。"
                    if created
                    else "这件事这个空间已经记过了，没有重复记。"
                    "请在回答里说明它已在记忆中，不要声称是刚刚新记的。"
                ),
            }
        )

    async def record_evidence_handler(
        call: ToolCall,
    ) -> AsyncIterator[ToolProgress | ToolResult]:
        """Record what the learner ACTUALLY did on one knowledge item.

        This is the only write path into Learner State, and it is deliberately
        narrow: the agent may not declare a learner's level, only report an
        answer it observed. Everything else — mastered, ready, not-yet — is
        derived from these rows by `ai/knowledge/state.py`.

        Two properties worth not "simplifying" away:

        * An unknown item is refused, not created. The service would happily
          create one (that is the agent-drafted path of the structure), but a
          chat tool doing it silently would let the model build a parallel
          knowledge structure of its own invention — and the state would then
          rest on a structure nobody reviewed. `resolve_item` first, then write.
        * `basis` maps to the evidence tier, and the mapping is the model's own
          claim about how checkable its verdict was. `verified` (tier A) needs a
          definite fact recorded in `reasoning` and settles an item on its own;
          `judged` (tier B) is the honest default for "I read the answer and
          judged it" and needs two independent records. The prompt tells the
          model not to reach for `verified` to make the state look better.
        """
        if project_id is None:
            yield ToolResult(
                response={
                    "status": "no_space",
                    "note": "当前对话不属于任何空间，没有学习状态可记。",
                }
            )
            return
        item_label = str(call.args.get("item", "")).strip()
        verdict = str(call.args.get("verdict", "")).strip().lower()
        basis = str(call.args.get("basis", "judged")).strip().lower() or "judged"
        reasoning = str(call.args.get("reasoning", "")).strip()
        if not item_label or verdict not in ("correct", "incorrect"):
            yield ToolResult(
                response={
                    "status": "invalid",
                    "note": "item 与 verdict 都要有（verdict 只能是 correct / incorrect）。",
                }
            )
            return
        if basis not in ("verified", "judged"):
            yield ToolResult(
                response={"status": "invalid", "note": "basis 只能是 verified / judged。"}
            )
            return
        if not reasoning:
            # An unreviewable verdict is not evidence — same rule the service
            # enforces for tier B, applied here to both tiers.
            yield ToolResult(
                response={
                    "status": "invalid",
                    "note": (
                        "reasoning 不能为空：verified 要写出你据以判定的那个确定事实，"
                        "judged 要写出判断理由。"
                    ),
                }
            )
            return

        async with AsyncSessionLocal() as db:
            item, candidates = await knowledge_service.resolve_item(
                db, project_id=project_id, item_label=item_label
            )
            if item is None:
                available = [
                    row.label for row in await knowledge_service.list_items(
                        db, project_id=project_id
                    )
                ]
                yield ToolResult(
                    response={
                        "status": "ambiguous_item" if candidates else "unknown_item",
                        "candidates": candidates,
                        "available": available,
                        "note": (
                            "这个空间的知识结构里没有这个（或对上了不止一个）。"
                            "请从 available 里选一个；如果确实不在结构里，"
                            "说明当前结构还没覆盖这件事，不要自己造一个知识点。"
                        ),
                    }
                )
                return

            try:
                await knowledge_service.record_evidence(
                    db,
                    project_id=project_id,
                    user_id=user_id,
                    payload=KnowledgeEvidenceIn(
                        project_id=project_id,
                        item_id=item.id,
                        verdict=verdict,
                        tier="A" if basis == "verified" else "B",
                        independent=True,
                        hint_used=False,
                        reasoning=reasoning,
                        response_ref={"conversationId": str(conversation_id)}
                        if conversation_id
                        else None,
                    ),
                )
            except knowledge_service.EvidenceRejected as rejected:
                yield ToolResult(
                    response={
                        "status": "rejected",
                        "reason": str(rejected),
                        "note": "证据没有被接受，状态未变。",
                    }
                )
                return

            state, fringes, items, _ = await knowledge_service.compute_state(
                db, project_id=project_id, user_id=user_id
            )

        labels = {str(row.id): row.label for row in items}
        value = state.value(str(item.id))
        yield ToolResult(
            response={
                "status": "recorded",
                "item": item.label,
                "verdict": verdict,
                "tier": "A" if basis == "verified" else "B",
                # The item's state AFTER the write — the model should say this
                # rather than infer it. Note this is read live, unlike the
                # learner-state block in the prompt, which was frozen when the
                # turn started.
                "itemState": value.value,
                "readyNext": [labels.get(i, i) for i in fringes.outer],
                "note": (
                    "已记录。上一条 itemState 是**写入之后**的状态，请如实告诉用户，"
                    "而且用词要对上：mastered = 已具备；not_mastered = 这次没做对；"
                    "unassessed = 还没有定论（judged 类的证据要两条独立记录才定案）。"
                    "不要把它说成别的状态，也不要替系统宣布掌握程度。"
                ),
            }
        )

    return [
        ToolBinding(spec=tool_spec(LOAD_SKILL), handler=load_skill_handler),
        *(
            ToolBinding(
                spec=tool_spec(config.tool_name),
                handler=make_render_handler(config),
            )
            for config in _RENDER_CONFIGS
        ),
        ToolBinding(spec=tool_spec(READ_CURRENT_GRAPH), handler=read_handler),
        ToolBinding(spec=tool_spec(READ_PAGE), handler=read_page_handler),
        ToolBinding(spec=tool_spec(SAVE_NOTE), handler=save_note_handler),
        ToolBinding(spec=tool_spec(REMEMBER), handler=remember_handler),
        ToolBinding(spec=tool_spec(RECORD_EVIDENCE), handler=record_evidence_handler),
    ]
