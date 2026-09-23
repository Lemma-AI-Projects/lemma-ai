"""The teaching runtime's vocabulary: one board, one timeline, one primitive.

This is a *behaviour* copy of Hyperknow's full-screen teaching session, so the
types are deliberately shaped after what was actually observed (see
hyperknow_user_behavior_reconstruction.html §2/§3) rather than after a generic
"lesson player":

- The board is **built up**, not rendered whole: text, then a figure, then
  labels, then motion. So a step owns an ordered list of small actions.
- Voice and board are **one process**, not two: actions carry a `cue` — the
  index of the narration sentence they belong to — so the narration timeline
  drives the board. Playing them as two independent loops would produce exactly
  the "AI talks while a picture sits next to it" failure the brief forbids.
- Teaching is a **step machine**: teach → ask → wait → next step. Questions are
  a field of a step, not a separate subsystem, because that is how the observed
  session behaves (it stops at the question and does not move on its own).

Coordinates are in an abstract 1000x600 board space, not pixels: the model has
no idea how big the pane is, and a plan must survive the learner resizing the
window or opening it on a different screen.
"""

from typing import Literal

from pydantic import BaseModel, Field

from ai.free_course.types import PracticeOption, Verdict

BOARD_WIDTH = 1000
BOARD_HEIGHT = 600

# How many steps one plan may hold. The planner is asked for a short session
# (a lecture's worth of beats), and a runaway plan would be minutes of waiting
# before the first question; the cap is a guard, not a target.
MAX_STEPS_PER_PLAN = 8
# Actions per step. 24 is generous for "draw an axes, plot a curve, label two
# peaks, roll a ball" and still small enough that a pathological plan cannot
# freeze the board.
MAX_ACTIONS_PER_STEP = 24
MAX_NARRATION_CHARS = 1600
MAX_LEARNER_INPUT_CHARS = 2000

PropKind = Literal[
    "write", "draw", "label", "highlight", "move", "pause",
    # "Now you touch it": the timeline stops on this action until the learner
    # clicks the element it names. The reference session has exactly this — a
    # clickable shape on the board that fires an animation and leads into the
    # next stretch of board and the next question.
    "awaitClick",
]
Shape = Literal["line", "arrow", "curve", "rect", "circle", "dot", "axis"]
BoardColor = Literal["ink", "accent", "muted", "danger", "highlight"]
Size = Literal["s", "m", "l", "xl"]
# What produced a step. Kept on the step so the transcript can say "this was the
# re-explanation" instead of presenting every beat as equally new.
Branch = Literal["intro", "continue", "reteach", "answer", "check"]


class BoardPoint(BaseModel):
    x: float
    y: float


class BoardAction(BaseModel):
    """One atomic thing the teacher does on the board.

    `cue` is the narration sentence this action belongs to (0-based). The player
    speaks sentence `cue`, then applies every action carrying that cue — that is
    the whole synchronization mechanism, and it is why the field is required
    rather than an optional hint.
    """

    kind: PropKind
    # Draw/plot primitives. `at`→`to` is enough for most of them; `points` is for
    # a curve the model wants to shape (a loss surface, a parabola).
    shape: Shape | None = None
    at: BoardPoint | None = None
    to: BoardPoint | None = None
    points: list[BoardPoint] = Field(default_factory=list)
    # write / label / highlight put their own text here (highlight may carry the
    # word it is marking, label the annotation). awaitClick puts what to say
    # while waiting here — the player falls back to a generic hint, so a plan
    # that omits it still works.
    text: str | None = None
    color: BoardColor = "ink"
    size: Size = "m"
    # Ids exist only so `move` can name what it moves (the red ball is the one
    # element in the reference session that has to be addressable). An action
    # that anything can move gets an id; everything else does not need one.
    id: str | None = None
    target: str | None = None
    # move: milliseconds for the transition. The default is a deliberate,
    # watchable roll — not a snap.
    duration_ms: int | None = None
    cue: int = 0


class TeachingQuestion(BaseModel):
    """A stopping point. The session does not advance past it by itself.

    `open` is the observed first question ("what would you feel for with your
    feet?"), `choice` is the observed Quick Check. Both are answered by the
    learner in the same input; the difference is only how the verdict is
    reached — options are graded locally against `answer`, open answers are
    judged by the model against `expected`.
    """

    kind: Literal["open", "choice"]
    prompt: str
    options: list[PracticeOption] = Field(default_factory=list)
    answer: str | None = None
    expected: str | None = None
    hint: str | None = None


class TeachingStep(BaseModel):
    id: str
    # Short board heading for this beat ("The loss surface"), optional: not every
    # beat is a titled section.
    title: str | None = None
    # The spoken text. Sentences are the timeline unit — there is no separate
    # per-word timing, because inventing one would be fake precision.
    narration: str
    actions: list[BoardAction] = Field(default_factory=list)
    question: TeachingQuestion | None = None
    branch: Branch | None = None


class TeachingSessionPlan(BaseModel):
    title: str
    objective: str
    steps: list[TeachingStep] = Field(default_factory=list)


class SessionStepRef(BaseModel):
    """The compressed form of a step already taught, sent back to the model."""

    id: str
    title: str | None = None
    narration: str
    question: str | None = None


class TeachingTurn(BaseModel):
    """One response of the teaching loop: react to the learner, then continue.

    `feedback` is the observed "即错即纠 + 继续" — a short correction, *not* a
    retreat: the reference session does not go back to prerequisites when the
    learner gets something wrong. `verdict` is None when there is nothing to
    grade (a plain "continue", or the opening plan).
    """

    verdict: Verdict | None = None
    feedback: str | None = None
    # A short name for what the learner just demonstrated, only when they got it
    # right. The reference session hands out named awards here ("Loss Function as
    # a Landscape") — the name is the point, so it is part of the contract rather
    # than something the UI invents.
    award: str | None = None
    steps: list[TeachingStep] = Field(default_factory=list)


class SessionSignal(BaseModel):
    """What the learner did at a stopping point.

    Three kinds, matching the observed behaviour table:
      answer    — replied to the question; the session continues.
      confused  — "I don't get it, explain it another way": the ONE signal that
                  changes the explanation AND the board (strongest in the
                  reference session).
      interrupt — pressed Stop and asked their own question; the current beat is
                  abandoned rather than finished.
    Skipping / jumping is deliberately absent: the observed product has no such
                  control, and V0 copies that.
    """

    kind: Literal["answer", "confused", "interrupt"]
    text: str | None = None
    option_id: str | None = None
