"""Mala 的投送包：存住一次选择，并把这一轮的材料渲染成提示词里的那一段。

三个不变量都在这里守，而不是散在调用点：

1. **空间必须是本人的**：别人的 project 一律当作不存在（404），与 `doc_service` 同一条规矩。
2. **空选区与超限都报错，绝不截断**：截断会让用户以为全带上了 —— 那比报错糟得多。
3. **一条都读不出内容的选区拒收**：没有文本的材料进提示词只会污染上下文。

它**不调模型、不读画板、不碰对象存储**：这一层只跟"用户选了什么"打交道。
渲染那一段是纯函数，所以"提示词里到底写了什么"可以被断言，而不是只能靠读代码相信。
"""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models import BoardContextBundle, Project
from schemas.board_context import BoardContextIn, BoardContextItemIn, BoardContextOut

#: 一次投送最多带多少项。24 大致是"一屏框选"的上限：再多会淹掉上下文，
#: 也会让用户自己都不知道带上了什么。
MAX_ITEMS = 24

#: 一轮对话最多挂几个包。
MAX_BUNDLES_PER_TURN = 8

#: 掌握度三态的中文说法（与 Learner State 同一套词汇）。
MASTERY_LABELS = {"known": "已掌握", "learning": "正在学", "due": "该复习"}

#: 渲染"它们之间的连接"时，最多写几条 —— 提示词是给人读的，不是给图读的。
MAX_RENDERED_LINKS = 6


class ContextRefused(ValueError):
    """带着机器可读 reason 的拒绝：调用方把它变成 4xx，不用去猜原因。"""

    def __init__(self, reason: str, *, status: int = 422) -> None:
        super().__init__(reason)
        self.reason = reason
        self.status = status


async def _owned_project_id(
    db: AsyncSession, *, user_id: uuid.UUID, project_id: uuid.UUID
) -> uuid.UUID | None:
    result = await db.execute(
        select(Project.id).where(Project.id == project_id, Project.user_id == user_id)
    )
    return result.scalar_one_or_none()


def to_out(row: BoardContextBundle) -> BoardContextOut:
    """行 → wire。`itemCount` 由 items 长度算出，不额外存一列。"""
    return BoardContextOut(
        id=row.id,
        project_id=row.project_id,
        label=row.label,
        source=row.source,
        selection_mode=row.selection_mode,
        item_count=len(row.items or []),
        created_at=row.created_at,
        items=[BoardContextItemIn.model_validate(item) for item in (row.items or [])],
    )


async def create_bundle(
    db: AsyncSession, *, user_id: uuid.UUID, payload: BoardContextIn
) -> BoardContextBundle:
    """收下一次投送。被拒的理由全部写清楚（见模块开头的三个不变量）。"""
    if (
        await _owned_project_id(db, user_id=user_id, project_id=payload.project_id)
        is None
    ):
        raise ContextRefused("project_not_found", status=404)
    if not payload.items:
        raise ContextRefused("empty_selection")
    if len(payload.items) > MAX_ITEMS:
        raise ContextRefused("too_many_items")
    if not any(item.text.strip() for item in payload.items):
        raise ContextRefused("no_readable_text")

    row = BoardContextBundle(
        project_id=payload.project_id,
        user_id=user_id,
        label=(payload.label or "").strip() or None,
        source=payload.source,
        selection_mode=payload.selection_mode,
        bounding_box=payload.bounding_box,
        # 存 camelCase（与 wire 一致）：读回、渲染、调试看到的都是同一套键。
        items=[item.model_dump(by_alias=True) for item in payload.items],
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return row


async def get_bundle(
    db: AsyncSession, *, user_id: uuid.UUID, bundle_id: uuid.UUID
) -> BoardContextBundle | None:
    """别人的包一律当作不存在（404），不枚举、不区分"存在但没权限"。"""
    result = await db.execute(
        select(BoardContextBundle).where(
            BoardContextBundle.id == bundle_id,
            BoardContextBundle.user_id == user_id,
        )
    )
    return result.scalar_one_or_none()


async def load_for_turn(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    project_id: uuid.UUID | None,
    bundle_ids: list[uuid.UUID],
) -> list[BoardContextBundle]:
    """这一轮要注入的材料，**按用户给的顺序**（他在画板上选的次序有意义）。

    任何一个取不到、或不属于这个空间，就整体拒绝：不做"静默忽略"。
    用户以为带上了、实际没带上，比一句报错糟得多 —— 他会照着不存在的前提问下去。
    """
    if not bundle_ids:
        return []
    if project_id is None:
        # 材料属于某个空间；一段没有空间的对话引用不了它。
        raise ContextRefused("context_not_found")

    unique_ids = list(dict.fromkeys(bundle_ids))
    result = await db.execute(
        select(BoardContextBundle).where(
            BoardContextBundle.id.in_(unique_ids),
            BoardContextBundle.user_id == user_id,
        )
    )
    rows = {row.id: row for row in result.scalars()}
    if len(rows) != len(unique_ids):
        raise ContextRefused("context_not_found")
    if any(row.project_id != project_id for row in rows.values()):
        raise ContextRefused("context_not_found")
    return [rows[bundle_id] for bundle_id in unique_ids]


def render_selection_block(bundles: list[BoardContextBundle]) -> str:
    """把这一轮的材料渲染成提示词里的一段。空列表 → 空串（不占位）。

    文风沿用 `ai/knowledge/state.summarize()`：**先给事实，再给一条不许越界的纪律**。
    纪律那半句是这段的重点 —— 几份材料一起丢进去，模型最可能的失败是猜错意图然后自信地答。
    """
    if not bundles:
        return ""

    lines: list[str] = ["## 用户投送的材料（他亲手从画板上选的）"]
    for bundle in bundles:
        heading = bundle.label or "未命名的一组"
        items = bundle.items or []
        lines.append(f"**{heading}**（{len(items)} 项）")

        # 形状 id → 短标签，供写"连接"时用（人读的是文本，不是 id）。
        by_id: dict[str, str] = {}
        for item in items:
            text = (item.get("text") or "").strip()
            by_id[str(item.get("shapeId"))] = text[:24] or str(item.get("shapeId"))

        for item in items:
            text = (item.get("text") or "").strip()
            if not text:
                # 读不出内容的形状不写进提示词 —— 但它的连接关系仍然可能有用，
                # 所以这里只是跳过这一行，不是跳过整个形状。
                continue
            mastery = item.get("mastery")
            suffix = (
                f"（掌握度：{MASTERY_LABELS[mastery]}）"
                if mastery in MASTERY_LABELS
                else ""
            )
            lines.append(f"- [{item.get('type')}] {text}{suffix}")

        # 只写这批材料**内部**的连接：指向材料之外的线，对这次提问没有意义。
        links: list[str] = []
        seen: set[tuple[str, str]] = set()
        for item in items:
            source = str(item.get("shapeId"))
            for target in item.get("connectedIds") or []:
                target = str(target)
                key = tuple(sorted((source, target)))
                if target in by_id and source in by_id and key not in seen:
                    seen.add(key)
                    links.append(f"{by_id[source]} ↔ {by_id[target]}")
        if links:
            lines.append(
                "它们之间的连接：" + "；".join(links[:MAX_RENDERED_LINKS])
            )

    lines.append(
        "（这些是他亲手选给你的。只基于它们回答，不要推断清单以外的东西；"
        "需要更多材料时，请他再选一次。）"
    )
    return "\n".join(lines)
