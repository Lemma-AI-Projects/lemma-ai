"""The `record_evidence` tool's refusal branches — no database needed.

Why these four and not more: everything past the guards is the knowledge
service's job, and that is already covered by tests/services/test_learner_state_db.py.
What is only true HERE is the boundary — the tool must refuse to write when the
turn has no space, when the verdict is not a verdict, when `basis` is invented,
or when no reasoning is given. Each of those, if it slipped through, would put a
row into Learner State that nothing can review afterwards.
"""

from __future__ import annotations

import asyncio
import uuid

from ai import RECORD_EVIDENCE
from ai.tools import ToolCall, ToolResult
from services.conversation_tool_service import build_global_tools

SPACE = uuid.uuid4()


def call(tool: str, **args) -> ToolCall:
    return ToolCall(name=tool, args=args)


async def _first_result(handler, tool_call) -> ToolResult:
    async for item in handler(tool_call):
        if isinstance(item, ToolResult):
            return item
    raise AssertionError("handler produced no result")


def run_evidence(*, project_id, **args) -> dict:
    tools = build_global_tools(
        user_id=uuid.uuid4(), conversation_id=None, project_id=project_id
    )
    handler = next(b.handler for b in tools if b.spec.name == RECORD_EVIDENCE)
    result = asyncio.run(_first_result(handler, call(RECORD_EVIDENCE, **args)))
    return result.response


def test_no_space_means_no_write():
    response = run_evidence(
        project_id=None, item="矩阵基础", verdict="correct", reasoning="2×2 乘法算对"
    )
    assert response["status"] == "no_space"


def test_an_unknown_verdict_is_refused():
    # "maybe" is not a verdict; the state has exactly three values and two of
    # them can come from a human answering a question.
    response = run_evidence(project_id=SPACE, item="矩阵基础", verdict="maybe")
    assert response["status"] == "invalid"


def test_an_invented_basis_is_refused():
    response = run_evidence(
        project_id=SPACE,
        item="矩阵基础",
        verdict="correct",
        basis="guessed",
        reasoning="看起来对",
    )
    assert response["status"] == "invalid"


def test_evidence_without_reasoning_is_refused():
    # Both tiers require it: verified must name the fact it checked against,
    # judged must state the rubric. An unreviewable verdict is not evidence.
    response = run_evidence(project_id=SPACE, item="矩阵基础", verdict="correct")
    assert response["status"] == "invalid"
