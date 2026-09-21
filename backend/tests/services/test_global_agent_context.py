"""Space Context → Global Agent → Response, end to end and off the network.

Three things are asserted, in the order they happen:

1. the prompt the agent is given contains the space's material — its sources,
   bounded excerpts of them, and the rules that forbid inventing the rest;
2. the stream that comes back reaches the caller, chunk by chunk;
3. the digest emitted for the UI matches what was persisted, and names the
   action the turn actually took.

The model is stubbed and no database is touched. Both are deliberate: the seam
under test is ours (`chat_service.stream_turn` + the agent-context assembly),
and a test that calls a provider or needs a live Postgres fails for reasons that
have nothing to do with this code. The live version — real rows, real model —
is a separate harness (`space-context` in the plan's verification list).
"""

import asyncio
import uuid
from datetime import UTC, datetime

from ai import AIChunk, AIUseCase
from ai.prompts.space_context import (
    EXCERPT_TOTAL_CHARS,
    SpaceConversationRef,
    SpaceExcerptRef,
    SpaceSourceRef,
    render_space_context,
)
from services import chat_service, conversation_service
from services.agent_context_service import AgentContext, summarise_digest
from services.chat_service import TurnContext

SOURCES = [
    SpaceSourceRef(
        id="s1", title="Linear Algebra Notes", kind="imported", chars=1800, excerpted=True
    ),
    SpaceSourceRef(
        id="s2", title="Eigenvalue Notes", kind="imported", chars=900, excerpted=True
    ),
    SpaceSourceRef(
        id="s3", title="Research Roadmap", kind="note", chars=400, excerpted=False
    ),
]

EXCERPTS = [
    SpaceExcerptRef(
        source_id="s1",
        title="Linear Algebra Notes",
        text="A matrix is a linear map between vector spaces.",
    ),
    SpaceExcerptRef(
        source_id="s2",
        title="Eigenvalue Notes",
        text="Av = lambda v defines an eigenvector.",
        truncated=True,
    ),
]

OTHER_CONVERSATIONS = [
    SpaceConversationRef(id="c9", title="eigenvector intuition", message_count=4)
]


def build_context() -> AgentContext:
    return AgentContext(
        space_id=uuid.uuid4(),
        space_name="AI for Math",
        sources=SOURCES,
        excerpts=EXCERPTS,
        conversations=OTHER_CONVERSATIONS,
        history_messages=6,
        prompt_block=render_space_context(
            space_name="AI for Math",
            sources=SOURCES,
            excerpts=EXCERPTS,
            conversations=OTHER_CONVERSATIONS,
            history_messages=6,
        ),
    )


# ---------------------------------------------------------------------------
# 1 · the prompt
# ---------------------------------------------------------------------------


def test_prompt_carries_the_space_material():
    block = build_context().prompt_block
    assert "AI for Math" in block
    # Every source is listed, with its size, so the model can answer "what is in
    # this space" without calling anything.
    for title in ("Linear Algebra Notes", "Eigenvalue Notes", "Research Roadmap"):
        assert title in block
    # The excerpts are the point: "uses the space" must not depend on whether the
    # model decides to call read_page.
    assert "A matrix is a linear map" in block
    assert "Av = lambda v" in block
    assert "[truncated]" in block
    assert str(EXCERPT_TOTAL_CHARS) in block


def test_prompt_forbids_inventing_what_it_does_not_have():
    block = build_context().prompt_block
    assert "TITLES ONLY" in block
    assert "Never invent sources" in block


def test_empty_space_still_says_something():
    """Silence reads as "unknown"; "this space is empty" is a usable fact."""
    block = render_space_context(
        space_name="New Space",
        sources=[],
        excerpts=[],
        conversations=[],
        history_messages=0,
    )
    assert "(empty)" in block
    assert "save_note" in block


# ---------------------------------------------------------------------------
# 2 + 3 · the turn
# ---------------------------------------------------------------------------


class _StubClient:
    """Stands in for the AI facade: records the call, replays fixed chunks."""

    def __init__(self, chunks: list[AIChunk]) -> None:
        self.chunks = chunks
        self.calls: list[dict] = []

    async def stream_chat(self, use_case, messages, **kwargs):
        self.calls.append({"use_case": use_case, "messages": messages, **kwargs})
        for chunk in self.chunks:
            yield chunk


def _turn_context() -> TurnContext:
    return TurnContext(
        conversation_id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        user_content="这个空间里有什么？",
        user_sent_at=datetime.now(UTC),
        history=[],
        project_id=uuid.uuid4(),
    )


def _run_turn(monkeypatch, chunks: list[AIChunk]):
    """Returns (chunks yielded, what the facade was called with, what was persisted)."""
    stub = _StubClient(chunks)
    persisted: dict = {}
    context = build_context()

    async def fake_persist_turn(**kwargs):
        persisted.update(kwargs)

    async def fake_load_agent_context(_turn: TurnContext):
        return context

    monkeypatch.setattr(chat_service, "ai_client", stub)
    monkeypatch.setattr(conversation_service, "persist_turn", fake_persist_turn)
    monkeypatch.setattr(
        chat_service, "_load_agent_context", fake_load_agent_context
    )

    async def run():
        return [chunk async for chunk in chat_service.stream_turn(_turn_context())]

    return asyncio.run(run()), stub.calls[0], persisted


def test_turn_sends_the_space_to_the_model_and_returns_the_answer(monkeypatch):
    chunks, call, persisted = _run_turn(
        monkeypatch,
        [
            AIChunk(kind="delta", text="这个空间里有 "),
            AIChunk(kind="delta", text="三份资料。"),
            AIChunk(kind="done"),
        ],
    )

    # 1 · the model was told about the space
    assert call["use_case"] is AIUseCase.TEXT_CHAT
    space_block = call["prompt_vars"]["space_context"]
    assert "Linear Algebra Notes" in space_block
    assert "A matrix is a linear map" in space_block
    assert call["messages"][-1].content == "这个空间里有什么？"

    # 2 · and the answer came back
    kinds = [chunk.kind for chunk in chunks]
    assert kinds == ["delta", "delta", "context", "done"]
    assert "".join(chunk.text or "" for chunk in chunks) == "这个空间里有 三份资料。"

    # 3 · the digest matches the space, and says what the turn did
    digest = next(chunk.context for chunk in chunks if chunk.kind == "context")
    assert [source["title"] for source in digest["sources"]] == [
        "Linear Algebra Notes",
        "Eigenvalue Notes",
        "Research Roadmap",
    ]
    assert digest["action"] == "answer"
    assert digest["historyMessages"] == 6

    # …and that is the same object that was written to the message row
    assert persisted["agent_context"] == digest
    assert persisted["assistant_content"] == "这个空间里有 三份资料。"


def test_turn_reports_the_action_a_tool_took(monkeypatch):
    """A turn that attached a card must not claim it just answered."""
    chunks, _call, persisted = _run_turn(
        monkeypatch,
        [
            AIChunk(kind="delta", text="画好了。"),
            AIChunk(kind="tool", tool={"type": "desmos_graph", "graphId": "g1"}),
            AIChunk(kind="done"),
        ],
    )
    digest = next(chunk.context for chunk in chunks if chunk.kind == "context")
    assert digest["action"] == "desmos_graph"
    assert persisted["tool_ref"] == {"type": "desmos_graph", "graphId": "g1"}


def test_digest_restamping_keeps_the_rest_of_the_facts():
    """The action is only known at the end, so the digest is re-stamped, not rebuilt."""
    original = build_context().digest()
    restamped = summarise_digest(original, action="save_note")
    assert restamped["action"] == "save_note"
    assert restamped["sources"] == original["sources"]
