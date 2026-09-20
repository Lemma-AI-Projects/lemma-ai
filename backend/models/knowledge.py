"""Knowledge-layer tables: the three things Learner State needs.

Why these exist as tables when `04` argued Global Agent needs none: that
argument was about **memory**, whose shape is a document (one page, many
blocks) and therefore fits `pages`/`blocks` exactly. Evidence is not a
document — it is a stream: append-only, high-frequency, and queried by item
and by time. Storing a stream inside a document table treats the constraint
as the goal. See `planning/learner-state-v1-execution-plan.md` §0.1 D12.

Three tables, and no fourth:

  * `knowledge_items`     — one granular topic per row. **Not a question**: a
    question, an explanation or a whiteboard proof is an *instance* of a topic.
  * `knowledge_edges`     — the prerequisite partial order. Read as "being able
    to do `to_item` implies being able to do `from_item`". Must stay acyclic.
  * `knowledge_evidence`  — one verifiable record of one interaction step.
    Append-only; nothing ever updates a row here.

**The learner's state is deliberately not one of them.** State is a pure
function of (items, edges, evidence) — see `ai/knowledge/state.py`. Deleting
any evidence row must be able to change the derived state, and no information
may exist in the state that is not recoverable from these three tables.

Field shapes cross here one-for-one with `ai/knowledge/state` (Item, Edge,
Evidence). `id` is app-generated (same convention as models/course.py).
"""

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP, UUID
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base

ITEM_KINDS = ("concept", "skill", "problem_type")
ITEM_ORIGINS = ("agent_drafted", "user_added", "imported")
ITEM_STATUSES = ("active", "retired")
EDGE_CONFIDENCES = ("agent_drafted", "user_confirmed")
VERDICTS = ("correct", "incorrect", "no_verdict")
EVIDENCE_TIERS = ("A", "B", "C")


def _enum_check(column: str, values: tuple[str, ...], name: str) -> CheckConstraint:
    """Enum guard as a CHECK constraint, built from the tuple above so the two
    can never drift. These tuples are also what the schemas and the service
    layer validate against — one list, three consumers."""
    rendered = ", ".join(f"'{value}'" for value in values)
    return CheckConstraint(f"{column} in ({rendered})", name=name)


class KnowledgeItem(Base):
    """One granular topic of a learn space's knowledge structure.

    `label` is a one-sentence capability ("can solve ax+b=c"), not a title.
    `source_ref` is `{kind: "page" | "lesson_object", id: <uuid>}` — kept
    generic on purpose so a course lesson object can be linked exactly rather
    than by matching concept strings.
    """

    __tablename__ = "knowledge_items"
    __table_args__ = (
        Index("ix_knowledge_items_project_status", "project_id", "status"),
        _enum_check("kind", ITEM_KINDS, "ck_knowledge_items_kind"),
        _enum_check("origin", ITEM_ORIGINS, "ck_knowledge_items_origin"),
        _enum_check("status", ITEM_STATUSES, "ck_knowledge_items_status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    # Same convention as pages: an item belongs to exactly one learn space.
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    label: Mapped[str] = mapped_column(Text, nullable=False)
    kind: Mapped[str] = mapped_column(
        String, nullable=False, server_default="concept"
    )
    source_ref: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB, nullable=True
    )
    origin: Mapped[str] = mapped_column(
        String, nullable=False, server_default="agent_drafted"
    )
    status: Mapped[str] = mapped_column(
        String, nullable=False, server_default="active"
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


class KnowledgeEdge(Base):
    """One prerequisite relation: knowing `to_item` implies knowing `from_item`.

    The graph must be acyclic — a cycle would break the definition of a
    feasible state as a lower set, and therefore the whole derivation. The
    service layer checks before inserting; this table cannot enforce it.
    """

    __tablename__ = "knowledge_edges"
    __table_args__ = (
        Index("ix_knowledge_edges_project", "project_id"),
        Index("ix_knowledge_edges_to_item", "to_item_id"),
        _enum_check("confidence", EDGE_CONFIDENCES, "ck_knowledge_edges_confidence"),
        CheckConstraint(
            "from_item_id <> to_item_id", name="ck_knowledge_edges_no_self_loop"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    # Denormalised so "the structure of one space" is a single indexed read.
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    from_item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("knowledge_items.id", ondelete="CASCADE"),
        nullable=False,
    )
    to_item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("knowledge_items.id", ondelete="CASCADE"),
        nullable=False,
    )
    confidence: Mapped[str] = mapped_column(
        String, nullable=False, server_default="agent_drafted"
    )
    # Structure revision (Phase 5): how many times the evidence contradicted
    # this edge. Built now so the count has a home; not written in Phase 1.
    counterexample_count: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="0"
    )
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )


class KnowledgeEvidence(Base):
    """One verifiable record of one interaction step. Append-only.

    The four things every row must carry, because a bare right/wrong cannot be
    re-attributed later: **which item**, **what the verdict was**, **how it was
    obtained** (`independent` / `hint_used` / `tier`), and **where it came from**
    (`response_ref`).

    `item_id` is nullable on purpose: an interaction may produce evidence
    before a topic row exists, in which case it becomes the topic's origin.
    """

    __tablename__ = "knowledge_evidence"
    __table_args__ = (
        Index(
            "ix_knowledge_evidence_project_user_created",
            "project_id",
            "user_id",
            "created_at",
        ),
        Index("ix_knowledge_evidence_item", "item_id"),
        _enum_check("verdict", VERDICTS, "ck_knowledge_evidence_verdict"),
        _enum_check("tier", EVIDENCE_TIERS, "ck_knowledge_evidence_tier"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    # Carried directly (course_lesson_observations has no user_id and has to
    # walk four joins to reach one).
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("profiles.id", ondelete="CASCADE"),
        nullable=False,
    )
    item_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("knowledge_items.id", ondelete="SET NULL"),
        nullable=True,
    )
    verdict: Mapped[str] = mapped_column(String, nullable=False)
    tier: Mapped[str] = mapped_column(String, nullable=False, server_default="A")
    independent: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="true"
    )
    hint_used: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false"
    )
    # Mandatory for tier B: a rubric judgement that cannot be reviewed is not
    # admissible evidence.
    reasoning: Mapped[str | None] = mapped_column(Text, nullable=True)
    # {kind: "message" | "observation" | "canvas" | "lesson_object", id: <uuid>}
    response_ref: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB, nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )
