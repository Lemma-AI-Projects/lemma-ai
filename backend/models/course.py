import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import CheckConstraint, ForeignKey, Index, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP, UUID
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base


class Course(Base):
    """A course in the course library (课程库：课程).

    Only services/course_library reads or writes this table; everyone else
    goes through its actions and queries.

    Deletion is soft (拍板: 只记删除时刻，内容留着): the delete action sets
    deleted_at and keeps every row. Hard deletion happens only through the
    profiles FK CASCADE when the account itself is removed.

    Status (建课中 / 已确认), lesson numbers, weights and prerequisites are
    derived on read and never stored here.
    """

    __tablename__ = "courses"
    __table_args__ = (
        CheckConstraint("volume in ('light', 'medium', 'deep')", name="ck_courses_volume"),
        CheckConstraint("name <> ''", name="ck_courses_name_not_empty"),
        # "this user's courses" lists: WHERE user_id ORDER BY updated_at DESC.
        Index("ix_courses_user_id_updated_at", "user_id", "updated_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("profiles.id", ondelete="CASCADE"),
        nullable=False,
    )
    volume: Mapped[str] = mapped_column(String, nullable=False)
    # 课程需求.原话, verbatim. The library stores it and never interprets it.
    original_request: Mapped[str] = mapped_column(Text, nullable=False)
    # 课程需求.问答对: [{"question": ..., "answer": ...}, ...] in order.
    # NULL = not written yet; the whole list is replaced on every write.
    qa_pairs_json: Mapped[list[dict[str, Any]] | None] = mapped_column(
        JSONB, nullable=True
    )
    # Written together with the syllabus; NULL before that.
    name: Mapped[str | None] = mapped_column(String, nullable=True)
    confirmed_at: Mapped[datetime | None] = mapped_column(
        TIMESTAMP(timezone=True), nullable=True
    )
    deleted_at: Mapped[datetime | None] = mapped_column(
        TIMESTAMP(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
