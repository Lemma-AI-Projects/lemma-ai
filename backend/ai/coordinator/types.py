"""The Coordinator's vocabulary: an event in, one decision out.

Nothing here reads a database or calls a model. A decision is a pure function of
a `Snapshot`, and a `Snapshot` is a distilled view of state the rest of the
system already owns (Learner State, evidence, memory). The Coordinator is
allowed to *read* those; it is not allowed to redefine them, and it never writes
any of them (the only thing it produces is a decision, see
`services/coordinator_service.py`).

Why a snapshot instead of the database: the Coordinator's question is "given
what just happened and where the learner stands, is there anything to do?" — and
answering it needs a handful of facts, not the schema. Handing it a session
would invite joins, and joins are how a decision layer starts modelling domains
it does not own.

Two conventions worth stating once:

  * **The state is pre-derived.** `mastered` / `ready` / `developing` arrive as
    labels computed by `ai/knowledge/state.py`. The Coordinator never derives
    knowledge itself and never sees a probability — there are none to see.
  * **`metadata`-free on purpose.** A `Decision` carries `action`, `target`,
    `reason`, `urgency` and a machine-readable `payload` — but no user-facing
    copy. Wording belongs to whoever delivers the decision (the Global Agent, or
    the notification executor); a Coordinator that wrote sentences would be a
    second author of the product's voice.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import StrEnum
from typing import Any

# The event that exists today. V0 implements exactly this one and refuses every
# other name — an accepted-but-unhandled event would be a decision nobody can
# explain. `evidence.created`, `goal.changed`, `user.requested_next_step` and
# `scheduler.triggered` are the documented next ones (see the module docstring in
# `services/coordinator_service.py`), and each needs a rule, not just a name.
EVENT_LEARNER_STATE_UPDATED = "learner_state.updated"
SUPPORTED_EVENTS = (EVENT_LEARNER_STATE_UPDATED,)

# Who announced the event. This is the caller's own statement about where the
# evidence came from, and it is the one field that changes *delivery*:
# "chat" means a conversation is live (there is somebody to teach right now),
# anything else means there is no room to speak into.
SOURCE_CHAT = "chat"
SOURCE_API = "api"
EVENT_SOURCES = (SOURCE_CHAT, SOURCE_API)


class Action(StrEnum):
    """What to do. Five values, and no more in V0.

    Deliberately NOT method names: `INTRODUCE` says "this item is ready, teach
    it", not *how* to teach it. Method selection is a later layer that reads this
    decision; pinning `Socratic` or `DirectExplanation` here would freeze a
    system that has not been designed yet.
    """

    NO_ACTION = "NO_ACTION"
    CONTINUE = "CONTINUE"  # stay on the item the learner is working on
    REVIEW = "REVIEW"  # go back over something they had
    INTRODUCE = "INTRODUCE"  # start the item that just became learnable
    NOTIFY = "NOTIFY"  # reach the learner outside a live conversation


class Urgency(StrEnum):
    """How much it matters. V0 derives it from the action, deterministically —
    there is no ranking model, and a made-up score would look like one."""

    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"


class Finding(StrEnum):
    """What the snapshot says is true, *before* delivery is considered.

    The rules produce a finding, then the delivery rule may turn it into
    `NOTIFY`. Keeping the two apart is what makes the reason strings honest:
    "「特征值」的前提都已具备" is a fact about the learner; "→ 通知送达" is a
    consequence of nobody being in the room.
    """

    NONE = "none"
    NEXT_STEP = "next_step"  # something became learnable
    LAPSE = "lapse"  # they had it, this attempt failed
    STRUGGLE = "struggle"  # still learning it, no success yet
    UNSETTLED = "unsettled"  # the write did not decide anything
    #: 结构里暂时没有可学的新项 —— 这是一个**结论**，不是"没有结论"。
    #:
    #: 与 `NONE` 分开，因为两者说的事完全不同：`NONE` 是"我没法判断"（不认识的事件、
    #: 没有结构），`NO_NEXT_STEP` 是"我判断过了，现在没有下一步可做"。混成一个值，
    #: 会让"暂时没事可做"读起来像"什么都看不见" —— 而前者是可以被检验的事实
    #: （外沿为空），后者是一个缺口。
    #:
    #: ⚠️ 它**不**等于"他已经学完了"：到期的复习不在这条判断里（Scheduler 不在
    #: Coordinator 链上），所以它只说结构上没有新东西，不说这个人没有事可做。
    NO_NEXT_STEP = "no_next_step"


@dataclass(frozen=True)
class CoordinatorEvent:
    """One thing that happened, as the caller reports it."""

    type: str
    payload: dict[str, Any] = field(default_factory=dict)
    # Empty for an event that is not about a room.
    source: str = SOURCE_API

    @property
    def from_conversation(self) -> bool:
        return self.source == SOURCE_CHAT


@dataclass(frozen=True)
class FocusItem:
    """The item the event is about, after the state was recomputed."""

    id: str
    label: str
    # "mastered" | "not_mastered" | "unassessed".
    value: str
    origin: str | None
    evidence_count: int
    last_confirmed_at: datetime | None
    # What this item's value was BEFORE the event's evidence was written —
    # recomputed by the same pure derivation over the evidence minus this row.
    # It is what separates a lapse ("they had it, now they don't") from a
    # struggle ("they never had it"), and neither can be read off the new value
    # alone.
    previous_value: str = "unassessed"

    @property
    def was_mastered(self) -> bool:
        return self.previous_value == "mastered"


@dataclass(frozen=True)
class EvidenceFact:
    """One recent record, as the snapshot shows it. A fact, not a score.

    `hint_used` is the field that makes the record honest. It is carried here
    (rather than left in the table) because a decision that cannot see *whether
    the learner did it alone* cannot choose to help less next time — it can only
    react to how many times he got it right, which is exactly the signal that
    stays high the most while help is doing the work. The column, the wire
    contract and the domain object all already existed
    (`knowledge_evidence.hint_used` · `schemas/knowledge.py` ·
    `evidence_entry.Outcome`); the Agent's tool was the only surface that could
    not fill it, which is why it now takes `hintUsed`.
    """

    item_label: str
    verdict: str
    tier: str
    created_at: datetime | None
    #: Whether help was given this time. `False` means the learner did it
    #: unassisted — the only kind the core counts toward mastery.
    hint_used: bool = False


@dataclass(frozen=True)
class GoalFact:
    """The space's goal, as a decision may see it — and only the active one.

    A *fact about direction*, not a plan: it says where the learner wants to get
    to and what counts as success there. It carries no progress, no percentage
    and no ranking, because none of those exist — the table behind it
    (`space_goals`) deliberately has no such column.

    `purpose` is the field that changes decisions: "get the exam right" and
    "understand why it works" are different instructions even when they point at
    the same topic, and a method that cannot tell them apart is not choosing, it
    is guessing.

    A `draft` goal never reaches here. That is the whole reason the confirm step
    exists: an unconfirmed goal is somebody's guess about what the learner wants,
    and letting a guess steer ranking and termination is the most expensive way
    to be wrong.
    """

    target_text: str
    purpose: str
    deadline_at: datetime | None = None
    context: str | None = None


@dataclass(frozen=True)
class Snapshot:
    """Everything the decision may look at — and nothing else."""

    event: CoordinatorEvent
    current_time: datetime
    space_id: str | None
    space_name: str | None
    focus: FocusItem | None
    mastered: tuple[str, ...] = ()
    ready: tuple[str, ...] = ()
    developing: tuple[str, ...] = ()
    unassessed_count: int = 0
    recent_evidence: tuple[EvidenceFact, ...] = ()
    recent_memory: tuple[str, ...] = ()
    # The action space, carried in the snapshot so a decision can never name an
    # action the system does not have (and so a future model-based policy could
    # be constrained with it).
    available_actions: tuple[str, ...] = ()
    # The space's direction, when it has one the learner confirmed. None is a
    # legitimate state, not a gap: a space may be a place to collect material
    # before anybody knows what it is for.
    goal: GoalFact | None = None
    # The installed methods, as facts. **Injected, never imported** — the same
    # discipline as `available_actions`, and for the same reason: `rules.py` is
    # a pure function over this snapshot, so a candidate list that arrived by
    # import would make "adding a method" a change to the decision layer. Empty
    # is a legitimate state meaning "nothing is installed", and the rules below
    # read it as "do not intervene" rather than failing.
    available_methods: tuple[MethodFact, ...] = ()
    #: What is **already running** in this space, as a fact: the method id of the
    #: live episode, or None.
    #:
    #: Injected for the same reason as `available_methods`, and it is the field
    #: that makes `HOLD` possible. A Method is a promise about a *stretch* of
    #: work, so re-deciding every turn would erase the help that was just
    #: withdrawn and make the choice jitter on whatever the last piece of evidence
    #: happened to say. Reading "is something already running" off a column here,
    #: rather than querying the episode table inside a rule, keeps `rules.py` a
    #: pure function — and `HOLD` is free, which is the point.
    #:
    #: None is a legitimate and common state: nothing has been started.
    active_method: str | None = None
    #: The focus item of the live episode, when there is one. Lets a rule notice
    #: that the stretch under way is about a *different* item than this turn's
    #: evidence, which is the case where re-deciding is right rather than wrong.
    active_focus: str | None = None

    @property
    def has_state(self) -> bool:
        """Is there a knowledge structure to reason about at all?"""
        return bool(self.mastered or self.ready or self.developing or self.focus)

    def method(self, method_id: str) -> MethodFact | None:
        """One candidate by id, or None when it is not installed.

        Looked up rather than assumed: a decision that names a method which is
        not in the snapshot would be a decision that cannot be executed, and the
        failure would surface as a 500 in the middle of a learner's turn.
        """
        for fact in self.available_methods:
            if fact.id == method_id:
                return fact
        return None


@dataclass(frozen=True)
class MethodFact:
    """One installed method, as the decision layer is allowed to see it.

    **Facts about the method, not the method.** This is a dataclass rather than
    an import of `ai.methods.Method` for the same reason `Snapshot` carries
    `available_actions` as strings: the decision layer must be able to *receive*
    a candidate list without knowing what any candidate is. If `rules.py` could
    import a method, adding a method would change the Coordinator — and the whole
    point of the plugin shape is that it does not.

    The four fields are the ones a choice actually needs, and the last two are
    the ones that cannot be read off a name: two methods can both be called
    "讲解" and differ entirely in whether they withhold the answer. `String`
    fields over an enum because this type crosses a boundary that must not know
    what a method is.
    """

    id: str
    display_name: str
    #: Does it need the learner to DO something? A method whose point is a
    #: learner action is wrong for a turn where nobody will act.
    needs_learner_action: bool
    #: Does it withhold the answer? The load-bearing difference between the two
    #: installed methods, and the one a decision cannot infer from anything else.
    withholds_answer: bool

    def __post_init__(self) -> None:
        if not self.id.strip():
            raise ValueError("a method fact without an id cannot be chosen")


class MethodSelection(StrEnum):
    """What to do about the method for this turn. Five values.

    **Why five and not one.** The obvious design is "pick a method every turn",
    and it is wrong in a way that only shows up in use: a method is a promise
    about a *stretch* of work (`ask him to try → he tries → drop the help → try
    again`), and re-deciding every turn would erase the help that was just
    withdrawn, and make the choice jitter on whatever the last piece of evidence
    happened to say. So `HOLD` exists and is free: the name is already stored.

    | 值 | 什么时候 | 凭什么 |
    |---|---|---|
    | `START` | 还没有做法在跑，且这一轮该有人做功 | 候选里那个**要求学习者动手**的 |
    | `HOLD` | 同一件事继续做 | 什么都不变 |
    | `SWITCH` | 缺的不是这个点 / 做法本身不成立 | **必须带理由**（见下） |
    | `END` | 判据达成，或继续已无收益 | 完成判据，或一次明确的放弃 |
    | `NO_INTERVENTION` | 大多数轮次 | 没什么值得插进来的 |

    `NO_INTERVENTION` is a **first-class candidate, not a fallback branch**. If
    "select" always yields a method, ordinary conversation gets shoved into
    whichever teaching style happens to be installed — and the learner asked a
    question, not for a lesson. A system that always intervenes and one that
    never does are the same error.
    """

    START = "start"
    HOLD = "hold"
    SWITCH = "switch"
    END = "end"
    NO_INTERVENTION = "no_intervention"


@dataclass(frozen=True)
class MethodDecision:
    """One method decision: which of the five, and — where it applies — which.

    `reason` is mandatory whenever a method is being started or switched, and
    `validate()` refuses it otherwise. A silent switch is indistinguishable from
    a random one, and "why am I being taught this differently now" is the
    question a learner is entitled to ask; an answer that cannot be reconstructed
    from the log is not an answer.
    """

    selection: MethodSelection
    #: None for `NO_INTERVENTION`, and for `HOLD` when nothing is running.
    method_id: str | None = None
    reason: str | None = None

    def validate(self, snapshot: Snapshot) -> "MethodDecision":
        """Refuse a decision that could not be carried out.

        Three refusals, each catching a different way this can go wrong in
        production rather than in a test:

        * naming a method that is not installed — the turn would 500 later;
        * a start, switch or end with no reason — an unexplainable change;
        * holding or ending something that is not running — "continue what?" has
          no answer, and ending a promise that was never made is a lie.
        """
        if self.selection is MethodSelection.NO_INTERVENTION:
            if self.method_id is not None:
                raise ValueError(
                    "no_intervention cannot carry a method — it means none is running"
                )
            return self
        if self.method_id is None:
            raise ValueError(f"{self.selection.value} requires a method id")
        if snapshot.method(self.method_id) is None:
            raise ValueError(
                f"{self.selection.value} names method {self.method_id!r}, which is "
                "not in the snapshot's candidates"
            )
        if self.selection in (MethodSelection.HOLD, MethodSelection.END):
            if self.method_id != snapshot.active_method:
                raise ValueError(
                    f"{self.selection.value} names {self.method_id!r}, which is not "
                    f"the running episode ({snapshot.active_method!r}) — continuing "
                    "or ending a promise that was never made is not a decision"
                )
        if self.selection in (
            MethodSelection.START,
            MethodSelection.SWITCH,
            MethodSelection.END,
        ) and not (self.reason or "").strip():
            raise ValueError(
                f"{self.selection.value} needs a reason — a silent change is "
                "indistinguishable from a random one"
            )
        # A hold is the zero-cost case, so its reason is optional: continuing what
        # is already happening needs no justification. The lookups above already
        # checked that there *is* something running.
        return self

    def to_payload(self) -> dict[str, Any]:
        """The shape that rides in `Decision.payload` and the decision log."""
        return {
            "selection": self.selection.value,
            "method": self.method_id,
            "reason": self.reason,
        }


#: The one decision meaning "leave the learner alone". Named so that both the
#: rules and the tests can say it instead of a bare `None`, which reads as
#: "nothing was decided" rather than "we decided not to".
NO_INTERVENTION = MethodSelection.NO_INTERVENTION


@dataclass(frozen=True)
class Decision:
    """One thing to do, or an honest nothing.

    `payload` is machine-readable extras for the executor (`{"itemId": ...}`).
    It is never user-facing copy.

    It also carries the method choice in `payload["method"]` — a small dict of
    the shape `{"selection": ..., "method": ..., "reason": ...}`. **It rides
    here rather than in a column of its own** so that "what did we decide and
    what did we pick" is one row: a decision whose method is unrecorded cannot
    answer "why was I taught this way", and that question is the only reason the
    log exists.
    """

    action: Action
    target: str | None
    reason: str
    urgency: Urgency = Urgency.NORMAL
    payload: dict[str, Any] = field(default_factory=dict)

    @property
    def is_action(self) -> bool:
        return self.action is not Action.NO_ACTION


def decision_wire(decision: Decision) -> dict[str, Any]:
    """The decision as the API/log carries it. One place, so the frontend and the
    log cannot disagree about the shape."""
    return {
        "action": decision.action.value,
        "target": decision.target,
        "reason": decision.reason,
        "urgency": decision.urgency.value,
        "payload": dict(decision.payload),
    }


__all__ = [
    "Action",
    "CoordinatorEvent",
    "Decision",
    "EVENT_LEARNER_STATE_UPDATED",
    "EVENT_SOURCES",
    "EvidenceFact",
    "Finding",
    "FocusItem",
    "GoalFact",
    "MethodDecision",
    "MethodFact",
    "MethodSelection",
    "NO_INTERVENTION",
    "SOURCE_API",
    "SOURCE_CHAT",
    "SUPPORTED_EVENTS",
    "Snapshot",
    "Urgency",
    "decision_wire",
]
