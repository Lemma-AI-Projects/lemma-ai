"""Board snapshot persistence for Learn Space (tldraw board state).

权责边界（承接「画板底层全铺」的空间定位，P0）：
- project 是 learn space 的根：snapshot 以 project_id 为主键 1:1 挂在其下，
  project 删除时 CASCADE 清理，不残留孤儿数据。
- snapshot 是整份 tldraw TLEditorSnapshot（document + assets），后端仅做
  opaque 存取、不解析内容——真实权威始终存于前端编辑器。
- 归属校验不在表层面（与 projects/desmos_graphs 一致，不设 RLS，经 FastAPI
  访问），由后端 IDOR（_owned_or_404 约束 project 必属当前用户）保证写读。
"""

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import ForeignKey, func
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP, UUID
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base


class BoardSnapshot(Base):
    __tablename__ = "board_snapshots"

    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        primary_key=True,
    )
    snapshot: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )