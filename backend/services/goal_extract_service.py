"""Hear a goal in one sentence the learner just said — or hear nothing.

The counterpart of `services/background_extract_service.py`, and it shares that
module's most important property: **it never writes.** It reads a sentence, asks
the model whether a direction is in it, and hands the reading back to whoever
asked. Whether that reading becomes a goal is the learner's click, not this
call's side effect — creation goes through `services/space_goal_service`, the
one door, and a goal created there starts `draft` anyway.

Two rules worth stating, because they are what keeps this from becoming a system
that invents goals:

  * **One sentence in, no history.** It is deliberately not given the space's
    learner state, its files, or its previous messages. A goal read out of
    context is a goal the learner never said.
  * **"Nothing here" is a result, not a failure.** Most messages contain no
    goal. `None` is what this returns then, and the caller must treat it as an
    ordinary answer.

  * **But "could not read it" is a failure, and says so.** The two must never
    look alike: answering `None` because the model was unreachable would tell
    the learner "your sentence contains no goal" when nobody read it. Hence the
    separate exception — the page can then offer to try again instead of
    quietly implying it understood.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from ai.client import ai_client
from ai.goal_extract import GoalDraft
from ai.types import AIUseCase
from schemas.space_goal import GOAL_MESSAGE_MAX


class GoalExtractUnavailable(Exception):
    """The reading never happened — which is not the same as "nothing there"."""


async def extract_goal(
    message: str,
    *,
    user_id: uuid.UUID | None = None,
    space_name: str | None = None,
    now: datetime | None = None,
) -> GoalDraft | None:
    """`(the goal heard, or None)`.

    `now` is injectable so the relative-date arithmetic ("两个月后") is testable
    without freezing the clock in the prompt only.
    """
    text = (message or "").strip()
    if not text:
        return None
    text = text[:GOAL_MESSAGE_MAX]

    moment = now or datetime.now(UTC)
    today = moment.strftime("%Y-%m-%d %A")
    heading = f"今天是 {today}。\n"
    if space_name:
        # A hint, not a fact: the space's name often names the domain ("TOEFL
        # 冲刺"), which is exactly what `context` wants. The model is told to
        # leave it blank rather than copy the name when the sentence says
        # nothing about where this happens.
        heading += f"这个学习空间叫「{space_name}」，但只有他这句话里真的提到时才据此填 context。\n"
    prompt = f"{heading}学习者说：\n{text}"

    # Not a refusal: the feature being absent. See the module docstring for why
    # this raises instead of returning None.
    try:
        draft: GoalDraft = await ai_client.generate(
            AIUseCase.SPACE_GOAL_EXTRACT,
            prompt,
            GoalDraft,
            user_id=str(user_id) if user_id else None,
        )
    except Exception as exc:  # noqa: BLE001 — any failure means "not read"
        raise GoalExtractUnavailable("goal_extract_unavailable") from exc

    return draft if draft.heard_a_goal() else None
