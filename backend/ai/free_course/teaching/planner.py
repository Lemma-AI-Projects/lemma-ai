"""Teaching runtime · planner: chapter -> a teachable session, and then keep going.

Two model calls, and they are two because they have opposite cost profiles: the
opening plan is a thinking call made once (and can afford a slower, stronger
model), while every later turn happens in front of the learner and has to feel
immediate. Keeping them separate use cases means the routing table can point
them at different models later without touching this file.

What this module *is* responsible for is the part a prompt cannot guarantee:
every plan is bounded before it reaches the learner (零信任, same discipline as
content.py) — a step whose narration is empty, an action with no geometry, a
`move` that names nothing, a cue pointing at a sentence that does not exist, or
a session that never asks anything, are all refused or repaired here. A session
that teaches without ever stopping to ask would silently lose the one behaviour
the whole feature exists for.
"""

from ai.client import ai_client
from ai.errors import FreeCourseError
from ai.free_course.sources import SourceMaterial
from ai.free_course.teaching.types import (
    MAX_ACTIONS_PER_STEP,
    MAX_BLOCKS_PER_STEP,
    MAX_NARRATION_CHARS,
    MAX_STEPS_PER_PLAN,
    BoardAction,
    BoardBlock,
    SessionSignal,
    SessionStepRef,
    TeachingQuestion,
    TeachingSessionPlan,
    TeachingStep,
    TeachingTurn,
)
from ai.free_course.types import LearningObject
from ai.types import AIUseCase

_SENTENCE_END = "。！？!?…"
_BODY_CHARS = 900
_NARRATION_STEPS = 2600

__all__ = ["plan_session", "respond_to", "split_sentences"]


def split_sentences(text: str) -> list[str]:
    """Split narration into the timeline's units.

    The frontend implements exactly this rule (session/sentences.ts) and the two
    must agree, because `cue` indexes into this list: if they disagreed, the
    board would fire on the wrong beat — or on nothing at all.

    ASCII "." only ends a sentence when whitespace or the end of the string
    follows. That is the deliberate exception: narration is full of decimals and
    abbreviations ("x = 0.5", "e.g."), and splitting on those would produce
    beats too short to hear.
    """
    out: list[str] = []
    buf: list[str] = []
    for index, char in enumerate(text):
        if char == "\n":
            piece = "".join(buf).strip()
            if piece:
                out.append(piece)
            buf = []
            continue
        buf.append(char)
        ends = char in _SENTENCE_END or (
            char == "."
            and (index + 1 >= len(text) or text[index + 1].isspace())
        )
        if ends:
            piece = "".join(buf).strip()
            if piece:
                out.append(piece)
            buf = []
    piece = "".join(buf).strip()
    if piece:
        out.append(piece)
    return out or ([text.strip()] if text.strip() else [])


async def plan_session(
    *,
    lesson_title: str,
    objective: str,
    sequence: list[str],
    objects: list[LearningObject],
    material: SourceMaterial | None = None,
    user_id: str | None = None,
) -> TeachingSessionPlan:
    """Open a teaching session for one chapter.

    The lesson's own objects are the input, not a re-ask of the topic: the
    chapter was already planned and written, and the session is a *different
    rendering* of the same content — a teacher at a board instead of a document
    to read. Letting the model re-invent the content here would make the two
    disagree in front of the learner.

    One retry, and only for a plan that breaks the session's shape. The shape is
    not a style preference: a session with no open question loses the "would you
    feel for the slope with your feet?" beat, and one with no Quick Check loses
    the graded one — both are the acceptance criteria, and both are things a
    prompt asks for but cannot guarantee. A second attempt costs one call and
    happens only when the first came back wrong, which is cheaper and more
    honest than shipping a session that is missing half the behaviour.
    """
    prompt = (
        f"本节课：{lesson_title}\n学习目标：{objective}\n"
        + (f"教学环节：{'；'.join(sequence)}\n" if sequence else "")
        + f"\n本节已有的学习内容（请把它讲出来，不要另起炉灶）：\n{_digest_objects(objects)}"
    )
    complaint = ""
    last_error = "unknown"
    for _attempt in range(2):
        plan = await ai_client.generate(
            AIUseCase.FREE_COURSE_SESSION,
            prompt + complaint,
            TeachingSessionPlan,
            user_id=user_id,
        )
        try:
            return _bound_plan(plan)
        except FreeCourseError as exc:
            last_error = str(exc)
            complaint = (
                f"\n\n上一次的输出不能用：{exc}。请重新生成整份教学会话，并确保："
                "①至少 1 个 step 用 open 提问（具体、能想象出画面的问题）；"
                "②至少 1 个 step 用 choice 提问（2–4 个选项 + answer）；"
                "③至少有一条 move 动作，让你已经画出来的东西真的动起来"
                "（小球滚下坡、点沿曲线滑、参数沿轴移动）；"
                "④至少有一条 awaitClick 动作，`target` 指向你先前画出来、"
                "并且给了 `id` 的那个元素（让他点一下才继续）。这四条必须都满足。"
            )
    # The last specific reason travels out with the generic one: without it a
    # 409 on screen says nothing about which of the four shape requirements the
    # model kept missing.
    raise FreeCourseError(f"teaching session could not be planned: {last_error}")


async def respond_to(
    *,
    lesson_title: str,
    objective: str,
    taught: list[SessionStepRef],
    signal: SessionSignal,
    question: TeachingQuestion | None = None,
    learner_answer: str | None = None,
    verdict: str | None = None,
    user_id: str | None = None,
) -> TeachingTurn:
    """React to what the learner did, then continue the session.

    `verdict` carries the local decision for a choice question (the service
    compares option ids, exactly like FreeCourseObservation does) so the model
    explains rather than grades — a model hiccup must never turn a right answer
    into a wrong one. Open questions arrive with verdict=None and the model
    judges them against the question's own `expected` rubric.

    `learner_answer` is what the learner actually said or picked, as text. The
    verdict alone is not enough to correct anything: "you got it wrong" without
    "you picked a, and here is why b is right" is not the short correction the
    reference product gives — and a model that cannot see the choice tends to
    react as if nothing had been answered at all.
    """
    already = "\n".join(
        f"- {step.title or step.id}：{step.narration}{_q(step)}" for step in taught
    ) or "（还没有讲过什么）"

    if signal.kind == "confused":
        instruction = (
            "学习者说没听懂。**换一种讲法**（换角度、换类比，或改用更形式化的方式），"
            "并**重建白板**：不要复读刚才那块板的动作，换成新的图解。"
            "不要回到更基础的前置内容去，也不要道歉寒暄。给 1 到 2 个新 step。"
        )
    elif signal.kind == "interrupt":
        instruction = (
            "学习者按了 Stop 打断了讲解，问了一个自己的问题。"
            "**第一个 step 就是回答它**（narration 直接回答，不要先复述进度），"
            "可以在白板上为它画一小块东西；回答完，再用一个 step 接回主线。"
        )
    else:
        instruction = (
            "学习者回答了上一个问题。先给**简短**反馈（1 到 3 句，就事论事），"
            "然后继续讲下一步内容。按观察到的行为：答错只做「即错即纠」，"
            "**不要**退回到前置内容、也不要重画白板。给 1 到 2 个新 step。"
        )

    question_block = ""
    if question is not None:
        question_block = f"\n上一个问题（{question.kind}）：{question.prompt}"
        if question.expected:
            question_block += f"\n参考答案要点：{question.expected}"
        if question.kind == "choice" and question.options:
            question_block += "\n选项：" + "；".join(
                f"{option.id}. {option.text}" for option in question.options
            )
    answer_block = f"\n学习者的作答：{learner_answer}" if learner_answer else ""
    verdict_block = (
        f"\n系统已判定这次作答：{verdict}。"
        "判定为 correct 时给肯定、不要纠正；否则**指出他错在哪里**并给出正确的说法"
        "（不要改变判定）。"
        if verdict
        else (
            "\n请你判定这次作答（correct / partial / incorrect），"
            "按参考答案要点判断，判定要保守：只有确实答对才给 correct。"
            if signal.kind == "answer"
            else ""
        )
    )

    prompt = (
        f"本节课：{lesson_title}\n学习目标：{objective}\n"
        f"\n已经讲过的 step（不要重复它们的说法）：\n{already}\n"
        f"{question_block}\n"
        f"\n学习者的输入：{signal.text or '（没有输入，只是按了 Stop）'}"
        f"{answer_block}{verdict_block}\n\n{instruction}"
    )
    turn = await ai_client.generate(
        AIUseCase.FREE_COURSE_SESSION_TURN, prompt, TeachingTurn, user_id=user_id
    )
    return _bound_turn(turn)


# --- zero-trust bounding ----------------------------------------------------


def _q(step: SessionStepRef) -> str:
    return f"（提问：{step.question}）" if step.question else ""


def _digest_objects(objects: list[LearningObject]) -> str:
    if not objects:
        return "（本节还没有生成内容对象）"
    lines = []
    for obj in objects[:MAX_ACTIONS_PER_STEP // 2]:
        body = " ".join(obj.body.split())[:_BODY_CHARS]
        answer = obj.payload.answer if obj.payload else None
        options = obj.payload.options if obj.payload else []
        extra = ""
        if options:
            extra = "｜选项：" + "；".join(f"{o.id}. {o.text}" for o in options)
            if answer:
                extra += f"｜正确答案：{answer}"
        elif obj.payload and obj.payload.expected:
            extra = f"｜参考要点：{obj.payload.expected}"
        lines.append(f"[{obj.kind}] {obj.title}\n{body}{extra}")
    return "\n\n".join(lines)


def _bound_plan(plan: TeachingSessionPlan) -> TeachingSessionPlan:
    steps = _bound_steps(plan.steps)
    if not steps:
        raise FreeCourseError("teaching session has no usable step")
    kinds = {step.question.kind for step in steps if step.question is not None}
    # Both stopping points are the feature, not decoration: the open question is
    # the observed "what would you feel for with your feet?", the choice one is
    # the observed Quick Check. A session with a single kind has dropped half of
    # what is being reproduced, so it is refused rather than shipped.
    if "open" not in kinds:
        raise FreeCourseError("teaching session has no open question")
    if "choice" not in kinds:
        raise FreeCourseError("teaching session has no quick check")
    # Motion is one of the six behaviours being reproduced (the reference
    # session's signature moment is the red ball rolling down the loss surface),
    # and it is the first thing a model drops when it gets busy with layout —
    # observed, twice. A session of entirely static figures has lost it, so it
    # gets the same treatment as the two question kinds. Downside, recorded
    # honestly: a genuinely non-spatial topic is nudged into inventing one
    # movement; that is the cheaper error.
    if not any(action.kind == "move" for step in steps for action in _actions_of(step)):
        raise FreeCourseError("nothing moves on the board")
    # And the fourth: the board has to be *touchable* at least once. In the
    # reference session the lesson does not simply play — it stops on a shape the
    # learner is invited to click, and that click is what leads into the next
    # stretch of board and the next question. Same trade as `move`: a plan
    # without it is a video with a voice-over, which is the one thing this
    # feature exists to not be. Dropped by the model far less often than `move`,
    # but it is dropped, so it gets the same guarantee.
    if not any(
        action.kind == "awaitClick" for step in steps for action in _actions_of(step)
    ):
        raise FreeCourseError("nothing on the board waits for the learner to click")
    return TeachingSessionPlan(
        title=plan.title.strip() or "未命名教学会话",
        objective=plan.objective.strip(),
        steps=steps,
    )


def _bound_turn(turn: TeachingTurn) -> TeachingTurn:
    steps = _bound_steps(turn.steps)
    if not steps:
        raise FreeCourseError("teaching turn produced no step")
    return TeachingTurn(
        verdict=turn.verdict,
        feedback=(turn.feedback or "").strip() or None,
        # An award without a correct answer would be a lie about what just
        # happened, and the UI keys the whole card off the verdict.
        award=(turn.award or "").strip() or None
        if turn.verdict == "correct"
        else None,
        steps=steps,
    )


def _bound_steps(raw_steps: list[TeachingStep]) -> list[TeachingStep]:
    steps: list[TeachingStep] = []
    for index, raw in enumerate(raw_steps[:MAX_STEPS_PER_PLAN]):
        narration = raw.narration.strip()[:MAX_NARRATION_CHARS]
        if not narration:
            continue
        cues = len(split_sentences(narration))
        actions = _bound_actions(raw.actions, cues)
        blocks = _bound_blocks(raw.blocks, cues)
        if raw.question is not None and raw.question.kind == "choice":
            # A choice question with no options (or no correct one among them)
            # cannot be graded, and an ungradable Quick Check stops the session
            # dead. Repair to an open question rather than dropping the stop.
            question = _bound_choice(raw.question)
        else:
            question = _bound_open(raw.question)
        steps.append(
            TeachingStep(
                id=(raw.id or "").strip() or f"s{index + 1}",
                title=(raw.title or "").strip() or None,
                narration=narration,
                blocks=blocks,
                actions=actions,
                question=question,
                branch=raw.branch,
            )
        )
    return steps


def _bound_blocks(raw_blocks: list[BoardBlock], cue_count: int) -> list[BoardBlock]:
    """Keep the blocks that can be rendered, drop the rest.

    Per-block repair, never a whole-turn failure: one malformed table is not a
    reason to lose the beat. What gets dropped is what the renderer could not
    draw at all — an empty heading, a table with no columns, a bullet list with
    nothing in it — plus anything beyond `MAX_BLOCKS_PER_STEP`.
    """
    blocks: list[BoardBlock] = []
    for raw in raw_blocks[:MAX_BLOCKS_PER_STEP]:
        kind = raw.kind
        text = (raw.text or "").strip()
        cue = _cue(raw.cue, cue_count)
        if kind in ("heading", "text"):
            if not text:
                continue
            blocks.append(
                BoardBlock(kind=kind, cue=cue, text=text, color=raw.color)
            )
        elif kind == "formula":
            if not text:
                continue
            blocks.append(
                BoardBlock(kind="formula", cue=cue, text=text, color=raw.color)
            )
        elif kind == "bullets":
            items = [item.strip() for item in raw.items if item.strip()]
            if not items:
                continue
            blocks.append(
                BoardBlock(kind="bullets", cue=cue, items=items[:5], color=raw.color)
            )
        elif kind == "definition":
            term = (raw.term or "").strip()
            meaning = (raw.meaning or "").strip()
            # A definition is the pair; half of it is not a definition.
            if not term or not meaning:
                continue
            blocks.append(
                BoardBlock(
                    kind="definition",
                    cue=cue,
                    term=term,
                    meaning=meaning,
                    color=raw.color,
                )
            )
        elif kind == "table":
            columns = [column.strip() for column in raw.columns if column.strip()]
            if not columns:
                continue
            rows = [
                [cell.strip() for cell in row][: len(columns)]
                for row in raw.rows
                if any(cell.strip() for cell in row)
            ]
            if not rows:
                continue
            # Pad short rows rather than dropping them: a missing cell is a typo,
            # an absent row is missing content.
            rows = [row + [""] * (len(columns) - len(row)) for row in rows]
            blocks.append(
                BoardBlock(
                    kind="table",
                    cue=cue,
                    columns=columns,
                    rows=rows[:8],
                    color=raw.color,
                )
            )
        elif kind == "figure":
            # Figure geometry is the same action language as before, only in
            # 0..1 block-local coordinates — so it gets the same bounding.
            actions = _bound_actions(raw.actions, cue_count)
            if not actions:
                continue
            blocks.append(
                BoardBlock(
                    kind="figure",
                    cue=cue,
                    caption=(raw.caption or "").strip() or None,
                    actions=actions,
                    color=raw.color,
                )
            )
    return blocks


def _actions_of(step: TeachingStep) -> list[BoardAction]:
    """Every action a step puts on the board, wherever it sits.

    Motion and the clickable moment live inside `figure` blocks now, so the
    plan-level guarantees below have to look there too — otherwise a session
    built entirely from blocks would look like it never moves.
    """
    actions = list(step.actions)
    for block in step.blocks:
        if block.kind == "figure":
            actions.extend(block.actions)
    return actions


def _bound_actions(raw_actions: list[BoardAction], cue_count: int) -> list[BoardAction]:
    actions: list[BoardAction] = []
    ids: set[str] = set()
    for raw in raw_actions[:MAX_ACTIONS_PER_STEP]:
        kind = raw.kind
        text = (raw.text or "").strip()
        if kind == "pause":
            actions.append(BoardAction(kind="pause", cue=_cue(raw.cue, cue_count)))
            continue
        if kind == "awaitClick":
            # A click with nothing to click would stall the lesson with no way
            # out — the one failure this feature cannot recover from, since the
            # timeline is stopped and the learner is waiting for a prompt that
            # will never come. So a targetless awaitClick is dropped, not kept.
            if not (raw.target or "").strip():
                continue
            actions.append(
                BoardAction(
                    kind="awaitClick",
                    target=raw.target.strip(),
                    text=text or None,
                    color=raw.color,
                    cue=_cue(raw.cue, cue_count),
                )
            )
            continue
        if kind in ("write", "label"):
            if not text:
                continue
        elif kind == "highlight":
            if not text and len(raw.points) < 2 and raw.at is None:
                continue
        elif kind == "draw":
            if not raw.points and raw.at is None:
                continue
            if len(raw.points) < 2 and raw.at is None and raw.to is None:
                continue
        elif kind == "move":
            # A move that names nothing has no subject; the player would either
            # guess or no-op, and both are worse than not doing it.
            if not (raw.target or raw.id):
                continue
        action = BoardAction(
            kind=kind,
            shape=raw.shape,
            at=raw.at,
            to=raw.to,
            points=raw.points[:64],
            text=text or None,
            color=raw.color,
            size=raw.size,
            id=(raw.id or "").strip() or None,
            target=(raw.target or "").strip() or None,
            duration_ms=raw.duration_ms,
            cue=_cue(raw.cue, cue_count),
        )
        if action.id:
            if action.id in ids:
                action.id = None
            else:
                ids.add(action.id)
        # A move's target is deliberately NOT required to be an id defined in
        # this same step. The board accumulates across steps, so "roll the ball
        # I drew two beats ago" is the normal case — and a turn legitimately
        # moves something from a step it never saw. The player treats an
        # unresolvable target as a no-op, which is the right failure: a move
        # that does nothing is invisible, while dropping it here would silently
        # delete the motion the whole beat was about.
        actions.append(action)
    return actions


def _cue(raw_cue: int, cue_count: int) -> int:
    if cue_count <= 0:
        return 0
    return max(0, min(cue_count - 1, raw_cue))


def _bound_choice(question: TeachingQuestion) -> TeachingQuestion:
    options = [option for option in question.options if option.text.strip()]
    answer = (question.answer or "").strip()
    if len(options) >= 2 and any(option.id == answer for option in options):
        return TeachingQuestion(
            kind="choice",
            prompt=question.prompt.strip(),
            options=options,
            answer=answer,
            hint=(question.hint or "").strip() or None,
        )
    # Ungradable as a choice — ask it as an open question instead of dropping
    # the stopping point.
    expected = (question.expected or "").strip() or None
    if expected is None and options:
        expected = "；".join(option.text for option in options)
    return TeachingQuestion(
        kind="open",
        prompt=question.prompt.strip(),
        expected=expected,
        hint=(question.hint or "").strip() or None,
    )


def _bound_open(question: TeachingQuestion | None) -> TeachingQuestion | None:
    if question is None:
        return None
    prompt = question.prompt.strip()
    if not prompt:
        return None
    return TeachingQuestion(
        kind="open",
        prompt=prompt,
        expected=(question.expected or "").strip() or None,
        hint=(question.hint or "").strip() or None,
    )
