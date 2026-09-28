"""Mala 投送包：用户在画板上选中的材料，变成 Agent 的上下文。

**它不解析画板。** 这不是偷懒 —— 仓库里已经有两条边界把"后端自己去读画板"排除掉了：
`POST /board/semantic` 是**无状态**的（前端把裁剪后的形状交上来，后端只回标签与意图），
`board_snapshots` 的 docstring 也写着"后端仅做 opaque 存取、**不解析内容** —— 真实权威
始终存于前端编辑器"。所以这里收下的，就是前端已经算好的语义投影
（文本 / 类型 / 掌握度 / 连接），后端只负责三件事：**存住**、**能读回**、**能被对话引用**。

`items` 存**快照**而不是活引用，理由只有一个：这条链将来要回答"这次决策用了什么"，
而画板是会被改的 —— 当时给 Agent 的东西必须可复现，否则回看历史时上下文与当初不同。
"""

import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, ForeignKey, Index, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP, UUID
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base

#: 投送的来源。`cluster` = 框选正好命中一个语义簇（那它落进去是一张有名字的卡）；
#: `selection` = 用户临时框的一片。区别只在"有没有现成的名字"。
CONTEXT_SOURCES = ("selection", "cluster")

#: 与前端 `SelectionRegion.selectionMode` 同一套词汇，刻意不改名。
SELECTION_MODES = ("rectangle", "lasso")


class BoardContextBundle(Base):
    """一次投送：一个空间里、一个用户选中的一组材料。"""

    __tablename__ = "board_context_bundles"
    __table_args__ = (
        Index("ix_board_context_bundles_project_created", "project_id", "created_at"),
        CheckConstraint(
            "source in ('selection', 'cluster')",
            name="ck_board_context_bundles_source",
        ),
        CheckConstraint(
            "selection_mode in ('rectangle', 'lasso')",
            name="ck_board_context_bundles_selection_mode",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    #: 归属：这个包属于哪个空间（与 `board_snapshots` 同一套做法，CASCADE 清干净）。
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("profiles.id", ondelete="CASCADE"),
        nullable=False,
    )
    #: 群的名字（命中簇时就是簇的标签）。临时框出来的一片可以没有名字。
    label: Mapped[str | None] = mapped_column(Text, nullable=True)
    source: Mapped[str] = mapped_column(
        String, nullable=False, server_default="selection"
    )
    selection_mode: Mapped[str] = mapped_column(
        String, nullable=False, server_default="rectangle"
    )
    #: 选区在画板上的位置，供"回到出处"高亮用。坐标系只有前端知道，后端原样存。
    bounding_box: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    #: 形状的语义投影快照：`[{shapeId, type, text, mastery, connectedIds}]`。
    #: JSONB 而不是子表 —— 它从不被单独查询或索引（与 `board_snapshots`、`blocks.content` 一致）。
    items: Mapped[list[dict]] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )
