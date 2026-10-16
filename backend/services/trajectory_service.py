"""轨迹（Trajectory）：把这个空间**真实发生过的事**按时间摆出来。

⚠️ **这个模块只读，而且不调模型。** 图上每一句话都是"读出来的一行数据"拼的 ——
没有判断、没有总结、没有"什么变了"。那类句子要有依据才配写；这一版宁可留白，
让界面如实说"没有记录支撑"。

⚠️ **两处近似必须显式标出来**（`at_accuracy`），不许悄悄当成精确：
  * **边注**：`blocks` 表**没有时间戳**，只能取它所在页的 `updated_at` ⇒ `approx`；
  * **通知**：`notifications` 表**没有空间字段**，空间只能从 `meta["projectId"]` 取；
    取不到的归到 `unattributed` 里**数出来**，不猜它属于谁。

⚠️ **没有第五种时间尺度。** 不分组、不命名阶段、不评里程碑 —— 那些都是判断。
这里只有一条扁平的、按时间排好的事件流。

时间顺序刻意是**从早到晚**：轨迹是拿来"从上往下读一遍走过的路"的，
而"最近发生了什么"另有一个更合适的地方（通知/Feed）。
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.ai_conversation import AiConversation
from models.board_context import BoardContextBundle
from models.coordinator_decision import CoordinatorDecision
from models.doc import Block, Page
from models.knowledge import KnowledgeEdge, KnowledgeEvidence, KnowledgeItem
from models.notification import Notification
from models.space_goal import SpaceGoal
from models.space_memory import SpaceMemory

#: 单次返回的事件上限。超出只截最近的这些 —— 接口不返回"半个空间"，
#: 但也不让一个跑了半年的空间把响应撑爆。截断发生时由 `truncated` 如实说明。
_MAX_EVENTS = 500
#: 每个来源各自的上限，防止单一来源（例如几百条边注）把别的来源挤掉。
_MAX_PER_SOURCE = 200

#: 一个空间的知识骨架最多读这么多点/边。今天的量级是十几个，
#: 但这是**读的地方**，得有个上限 —— 否则一个坏掉的库能拖死这一屏。
_MAX_ITEMS = 800

#: 时间精度。`APPROX` 全部用在"表里没有时间戳、只能拿邻居的时间"的场合。
EXACT = "exact"
APPROX = "approx"


@dataclass(frozen=True)
class TrajectoryEvent:
    """时间线上的一行。**没有判断字段** —— 这里只有"发生了什么"和"在哪能看"。"""

    id: str
    kind: str
    at: datetime
    at_accuracy: str
    title: str
    source: dict[str, Any]
    href: str | None = None
    #: 这一行属于哪个知识点。**今天只有证据有**（`knowledge_evidence.item_id`）；
    #: 其余八类没有这个字段 —— 所以树上大部分经历会挂在"挂不上"那一栏。
    #: **那不是 bug，是它要如实反映的现实**（要么是没记，要么是没得可挂）。
    item_id: uuid.UUID | None = None


@dataclass(frozen=True)
class KnowledgePoint:
    """骨架上的一个知识点。它**不是一条事件** —— 它没有"发生在某天"，它是"存在"。"""

    id: uuid.UUID
    label: str
    kind: str
    origin: str
    status: str


@dataclass(frozen=True)
class PrereqEdge:
    """一条先修关系：`from` 是前提，`to` 是它之后才谈得上的那个。"""

    from_item_id: uuid.UUID
    to_item_id: uuid.UUID
    confidence: str


@dataclass(frozen=True)
class Trajectory:
    space_id: uuid.UUID
    events: list[TrajectoryEvent] = field(default_factory=list)
    #: 归不到这个空间、但也确实发生了的东西，按来源计数（目前只有通知）。
    unattributed: dict[str, int] = field(default_factory=dict)
    truncated: bool = False
    #: 这个空间的知识骨架 —— **树的那一根主干**。它不是事件，所以不跟事件排在一起。
    points: list[KnowledgePoint] = field(default_factory=list)
    prereqs: list[PrereqEdge] = field(default_factory=list)

    @property
    def span(self) -> tuple[datetime | None, datetime | None]:
        if not self.events:
            return (None, None)
        return (self.events[0].at, self.events[-1].at)


def _clip(text: str, limit: int = 48) -> str:
    """一句话截断。**不做摘要** —— 摘要就是判断，这里只截。"""
    flat = " ".join(text.split())
    if len(flat) <= limit:
        return flat
    return flat[: limit - 1] + "…"


def _block_text(content: dict[str, Any] | None) -> str:
    """一块正文的可读文本（list 块把各项拼起来）。"""
    if not content:
        return ""
    items = content.get("items")
    if isinstance(items, list):
        return "\n".join(str(item) for item in items)
    text = content.get("text")
    return str(text) if text else ""


def _docs_href(project_id: uuid.UUID, page_id: uuid.UUID) -> str:
    return f"/learn-spaces/{project_id}/docs/{page_id}"


def _space_href(project_id: uuid.UUID) -> str:
    return f"/learn-spaces/{project_id}"


def _take(rows: list[Any], counter: dict[str, int]) -> list[Any]:
    """按来源各自截断，并把"截过"这件事记下来。"""
    counter["truncated"] = counter.get("truncated", 0) + max(0, len(rows) - _MAX_PER_SOURCE)
    return rows[:_MAX_PER_SOURCE]


async def assemble(
    db: AsyncSession, *, user_id: uuid.UUID, project_id: uuid.UUID
) -> Trajectory:
    """把这个空间真实发生过的事读出来。**调用方负责先校验这个空间属于这个人。**

    ⚠️ 每一个来源都是"有行才有事件"。某个来源今天一条行都没有（例如 method_episodes
    没有任何生产调用方）⇒ 这里**什么都不会发生**，也不会编一个事件出来补位。
    轨迹上的空白就是空白 —— 那是它最该如实的地方。
    """
    events: list[TrajectoryEvent] = []
    counter: dict[str, int] = {}
    unattributed: dict[str, int] = {}

    # ---------------------------------------------------------------- 资料层
    # 顶层页 = 资料 / 笔记 / 文件夹；子页是「这份资料的笔记」（边注住在里面，
    # 它不是一份独立资料，所以不单独出一个节点）。
    pages = (
        await db.execute(
            select(Page)
            .where(Page.project_id == project_id)
            .order_by(Page.created_at)
            .limit(_MAX_PER_SOURCE * 2)
        )
    ).scalars().all()
    top_pages = [page for page in pages if page.parent_page_id is None]
    child_pages = [page for page in pages if page.parent_page_id is not None]

    material_verb = {
        "imported": "放进一份资料",
        "note": "新建一份笔记",
        "canvas": "新建一块画布",
        "folder": "新建一个文件夹",
    }
    for page in _take(list(top_pages), counter):
        events.append(
            TrajectoryEvent(
                id=f"pages:{page.id}",
                kind="material",
                at=page.created_at,
                at_accuracy=EXACT,
                title=f'{material_verb.get(page.kind, "新建一份资料")}「{_clip(page.title)}」',
                source={"table": "pages", "id": str(page.id)},
                href=_docs_href(project_id, page.id),
            )
        )

    # ------------------------------------------------------------------ 边注
    # ⚠️ 时间取**父页的 updated_at**（块没有时间戳）⇒ 标 approx。
    # 只认 `meta.source` 非空的那种块 —— 用户手打的普通笔记块不是边注。
    if child_pages:
        child_ids = [page.id for page in child_pages]
        parent_of = {page.id: page.parent_page_id for page in child_pages}
        updated_of = {page.id: page.updated_at for page in child_pages}
        blocks = (
            await db.execute(
                select(Block)
                .where(Block.page_id.in_(child_ids))
                .order_by(Block.page_id, Block.position)
            )
        ).scalars().all()
        annotations = [
            block
            for block in blocks
            if isinstance(block.meta, dict) and block.meta.get("source")
        ]
        for block in _take(annotations, counter):
            parent_id = parent_of.get(block.page_id)
            events.append(
                TrajectoryEvent(
                    id=f"blocks:{block.id}",
                    kind="annotation",
                    at=updated_of[block.page_id],
                    at_accuracy=APPROX,
                    title=f"写下一条边注：{_clip(_block_text(block.content), 40)}",
                    source={"table": "blocks", "id": str(block.id)},
                    href=_docs_href(project_id, parent_id) if parent_id else None,
                )
            )

    # ------------------------------------------------------------------ 目标
    goals = (
        await db.execute(
            select(SpaceGoal)
            .where(SpaceGoal.project_id == project_id)
            .order_by(SpaceGoal.created_at)
            .limit(_MAX_PER_SOURCE)
        )
    ).scalars().all()
    for goal in _take(list(goals), counter):
        suffix = "" if goal.status == "active" else f"（{goal.status}）"
        events.append(
            TrajectoryEvent(
                id=f"space_goals:{goal.id}",
                kind="goal",
                at=goal.created_at,
                at_accuracy=EXACT,
                title=f"设了一个目标：{_clip(goal.target_text)}{suffix}",
                source={"table": "space_goals", "id": str(goal.id)},
                href=_space_href(project_id),
            )
        )

    # ------------------------------------------------------------------ 记忆
    memories = (
        await db.execute(
            select(SpaceMemory)
            .where(SpaceMemory.project_id == project_id)
            .order_by(SpaceMemory.created_at)
            .limit(_MAX_PER_SOURCE)
        )
    ).scalars().all()
    for memory in _take(list(memories), counter):
        events.append(
            TrajectoryEvent(
                id=f"space_memories:{memory.id}",
                kind="memory",
                at=memory.created_at,
                at_accuracy=EXACT,
                title=f"记住了一件事：{_clip(memory.text)}",
                source={"table": "space_memories", "id": str(memory.id)},
                href=_space_href(project_id),
            )
        )

    # ------------------------------------------------------------------ 对话
    conversations = (
        await db.execute(
            select(AiConversation)
            .where(AiConversation.project_id == project_id)
            .order_by(AiConversation.created_at)
            .limit(_MAX_PER_SOURCE)
        )
    ).scalars().all()
    for conversation in _take(list(conversations), counter):
        events.append(
            TrajectoryEvent(
                id=f"ai_conversations:{conversation.id}",
                kind="conversation",
                at=conversation.created_at,
                at_accuracy=EXACT,
                title=f'聊了一次：「{_clip(conversation.title or "未命名")}」',
                source={"table": "ai_conversations", "id": str(conversation.id)},
                href=f"/chat/{conversation.id}",
            )
        )

    # ------------------------------------------------------------------ 证据
    # ⚠️ 这张表今天几乎不会有行（判分主线绕过唯一入口，见 VISION_GAPS A2）——
    # 所以轨迹上大概看不到它。**那不是 bug，是它要如实反映的现实。**
    evidence_rows = (
        await db.execute(
            select(KnowledgeEvidence)
            .where(KnowledgeEvidence.project_id == project_id)
            .order_by(KnowledgeEvidence.created_at)
            .limit(_MAX_PER_SOURCE)
        )
    ).scalars().all()
    for row in _take(list(evidence_rows), counter):
        independent = row.independent and not row.hint_used
        title = f"记下一条证据：{row.verdict}"
        if independent:
            title += "（独立做对）"
        events.append(
            TrajectoryEvent(
                id=f"knowledge_evidence:{row.id}",
                kind="evidence",
                at=row.created_at,
                at_accuracy=EXACT,
                title=title,
                source={"table": "knowledge_evidence", "id": str(row.id)},
                href=_space_href(project_id),
                # ⚠️ 这是今天**唯一**一条"经历挂得到知识上"的真实边。
                # 别的八类都没有这个字段 —— 树上它们只能站在"挂不上"那一栏。
                item_id=row.item_id,
            )
        )

    # ------------------------------------------------------------ 圈选投送
    bundles = (
        await db.execute(
            select(BoardContextBundle)
            .where(BoardContextBundle.project_id == project_id)
            .order_by(BoardContextBundle.created_at)
            .limit(_MAX_PER_SOURCE)
        )
    ).scalars().all()
    for bundle in _take(list(bundles), counter):
        count = len(bundle.items or [])
        label = f"「{_clip(bundle.label, 24)}」" if bundle.label else ""
        events.append(
            TrajectoryEvent(
                id=f"board_context_bundles:{bundle.id}",
                kind="bundle",
                at=bundle.created_at,
                at_accuracy=EXACT,
                title=f"圈了一批材料{label}（{count} 块）",
                source={"table": "board_context_bundles", "id": str(bundle.id)},
                href=_space_href(project_id),
            )
        )

    # ------------------------------------------------------------------ 决策
    decisions = (
        await db.execute(
            select(CoordinatorDecision)
            .where(CoordinatorDecision.project_id == project_id)
            .order_by(CoordinatorDecision.created_at)
            .limit(_MAX_PER_SOURCE)
        )
    ).scalars().all()
    for decision in _take(list(decisions), counter):
        events.append(
            TrajectoryEvent(
                id=f"coordinator_decisions:{decision.id}",
                kind="decision",
                at=decision.created_at,
                at_accuracy=EXACT,
                title=f"系统做了一个决定：{decision.action}",
                source={"table": "coordinator_decisions", "id": str(decision.id)},
                href=_space_href(project_id),
            )
        )

    # ------------------------------------------------------------------ 通知
    # ⚠️ 这张表**没有 project_id** —— 空间只能从 meta 里取。取不到的**不猜**，
    # 归到下面 `unattributed` 里数出来给用户看。
    notifications = (
        await db.execute(
            select(Notification)
            .where(Notification.user_id == user_id)
            .order_by(Notification.created_at)
            .limit(_MAX_PER_SOURCE * 2)
        )
    ).scalars().all()
    mine: list[Notification] = []
    strangers = 0
    for row in notifications:
        meta = row.meta if isinstance(row.meta, dict) else {}
        if str(meta.get("projectId") or "") == str(project_id):
            mine.append(row)
        elif not meta.get("projectId"):
            strangers += 1
    if strangers:
        unattributed["notifications_without_space"] = strangers
    for row in _take(mine, counter):
        events.append(
            TrajectoryEvent(
                id=f"notifications:{row.id}",
                kind="notification",
                at=row.created_at,
                at_accuracy=EXACT,
                title=f"提醒：{_clip(row.title)}",
                source={"table": "notifications", "id": str(row.id)},
                href="/schedule",
            )
        )

    # ------------------------------------------------------------ 排序与截断
    events.sort(key=lambda event: event.at)
    truncated = counter.get("truncated", 0) > 0 or len(events) > _MAX_EVENTS
    if len(events) > _MAX_EVENTS:
        events = events[-_MAX_EVENTS:]  # 留最近的这些

    # ---------------------------------------------------------------- 知识骨架
    # ⚠️ **它不跟事件排在一起，也不是事件。** 事件回答"哪天发生了什么"；
    # 知识点回答"存在哪些要学的东西"。把它塞进 events 会让它跟着时间轴滚走，
    # 而树需要它一直在那儿当主干。
    points = (
        await db.execute(
            select(KnowledgeItem)
            .where(KnowledgeItem.project_id == project_id)
            .order_by(KnowledgeItem.created_at)
            .limit(_MAX_ITEMS)
        )
    ).scalars().all()
    prereqs = (
        await db.execute(
            select(KnowledgeEdge)
            .where(KnowledgeEdge.project_id == project_id)
            .order_by(KnowledgeEdge.created_at)
            .limit(_MAX_ITEMS)
        )
    ).scalars().all()
    known = {point.id for point in points}

    return Trajectory(
        space_id=project_id,
        events=events,
        unattributed=unattributed,
        truncated=truncated,
        points=[
            KnowledgePoint(
                id=point.id,
                label=point.label,
                kind=point.kind,
                origin=point.origin,
                status=point.status,
            )
            for point in points
        ],
        # ⚠️ 丢掉指向不在这个空间里的点 —— 半个边画不出树，而画一条悬空的线
        # 比不画更糟（看起来像"这里有个东西"，其实没有）。
        prereqs=[
            PrereqEdge(
                from_item_id=edge.from_item_id,
                to_item_id=edge.to_item_id,
                confidence=edge.confidence,
            )
            for edge in prereqs
            if edge.from_item_id in known and edge.to_item_id in known
        ],
    )
