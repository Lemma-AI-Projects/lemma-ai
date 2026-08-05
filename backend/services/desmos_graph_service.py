"""Desmos graph persistence and ownership.

Owns the DesmosGraph ORM. Same IDOR red line as every other domain: any
query by id MUST also filter by user_id — "not yours" and "not there" are both
None -> 404.

The read-back path (read_current_graph tool) resolves "the conversation's
latest graph" through the ai_messages tool_json chain, NOT by querying
desmos_graphs.conversation_id: tool_json is the authoritative message->graph
link (and first-turn graphs legitimately have conversation_id NULL).
"""

import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.ai_conversation import AiMessage
from models.desmos_graph import DesmosGraph


async def create_graph(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    conversation_id: uuid.UUID | None,
    ai_params: dict[str, Any],
    kind: str = "2d",
) -> DesmosGraph:
    """Create a graph from a VALIDATED AI payload (the tool handler's write).

    conversation_id may be None on a new conversation's first turn (the
    conversation row lands with persist_turn); the message tool_json carries
    the link either way. `kind` records which calculator renders it.
    """
    graph = DesmosGraph(
        user_id=user_id,
        conversation_id=conversation_id,
        ai_params_json=ai_params,
        kind=kind,
    )
    db.add(graph)
    await db.commit()
    await db.refresh(graph)
    return graph


async def get_owned_graph(
    db: AsyncSession, *, user_id: uuid.UUID, graph_id: uuid.UUID
) -> DesmosGraph | None:
    result = await db.execute(
        select(DesmosGraph).where(
            DesmosGraph.id == graph_id, DesmosGraph.user_id == user_id
        )
    )
    return result.scalar_one_or_none()


async def update_user_edit(
    db: AsyncSession,
    graph: DesmosGraph,
    *,
    state: dict[str, Any],
    expressions: list[dict[str, Any]],
) -> DesmosGraph:
    """Save a user edit: opaque state (rehydrate truth) + expression snapshot
    (the model-readable truth). Always written together so read_current_graph
    never sees a stale snapshot of a newer state."""
    graph.state_json = state
    graph.expressions_json = expressions
    await db.commit()
    await db.refresh(graph)
    return graph


# Both card types link a message to a desmos_graphs row (2D and 3D share the
# table; the row's `kind` column is the authority on which calculator it is).
_GRAPH_TOOL_TYPES = frozenset({"desmos_graph", "desmos_3d_graph"})


async def find_latest_graph_id(
    db: AsyncSession, *, conversation_id: uuid.UUID
) -> uuid.UUID | None:
    """The conversation's newest graph id (2D or 3D) via the tool_json chain.

    Scans the conversation's messages newest-first for a graph tool ref.
    Rides the (conversation_id, created_at) composite index; tool turns are
    rare so the scan short-circuits quickly in practice.
    """
    result = await db.execute(
        select(AiMessage.tool_json)
        .where(
            AiMessage.conversation_id == conversation_id,
            AiMessage.tool_json.isnot(None),
        )
        .order_by(AiMessage.created_at.desc())
    )
    for tool_json in result.scalars():
        if isinstance(tool_json, dict) and tool_json.get("type") in _GRAPH_TOOL_TYPES:
            raw_id = tool_json.get("graphId")
            try:
                return uuid.UUID(str(raw_id))
            except (ValueError, TypeError):
                continue
    return None


async def read_graph_snapshot(
    db: AsyncSession, *, user_id: uuid.UUID, graph_id: uuid.UUID
) -> dict[str, Any] | None:
    """The model-readable content of an owned graph (read_current_graph tool).

    Prefers the user-edited expression snapshot; falls back to the AI params'
    expressions when the user never edited. `kind` rides along so the model
    knows which render tool matches this graph. None -> not owned / gone.
    """
    graph = await get_owned_graph(db, user_id=user_id, graph_id=graph_id)
    if graph is None:
        return None
    if graph.expressions_json:
        return {
            "kind": graph.kind,
            "source": "user_edited",
            "expressions": graph.expressions_json,
        }
    return {
        "kind": graph.kind,
        "source": "ai_original",
        "expressions": graph.ai_params_json.get("expressions", []),
    }
