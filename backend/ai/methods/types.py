"""The Method layer's vocabulary: one small interface, two plugins.

A **Method** answers one question: *given this learner, this state and this
message, how should this turn intervene?* It is deliberately not a runtime, a
workflow engine or a plugin ABI — a handful of declared fields, one input type,
one output type and one function.

Three decisions worth keeping:

- **`execute()` does not call a model.** The chat turn's model call stays where
  it was (`AIUseCase.TEXT_CHAT`, with the Global Agent's tools bound). A Method
  that opened its own model channel would lose `remember` / `record_evidence`,
  which is the whole reason the learner's answers can still become Evidence and
  move Learner State. The Method decides *how to teach*; the pipeline teaches.
- **One input shape for every Method.** If the two methods read different
  structures, a difference in behaviour can no longer be attributed to the
  method — and "the difference comes from the Method, not from different input"
  is the entire acceptance criterion.
- **Four of the five elements are data, not prose.** A Method's claim on the
  learner has to be checkable or it is only a manner of speaking:

  | 要素 | 类型 | 若只是文本会怎样 |
  |---|---|---|
  | 1 适用条件 | `AppliesWhen` | 变成对所有情况的默认话术 |
  | 2 要他做的动作 | `learner_move`（字符串） | 混在纪律文本里，系统读不到 |
  | 3 我不做的事 | `Restraint` → `Behaviour` | "少帮忙"只是一句承诺 |
  | 4 观察什么 | `EvidenceTarget` | **完全没有** —— 做法退回成提示词 |
  | 5 什么算完成 | `CompletionRule` + `completion` | 不可证伪 |

  Before R1, elements 1/3/4 existed only inside a Chinese paragraph and element 5
  existed only as one sentence of it, so the machine-readable `Behaviour` was a
  hand-written second copy that nothing cross-checked.
"""

from dataclasses import dataclass
from typing import Literal, Protocol

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

#: The table key for "we do not know what he wants" — no goal, `other`, or a
#: purpose nobody has heard of. All three get the same words, because in all
#: three the honest thing is the same: do not pretend to know what this is for.
DEFAULT_PURPOSE_KEY = "default"

#: The purposes that get their **own** pedagogy row. Note this is deliberately
#: not `PURPOSES`: `other` is a real purpose (it is what the extractor produces
#: when it hears a direction but cannot classify it) and it deliberately shares
#: the default row. Keying the table lookup off `PURPOSES` would send `other`
#: to a row that does not exist — which is exactly the KeyError this constant's
#: docstring is now guarding against.
OWN_ROW_PURPOSES = ("exam_performance", "understanding", "build_something")

#: Why this turn matters to the goal, in one short sentence. Shared by every
#: method: it is about the topic's relation to the direction, not about the
#: pedagogy. `None` only when there is no goal — the status bar then says
#: nothing rather than something generic.
#:
#: `other` gets its own line on purpose. "No goal" and "a goal we could not
#: put a purpose on" are two different facts and the bar must not collapse
#: them: the learner who typed a direction deserves to see that we have it,
#: even while we admit we do not yet know what it is for.
_GOAL_RELATION = {
    "exam_performance": "这一轮练的是会考的东西 —— 冲着你的目标去。",
    "understanding": "目标是理解，所以这一轮不追求做对，追求说得清。",
    "build_something": "这一轮是为你想做出来的那个东西服务的。",
    "other": "这是你给的方向；还没弄清它是为了什么，所以先不做多余的事。",
}


def purpose_key(goal: "GoalView | None") -> str:
    """Which row of the learner-facing tables applies.

    Keyed off `OWN_ROW_PURPOSES` — the purposes that have a **pedagogy** of their
    own. `other`, an unknown purpose and no goal at all all land on the default
    row, because in those three cases the same thing is true: we do not know
    what he wants this for, so we do not pretend.

    The two functions here ask different questions and must not be coupled:
    this one picks the pedagogy, `goal_relation` picks the sentence about the
    goal. An earlier version keyed this off `PURPOSES` and fell over with
    `KeyError: 'other'` — the two answer different questions.
    """
    if goal is None or goal.purpose not in OWN_ROW_PURPOSES:
        return DEFAULT_PURPOSE_KEY
    return goal.purpose


def goal_relation(goal: "GoalView | None") -> str | None:
    """「这件事和你的目标什么关系」—— 状态栏第二行就是它。

    `None` **only** when there is no goal at all: a status bar that said
    "和你的目标有关" about a space with no goal would be making one up.

    A goal whose `purpose` we could not classify still gets its own line (see
    `_GOAL_RELATION["other"]`), because having a direction and not knowing what
    it is for are two different facts. A `purpose` that is not in
    `PURPOSES` at all is a bug rather than a state, so it falls through to the
    generic line instead of to silence.
    """
    if goal is None:
        return None
    return _GOAL_RELATION.get(goal.purpose, _GOAL_RELATION["other"])


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


class Restraint(BaseModel):
    """要素 3 · 「我这次不做的事」—— 退缩的量。

    The load-bearing half of a Method, and the half that is easiest to leave
    implicit: a system trained to be helpful will always do more unless something
    stops it. Naming the restraint as data is what makes "withhold the answer"
    a decision rather than an accident.

    Every field here maps onto exactly one `Behaviour` flag — that mapping is the
    whole reason `Behaviour` exists at all, and it is checked by
    `test_restraint_and_behaviour_are_one_thing`. Before this type, the flags and
    the Chinese discipline text were two hand-written copies of the same promise,
    so changing one without the other failed nothing.
    """

    # Does this turn end with a question put to the learner?
    asks_question: bool
    # How many questions one turn may contain (0 = none).
    max_questions: int
    # Must the turn withhold the answer itself? This is the restraint that
    # actually matters: it is the difference between teaching and enabling.
    withholds_answer: bool
    # Must the turn contain a worked example?
    requires_example: bool
    # Does the turn stop and wait for the learner before anything else happens?
    stops_for_learner: bool


class AppliesWhen(BaseModel):
    """要素 1 · 适用条件 —— 什么状态下才用得上它。

    Without this a Method degenerates into the default voice for every situation,
    which is the failure mode "he asked a question and got the Socratic treatment
    when he plainly wanted the answer".
    """

    # Does this method need the learner to DO something? A method whose whole
    # point is a learner action is wrong for a turn where nobody is going to act,
    # and the Coordinator needs to be able to tell that from the outside.
    needs_learner_action: bool
    #: What to do on a space with no knowledge structure: `fallback` = run with
    #: the honest weaker rule (both current methods do this), `hold` = refuse,
    #: because the method's premise is a structure this space does not have.
    without_structure: Literal["fallback", "hold"] = "fallback"


class EvidenceTarget(BaseModel):
    """要素 4 · 观察什么 —— 希望从用户行为里看到的那一条记录。

    **这一类必须能用 `record_evidence` 的参数表达**，否则它就是一句没人读的
    话、做法会退回成提示词。The correspondence is exact and is the acceptance
    criterion (`test_every_evidence_target_maps_onto_the_recording_tool`):

    | 这里          | 工具参数 (`ai/tools/declarations.py`) |
    |---------------|--------------------------------------|
    | `item_hint`   | `item`                               |
    | `tier`        | `basis`（`A` = verified，`B` = judged）|
    | `require_independent` | `hintUsed = false`          |

    Deliberately **no `verdict`**: what the learner did is the observation's
    answer, not part of what we are looking for. A target that named a verdict
    would be asking for a conclusion, and a Method may not pre-judge its own
    outcome — that judgement belongs to `ai.knowledge.admit`, and it is the one
    that knows `independent` and `hint_used`.

    `require_independent` defaults to `True` because that is the core's own rule
    (`ai/knowledge/state.py:291`): a correct answer produced with help is
    `INERT`. A Method that watched for helped successes would be counting
    something the state deliberately does not count.
    """

    item_hint: str | None = None
    tier: Literal["A", "B"] = "B"
    require_independent: bool = True


class CompletionRule(BaseModel):
    """要素 5 · 什么算这次干预结束了 —— 一个可核对的判据。

    **Derived, never felt.** This is the type that makes a Method falsifiable: the
    completion line the learner reads and the condition the system checks come
    from the same object, so "we told him two independent correct answers and
    then changed the subject" cannot pass unnoticed.

    Two properties keep it derivable from evidence alone (no clock, no
    "how long has this been running"):

    * it depends only on the evidence rows, so it is recomputable at any time
      from the table — no episode row needs to exist for it to be checkable;
    * it names a count, not a feeling, so "did it happen" has one answer.

    `NOT_APPLICABLE` is a first-class value, not a failure: most turns owe no
    completion at all, and a rule that had to be satisfied every turn would make
    every turn look unfinished.
    """

    kind: Literal["consecutive_correct", "judged_observation", "not_applicable"]
    #: How many qualifying observations. Only meaningful for the counting kinds;
    #: ignored by `NOT_APPLICABLE`.
    n: int = 1


#: The one value a method uses when this turn owes no completion. Named because
#: "no completion" is a decision, and a decision that has to be spelled out is a
#: decision nobody will quietly drop later.
NOT_APPLICABLE = CompletionRule(kind="not_applicable")


class Behaviour(BaseModel):
    """The machine-readable half of a directive — a **view** of `Restraint`.

    ⚠️ It is derived, not declared. It exists because this object rides in the
    per-answer digest and is read by tests; `Restraint` is what a Method
    declares. Before R1 the two were hand-written separately and nothing checked
    that they agreed — see `test_restraint_and_behaviour_are_one_thing`.

    camelCase on the way out (`by_alias=True`) because the digest is
    wire-shaped like the rest of it.
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

    @classmethod
    def of(cls, restraint: Restraint) -> "Behaviour":
        return cls(
            expects_question=restraint.asks_question,
            max_questions=restraint.max_questions,
            forbids_full_answer=restraint.withholds_answer,
            requires_example=restraint.requires_example,
            awaits_learner=restraint.stops_for_learner,
        )


class MethodDirective(BaseModel):
    """What one run of a Method decides: where this turn aims, and how to intervene.

    **The four elements, all data** — the reason this type grew in R1:

    | 要素 | 字段 | 面向 |
    |---|---|---|
    | 1 适用条件 | `applies_when` | 系统（选不选它） |
    | 2 要他做的动作 | `learner_move` | 学习者 + 模型 |
    | 3 我不做的事 | `restraint` → `behaviour` | 系统（`behaviour` 是它的视图） |
    | 4 观察什么 | `evidence_target` | 系统（核对） |
    | 5 什么算完成 | `completion`（人话）+ `completion_rule`（可核对） | 两者 |

    **Three faces, three readers** — the same division the architecture draws:

    | 面 | 字段 | 谁读 |
    |---|---|---|
    | 面向模型 | `discipline` | 模型（注入 system prompt） |
    | 面向学习者 | `system_move` / `learner_move` / `completion` | Focus 顶部的状态栏 |
    | 面向系统 | `behaviour` + `focus` + `evidence_target` + `completion_rule` | 测试 / 日志 / 将来的策略 |

    面向学习者那三格是**动词短语**，不是标签：状态栏说的必须是"我们现在在做什么 /
    要你做什么 / 什么算完成"，**不显示这个 Method 的名字** —— 一个术语会邀请用户去
    评价这种教法，一个动词只会邀请他去做。

    `completion` 与 `completion_rule` 是**同一个承诺的两种形态**，刻意放在一处：
    判据（`rule`）与人话（`completion`）若分开存，早晚会漂 —— 界面上写着"做对两道
    就算过"而系统按一条去核对，那比没有判据更糟。
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
    #: 要素 1。What state this run applies to. Carried on the directive (not
    #: only on the class) because whether a method applies can depend on the
    #: purpose — "先自己走一遍" is right for an exam and wrong for a build task.
    applies_when: AppliesWhen
    #: 要素 3。What this turn refuses to do. `behaviour` is derived from it.
    restraint: Restraint
    #: 要素 4。What one recorded observation would look like if this worked.
    evidence_target: EvidenceTarget
    #: 要素 5, machine half. Paired with `completion` above — see the class
    #: docstring. Defaults to "no completion owed" so a method that genuinely
    #: owes nothing does not have to say so twice.
    completion_rule: CompletionRule = NOT_APPLICABLE
    #: 这件事和你的目标什么关系。没有目标时是 `None`（那就不说，而不是说一句
    #: "和你的目标有关"——那是在替他想一个目标）。
    goal_relation: str | None = None

    @property
    def behaviour(self) -> Behaviour:
        """The wire-shaped view of `restraint` — derived, never declared."""
        return Behaviour.of(self.restraint)

    @property
    def prompt_block(self) -> str:
        return self.discipline.strip()


class Method(Protocol):
    """The whole interface. Everything else in this package is an implementation
    detail of the methods.

    Note what is **not** here: nothing that starts, stops or switches a method.
    A Method is a plugin that answers "given this turn, how should I intervene"
    — who calls it, when it runs and what happens next belong to the
    Coordinator and the runtime, and a plugin that could reach them would be a
    small autonomous agent wearing a teaching costume.
    """

    name: str
    display_name: str
    description: str
    #: 要素 1，the part of it that does not vary with the turn.
    applies_when: AppliesWhen
    #: 要素 3，the restraint this method always holds.
    restraint: Restraint

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


def completion_lines(
    context: MethodInput, completion: str, rule: CompletionRule
) -> list[str]:
    """The tail every discipline ends with: what would make this turn count.

    Shared by both methods on purpose. "什么算完成" is the one piece of the
    directive that has to reach **both** readers — the learner (the status bar)
    and the model (otherwise the criterion is a label, not an instruction), and
    two hand-written versions of the same idea would drift apart.

    **The `rule` argument is what makes this honest.** The sentence the model
    reads is generated from the same `CompletionRule` the system will check, so
    "连续两道独立做对" cannot be shown to the learner while something else is
    being counted. A method owing no completion says so in the text too, rather
    than printing a criterion it is not going to look for.

    The last line is the part that keeps it honest in use: a criterion that is
    never quoted back is a criterion, not a topic. Left unsaid, a model told
    "this is for your exam" will start every answer with it.
    """
    if rule.kind == "not_applicable":
        return [
            "",
            "## 这一轮不设完成判据",
            "这一轮不需要达成什么，只要这一轮该做的事做完了就行。",
        ]
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
