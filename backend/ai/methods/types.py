"""The Method layer's vocabulary: one small interface, two implementations.

A **Method** answers one question: *given this learner, this state and this
message, what should the next teaching move be?* It is deliberately not a
runtime, a workflow engine or a plugin ABI — there are exactly two fields of
metadata, one input type, one output type and one function.

Two decisions worth keeping:

- **`execute()` does not call a model.** The chat turn's model call stays where
  it was (`AIUseCase.TEXT_CHAT`, with the Global Agent's tools bound). A Method
  that opened its own model channel would lose `remember` / `record_evidence`,
  which is the whole reason the learner's answers can still become Evidence and
  move Learner State. The Method decides *how to teach*; the pipeline teaches.
- **One input shape for every Method.** If the two methods read different
  structures, a difference in behaviour can no longer be attributed to the
  method — and "the difference comes from the Method, not from different input"
  is the entire acceptance criterion.
"""

from dataclasses import dataclass
from typing import Protocol

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


@dataclass(frozen=True)
class GoalView:
    """The space's direction, as a Method may read it — and only as much of it.

    Read-only, and deliberately not a plan: it says where the learner wants to
    get to and what counts as success there. No progress, no percentage, no
    ranking — the table behind it has no such column, and inventing one here
    would be the Method pretending to know something nobody knows.

    This layer's own copy of the shape rather than `ai.coordinator.GoalFact`:
    the decision layer's vocabulary must not become the method layer's, or the
    two can only drift together. `services/method_service` does the mapping.
    """

    target_text: str
    #: `exam_performance` / `understanding` / `build_something` / `other`.
    #: The load-bearing field: "get the exam right" and "understand why it
    #: works" are different instructions even when they point at one topic.
    purpose: str
    context: str | None = None


#: The purposes a goal can have (`models/space_goal.py`). Kept here as the
#: *method* layer's copy so the tables below can be checked for completeness.
PURPOSES = ("exam_performance", "understanding", "build_something", "other")

#: The table key for "we do not know what he wants" — no goal, or `other`.
#: Both get the same words, because in both cases the honest thing is the same:
#: do not pretend to know what this is for.
DEFAULT_PURPOSE_KEY = "default"

#: Why this turn matters to the goal, in one short sentence. Shared by every
#: method: it is about the topic's relation to the direction, not about the
#: pedagogy. Empty when there is no goal — the status bar then says nothing
#: rather than something generic.
_GOAL_RELATION = {
    "exam_performance": "这一轮练的是会考的东西 —— 冲着你的目标去。",
    "understanding": "目标是理解，所以这一轮不追求做对，追求说得清。",
    "build_something": "这一轮是为你想做出来的那个东西服务的。",
}


def purpose_key(goal: "GoalView | None") -> str:
    """Which row of the learner-facing tables applies."""
    if goal is None or goal.purpose not in _GOAL_RELATION:
        return DEFAULT_PURPOSE_KEY
    return goal.purpose


def goal_relation(goal: "GoalView | None") -> str | None:
    """「这件事和你的目标什么关系」—— 状态栏第二行就是它。

    `None` when there is no goal: a status bar that said "和你的目标有关" about a
    space with no goal would be making one up.
    """
    if goal is None:
        return None
    return _GOAL_RELATION.get(goal.purpose)


class MethodInput(BaseModel):
    """Everything a Method is allowed to look at.

    Every field is filled from what the Global Agent already assembled for this
    turn (`services/agent_context_service.py`) plus the space's goal — nothing
    here derives state, and nothing here writes it.
    """

    # The learner's own words for this turn.
    user_message: str
    # The literal block the model will receive (space material + Space Memory +
    # Learner State). Kept whole so a Method can pass it through when the
    # discipline needs to quote it, and so the two methods demonstrably read the
    # same thing.
    space_context: str = ""
    # The Learner State section on its own — the derived mastery view. Same text
    # as inside `space_context`; split out because "what can he already use?" is
    # a question both methods ask, just for different purposes.
    learner_state: str = ""
    # Outer-fringe titles: what the system says is ready to be learned next.
    outer_fringe: list[str] = Field(default_factory=list)
    history_messages: int = 0
    #: Where this space is trying to get to, when the learner has confirmed a
    #: goal. `None` is a legitimate state — a space may be a place to collect
    #: material before anybody knows what it is for, and the methods then say so
    #: instead of guessing.
    goal: GoalView | None = None

    @property
    def has_knowledge_structure(self) -> bool:
        """Whether this space has a knowledge structure at all.

        Read off the rendered block rather than re-derived: an empty structure
        renders as one parenthetical sentence, a real one renders as bullet
        labels. A method that assumed a structure existed would tell the model
        to "build on what he already knows" about a space where nothing is
        known — a confident instruction pointing at nothing.
        """
        return bool(item_labels(self.learner_state))


class Behaviour(BaseModel):
    """The machine-readable half of a directive.

    The natural-language discipline is what the model reads; this is what a
    test, a log or a future Coordinator can read. Keeping the shape explicit is
    also what stops the two methods from drifting into "same behaviour, warmer
    wording".

    camelCase on the way out (`by_alias=True`) because this object ends up in
    the per-answer digest, which is wire-shaped like the rest of it.
    """

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    # Does this turn end with a question put to the learner?
    expects_question: bool
    # How many questions one turn may contain (0 = none).
    max_questions: int
    # Must the turn withhold the answer itself?
    forbids_full_answer: bool
    # Must the turn contain a worked example?
    requires_example: bool
    # Does the turn stop and wait for the learner before anything else happens?
    awaits_learner: bool


class MethodDirective(BaseModel):
    """What a Method decides: where this turn aims, and how it must behave.

    **Three faces, three readers** — the same division the architecture draws:

    | 面 | 字段 | 谁读 |
    |---|---|---|
    | 面向模型 | `discipline` | 模型（注入 system prompt） |
    | 面向学习者 | `system_move` / `learner_move` / `completion` | Focus 顶部的状态栏 |
    | 面向系统 | `behaviour` + `focus` | 测试 / 日志 / 将来的策略 |

    面向学习者那三格是**动词短语**，不是标签：状态栏说的必须是"我们现在在做什么 /
    要你做什么 / 什么算完成"，**不显示这个 Method 的名字** —— 一个术语会邀请用户去
    评价这种教法，一个动词只会邀请他去做。
    """

    name: str
    display_name: str
    # The knowledge item this turn connects to (usually the outer fringe, or
    # whatever the learner just named). None when the space has no structure.
    focus: str | None = None
    # What the learner needs to hear about *this* turn's method, in the model's
    # own instruction language. Injected into the system prompt verbatim.
    discipline: str
    #: ① 我们现在在做什么。动词，不是术语（"先请你自己走一遍，我不给答案"）。
    system_move: str
    #: ② 要你做什么。一句话，让他知道现在该动手了。
    learner_move: str
    #: ③ 什么算完成。**这一格是承重的**：没有它，用户不知道什么时候算过，
    #: 而"什么时候算过"正是"有方向"最直接的证据。它随 `purpose` 变 —— 同一个
    #: 知识点，为了考试与为了理解不是同一件事。
    completion: str
    #: 这件事和你的目标什么关系。没有目标时是 `None`（那就不说，而不是说一句
    #: "和你的目标有关"——那是在替他想一个目标）。
    goal_relation: str | None = None
    behaviour: Behaviour

    @property
    def prompt_block(self) -> str:
        return self.discipline.strip()


class Method(Protocol):
    """The whole interface. Everything else in this package is an implementation
    detail of one of the two methods."""

    name: str
    display_name: str
    description: str

    def execute(self, context: MethodInput) -> MethodDirective: ...


# --- shared helpers ---------------------------------------------------------
#
# Both methods read the same input the same way and differ only in what they do
# with it. Anything that would make them read differently lives here, so the
# review question is always "does this change behaviour?" rather than "does this
# change the input?".


def item_labels(learner_state_block: str) -> list[str]:
    """The item labels the Learner State block already renders, in order.

    This *reads* a block the system just rendered; it does not re-derive
    anything. That distinction is deliberate: the block is the one place the
    knowledge structure is turned into text, and a second derivation here could
    disagree with what the model was shown.

    De-duplicated, because the block legitimately names one item twice: an item
    that is both "还没测过" and "接下来可学" is listed in both sections. That is
    the correct rendering for a human — it says "untested *and* everything under
    it is in place" — but as focus candidates it would just be the same label
    twice.
    """
    labels: list[str] = []
    for raw_line in learner_state_block.splitlines():
        line = raw_line.strip()
        if not line.startswith("- "):
            continue
        label = line[2:].strip()
        # The renderer emits "…（另有 N 项）" as a bullet when a section is
        # truncated; it is a count, not an item, and must not become a focus.
        if not label or label.startswith("…") or label in labels:
            continue
        labels.append(label)
    return labels


def select_focus(context: MethodInput) -> str | None:
    """Which knowledge item this turn connects to.

    Prefers the item the learner actually named — asking about 对角化 and being
    handed 特征向量 would be the method ignoring the question. Falls back to the
    outer fringe, which is the system's own answer to "what is learnable next".

    V0 limit, stated rather than hidden: matching is substring matching on the
    labels the space stores, so an English alias for a Chinese label
    ("eigenvector" for 特征向量) does not match and the fallback is used. For a
    fringe that already *is* the concept being asked about, the two agree.
    """
    candidates = [
        *context.outer_fringe,
        *item_labels(context.learner_state),
    ]
    named = [label for label in candidates if label and label in context.user_message]
    if named:
        # Longest first: with short labels like 特征值 around, a shorter label
        # that happens to be a prefix must not win over the specific one.
        return max(named, key=len)
    if context.outer_fringe:
        return context.outer_fringe[0]
    return None


def completion_lines(context: MethodInput, completion: str) -> list[str]:
    """The tail every discipline ends with: what would make this turn count.

    Shared by both methods on purpose. "什么算完成" is the one piece of the
    directive that has to reach **both** readers — the learner (the status bar)
    and the model (otherwise the criterion is a label, not an instruction), and
    two hand-written versions of the same idea would drift apart.

    The last line is the part that keeps it honest in use: a criterion that is
    never quoted back is a criterion, not a topic. Left unsaid, a model told
    "this is for your exam" will start every answer with it.
    """
    lines = [
        "",
        "## 这一轮什么算完成",
        completion,
    ]
    if context.goal is not None:
        lines.append(
            f"（这个空间的目标是「{context.goal.target_text}」—— 上面这条判据就是照着它定的。"
            "不要在回答里提这个目标本身：它是判据，不是话题。）"
        )
    else:
        lines.append("（这个空间还没有目标，所以这条判据只说这一次。）")
    return lines
