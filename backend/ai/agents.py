"""Agent definitions: one tool-less Agent per use case (终稿第七章).

Models are never bound at construction — routing.resolve() supplies them per
run, so "change model = edit config" stays true. The system prompt arrives via
LemmaDeps + dynamic instructions (rendered by prompts/registry in client.py),
keeping prompt ownership out of the framework.

Two families: text/video agents output str (chat/ask_video); the course agents
bind a pydantic output_type for structured generation (client.generate). The
output types live in ai/coursegen/types.py (types-only import, no cycle).
"""

from dataclasses import dataclass
from typing import Any

from pydantic_ai import Agent, RunContext

from ai.coursegen.types import (
    ChapterQueries,
    ComposedCourse,
    CourseOutline,
    Questionnaire,
    VideoSelection,
)
from ai.errors import UnsupportedCapabilityError
from ai.types import AIUseCase


@dataclass
class LemmaDeps:
    system_prompt: str
    user_id: str | None = None
    course_id: str | None = None
    # Phase 3: profile lookups / db handles land here.


def _inject_system_prompt(ctx: RunContext[LemmaDeps]) -> str:
    return ctx.deps.system_prompt


def _build_agent() -> Agent[LemmaDeps, str]:
    agent: Agent[LemmaDeps, str] = Agent(deps_type=LemmaDeps)
    agent.instructions(_inject_system_prompt)
    return agent


def _build_structured_agent(output_type: type[Any]) -> Agent[LemmaDeps, Any]:
    """Agent that returns our pydantic output_type instead of str. The framework
    type stays inside ai/; client.generate hands back the validated instance."""
    agent: Agent[LemmaDeps, Any] = Agent(deps_type=LemmaDeps, output_type=output_type)
    agent.instructions(_inject_system_prompt)
    return agent


text_chat_agent = _build_agent()
# The course-planning intro is a plain streaming-text turn (own prompt only).
course_plan_intro_agent = _build_agent()
# Video agents serve the framework engine path (AI_VIDEO_ENGINE=pydantic_ai);
# the native engine takes the system prompt directly, without an Agent.
video_qa_agent = _build_agent()
video_summary_agent = _build_agent()
video_locate_agent = _build_agent()
# AI 伴学: grounded video Q&A. The native engine streams it (gemini_video); this
# framework agent only serves the pydantic_ai engine path, like the other video
# agents.
course_companion_agent = _build_agent()

_AGENTS: dict[AIUseCase, Agent[LemmaDeps, str]] = {
    AIUseCase.TEXT_CHAT: text_chat_agent,
    AIUseCase.COURSE_PLAN_INTRO: course_plan_intro_agent,
    AIUseCase.VIDEO_QA: video_qa_agent,
    AIUseCase.VIDEO_SUMMARY: video_summary_agent,
    AIUseCase.VIDEO_LOCATE: video_locate_agent,
    AIUseCase.COURSE_COMPANION: course_companion_agent,
}

course_intake_agent = _build_structured_agent(Questionnaire)
# 搜索前置: broad query expansion (reuses the ChapterQueries shape) + compose.
topic_search_agent = _build_structured_agent(ChapterQueries)
course_compose_agent = _build_structured_agent(ComposedCourse)
# Retired by the search-first flow (kept registered for rollback/historical use).
course_outline_agent = _build_structured_agent(CourseOutline)
chapter_query_agent = _build_structured_agent(ChapterQueries)
video_select_agent = _build_structured_agent(VideoSelection)

_STRUCTURED_AGENTS: dict[AIUseCase, Agent[LemmaDeps, Any]] = {
    AIUseCase.COURSE_INTAKE: course_intake_agent,
    AIUseCase.TOPIC_SEARCH: topic_search_agent,
    AIUseCase.COURSE_COMPOSE: course_compose_agent,
    AIUseCase.COURSE_OUTLINE: course_outline_agent,
    AIUseCase.CHAPTER_QUERY: chapter_query_agent,
    AIUseCase.VIDEO_SELECT: video_select_agent,
}


def agent_for(use_case: AIUseCase) -> Agent[LemmaDeps, str]:
    agent = _AGENTS.get(use_case)
    if agent is None:
        raise UnsupportedCapabilityError(
            f"use case '{use_case}' is not implemented yet"
        )
    return agent


def structured_agent_for(use_case: AIUseCase) -> Agent[LemmaDeps, Any]:
    agent = _STRUCTURED_AGENTS.get(use_case)
    if agent is None:
        raise UnsupportedCapabilityError(
            f"use case '{use_case}' has no structured agent"
        )
    return agent
